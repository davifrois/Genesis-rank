import { useEffect, useMemo, useRef } from 'react';

const TRANSLATE_ENDPOINT = 'https://translate.googleapis.com/translate_a/single';
const SPLIT_TOKEN = '\uE000GENESIS_SPLIT\uE000';
const SOURCE_LANGUAGE = 'auto';
const ORIGINAL_LANGUAGE = 'pt';
const MAX_BATCH_SIZE = 20;
const MAX_BATCH_CHARS = 1000;
const TRANSLATION_DEBOUNCE_MS = 260;
const CACHE_KEY = 'genesis_i18n_cache_v4';

const TRANSLATABLE_ATTRIBUTES = [
  'aria-label',
  'aria-placeholder',
  'alt',
  'data-placeholder',
  'placeholder',
  'title'
];

const SKIP_TAGS = new Set([
  'CANVAS',
  'CODE',
  'IFRAME',
  'NOSCRIPT',
  'PATH',
  'PRE',
  'SCRIPT',
  'STYLE',
  'SVG'
]);

const SKIP_TEXT_PARENT_TAGS = new Set(['TEXTAREA']);

const loadCache = () => {
  if (typeof sessionStorage !== 'undefined') {
    try {
      const data = sessionStorage.getItem(CACHE_KEY);
      if (data) return new Map(JSON.parse(data));
    } catch {
      // Ignorar erros
    }
  }
  return new Map();
};

const translationCache = loadCache();

const persistCache = () => {
  if (typeof sessionStorage !== 'undefined') {
    try {
      const entries = Array.from(translationCache.entries());
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(entries));
    } catch {
      // Ignorar erros de quota
    }
  }
};

const cacheKey = (target, value) => `${target}::${value}`;

const normalizeValue = (value) => (value || '').toString().replace(/\s+/g, ' ').trim();

const hasLetters = (value) => /[\p{L}]/u.test(value);

const isMostlyStructural = (value) => /^[\s\d.,:;!?()[\]{}+\-_/\\|@#%&*"'`~<>=$]+$/u.test(value);

const shouldTranslateValue = (value) => {
  const normalized = normalizeValue(value);
  if (normalized.length < 2) return false;
  if (!hasLetters(normalized)) return false;
  if (isMostlyStructural(normalized)) return false;
  if (/^(https?:|mailto:|tel:|www\.)/i.test(normalized)) return false;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(normalized)) return false;
  if (/^cnpj\b/i.test(normalized)) return false;
  if (/^(genesis|genesis esportes|tx7|gi|no-gi|pix|obs|vmix)$/i.test(normalized)) return false;
  return true;
};

const preserveOuterWhitespace = (original, translated) => {
  const source = (original || '').toString();
  const leading = source.match(/^\s*/)?.[0] || '';
  const trailing = source.match(/\s*$/)?.[0] || '';
  return `${leading}${translated}${trailing}`;
};

const isElement = (node) => node?.nodeType === Node.ELEMENT_NODE;

const shouldSkipElement = (element) => {
  if (!element || !isElement(element)) return false;
  if (SKIP_TAGS.has(element.tagName)) return true;
  if (element.closest('[translate="no"], .notranslate, [data-no-translate="true"], [data-i18n-ignore="true"]')) {
    return true;
  }
  return false;
};

const shouldSkipTextParent = (element) => (
  shouldSkipElement(element)
  || SKIP_TEXT_PARENT_TAGS.has(element?.tagName)
  || Boolean(element?.closest?.('[contenteditable="true"]'))
);

const getTextSource = (node, states, trackedNodes) => {
  const current = node.nodeValue || '';
  const state = states.get(node);

  if (!state) {
    states.set(node, { original: current, translated: '' });
    trackedNodes.add(node);
    return current;
  }

  if (current === state.translated || current === state.original) {
    return state.original;
  }

  state.original = current;
  state.translated = '';
  return current;
};

const getAttributeSource = (element, attribute, states, trackedAttributes) => {
  const current = element.getAttribute(attribute) || '';
  let elementState = states.get(element);

  if (!elementState) {
    elementState = new Map();
    states.set(element, elementState);
    trackedAttributes.add(element);
  }

  const attributeState = elementState.get(attribute);
  if (!attributeState) {
    elementState.set(attribute, { original: current, translated: '' });
    return current;
  }

  if (current === attributeState.translated || current === attributeState.original) {
    return attributeState.original;
  }

  attributeState.original = current;
  attributeState.translated = '';
  return current;
};

const collectEntries = (root, refs) => {
  const entries = [];

  if (!root || !document?.createTreeWalker) return entries;

  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) => {
        const parent = node.parentElement;
        if (!parent || shouldSkipTextParent(parent)) return NodeFilter.FILTER_REJECT;
        return shouldTranslateValue(node.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    }
  );

  while (walker.nextNode()) {
    const node = walker.currentNode;
    const source = getTextSource(node, refs.textStates.current, refs.trackedTextNodes.current);
    const normalized = normalizeValue(source);
    if (shouldTranslateValue(normalized)) {
      entries.push({ type: 'text', node, source, normalized });
    }
  }

  const elements = root.querySelectorAll?.('*') || [];
  elements.forEach((element) => {
    if (shouldSkipElement(element)) return;

    TRANSLATABLE_ATTRIBUTES.forEach((attribute) => {
      if (!element.hasAttribute(attribute)) return;
      const source = getAttributeSource(element, attribute, refs.attributeStates.current, refs.trackedAttributeElements.current);
      const normalized = normalizeValue(source);
      if (shouldTranslateValue(normalized)) {
        entries.push({ type: 'attribute', element, attribute, source, normalized });
      }
    });
  });

  return entries;
};

const extractTranslation = (payload) => {
  if (!Array.isArray(payload?.[0])) return '';
  return payload[0].map((part) => part?.[0] || '').join('');
};

const requestTranslation = async (value, target, signal) => {
  const url = new URL(TRANSLATE_ENDPOINT);
  url.searchParams.set('client', 'gtx');
  url.searchParams.set('sl', SOURCE_LANGUAGE);
  url.searchParams.set('tl', target);
  url.searchParams.set('dt', 't');
  url.searchParams.set('q', value);

  const response = await fetch(url.toString(), {
    method: 'GET',
    signal
  });

  if (!response.ok) {
    throw new Error(`Translation request failed with ${response.status}`);
  }

  return extractTranslation(await response.json());
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const requestTranslationWithRetry = async (value, target, signal, retries = 2) => {
  for (let i = 0; i <= retries; i++) {
    try {
      return await requestTranslation(value, target, signal);
    } catch (err) {
      if (i === retries || signal.aborted) throw err;
      await delay(500 * (i + 1));
    }
  }
};

const translateBatch = async (values, target, signal) => {
  if (!values.length) return new Map();

  const joined = values.join(SPLIT_TOKEN);
  try {
    const translatedJoined = await requestTranslationWithRetry(joined, target, signal);
    const translatedParts = translatedJoined.split(SPLIT_TOKEN);
    const result = new Map();

    if (translatedParts.length === values.length) {
      values.forEach((value, index) => {
        result.set(value, translatedParts[index]?.trim() || value);
      });
      return result;
    }
  } catch {
    // If batch fails, fallback to individual translation gracefully
  }

  const result = new Map();
  for (const value of values) {
    if (signal.aborted) break;
    try {
      await delay(100); // Prevent spamming
      const translated = await requestTranslationWithRetry(value, target, signal, 1);
      result.set(value, translated?.trim() || value);
    } catch {
      result.set(value, value); // Fallback to original on failure
    }
  }

  return result;
};

const buildBatches = (values) => {
  const batches = [];
  let current = [];
  let currentChars = 0;

  values.forEach((value) => {
    const nextChars = currentChars + value.length + SPLIT_TOKEN.length;
    if (current.length && (current.length >= MAX_BATCH_SIZE || nextChars > MAX_BATCH_CHARS)) {
      batches.push(current);
      current = [];
      currentChars = 0;
    }

    current.push(value);
    currentChars += value.length + SPLIT_TOKEN.length;
  });

  if (current.length) batches.push(current);
  return batches;
};

const translateValues = async (values, target, signal) => {
  const translations = new Map();
  const missing = [];

  values.forEach((value) => {
    const key = cacheKey(target, value);
    if (translationCache.has(key)) {
      translations.set(value, translationCache.get(key));
    } else {
      missing.push(value);
    }
  });

  const batches = buildBatches(missing);
  for (let index = 0; index < batches.length; index++) {
    if (signal.aborted) break;
    const batch = batches[index];
    
    try {
      const translatedGroup = await translateBatch(batch, target, signal);
      translatedGroup.forEach((translated, source) => {
        const safeTranslation = translated || source;
        translationCache.set(cacheKey(target, source), safeTranslation);
        translations.set(source, safeTranslation);
      });
      persistCache();
      if (index < batches.length - 1) await delay(300); // Cooldown between batches
    } catch (err) {
      console.warn('Batch translation failed:', err);
    }
  }

  return translations;
};

const restoreOriginalContent = (refs) => {
  refs.trackedTextNodes.current.forEach((node) => {
    const state = refs.textStates.current.get(node);
    if (!state || !node.isConnected) return;
    if (!state.translated || node.nodeValue === state.translated) {
      node.nodeValue = state.original;
    }
    state.translated = '';
  });

  refs.trackedAttributeElements.current.forEach((element) => {
    const elementState = refs.attributeStates.current.get(element);
    if (!elementState || !element.isConnected) return;

    elementState.forEach((state, attribute) => {
      if (!state.translated || element.getAttribute(attribute) === state.translated) {
        element.setAttribute(attribute, state.original);
      }
      state.translated = '';
    });
  });
};

export const useSiteAutoTranslator = (languageOption) => {
  const textStates = useRef(new WeakMap());
  const attributeStates = useRef(new WeakMap());
  const trackedTextNodes = useRef(new Set());
  const trackedAttributeElements = useRef(new Set());
  const generation = useRef(0);
  const titleSource = useRef('');
  const target = useMemo(() => languageOption?.translationCode || ORIGINAL_LANGUAGE, [languageOption]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return undefined;

    const activeGeneration = generation.current + 1;
    generation.current = activeGeneration;
    const controller = new AbortController();
    const refs = { textStates, attributeStates, trackedTextNodes, trackedAttributeElements };
    let debounceTimer = 0;
    let observer = null;

    if (!titleSource.current) {
      titleSource.current = document.title;
    }

    const translateTitle = async () => {
      if (target === ORIGINAL_LANGUAGE) {
        document.title = titleSource.current;
        return;
      }

      try {
        const title = await translateValues([titleSource.current], target, controller.signal);
        if (!controller.signal.aborted && generation.current === activeGeneration) {
          document.title = title.get(titleSource.current) || titleSource.current;
        }
      } catch {
        document.title = titleSource.current;
      }
    };

    const runTranslation = async () => {
      if (controller.signal.aborted || generation.current !== activeGeneration) return;

      if (target === ORIGINAL_LANGUAGE) {
        restoreOriginalContent(refs);
        await translateTitle();
        return;
      }

      const root = document.body;
      if (!root) return;

      const entries = collectEntries(root, refs);
      const uniqueValues = [...new Set(entries.map((entry) => entry.normalized))];

      if (!uniqueValues.length) {
        await translateTitle();
        return;
      }

      try {
        const translations = await translateValues(uniqueValues, target, controller.signal);

        if (controller.signal.aborted || generation.current !== activeGeneration) return;

        entries.forEach((entry) => {
          const translated = translations.get(entry.normalized);
          if (!translated) return;

          if (entry.type === 'text') {
            const state = textStates.current.get(entry.node);
            if (!state || !entry.node.isConnected) return;
            const nextValue = preserveOuterWhitespace(state.original, translated);
            entry.node.nodeValue = nextValue;
            state.translated = nextValue;
            return;
          }

          const state = attributeStates.current.get(entry.element)?.get(entry.attribute);
          if (!state || !entry.element.isConnected) return;
          entry.element.setAttribute(entry.attribute, translated);
          state.translated = translated;
        });

        await translateTitle();
      } catch {
        // Keep the original React-rendered text if the translation service is unavailable.
      }
    };

    const scheduleTranslation = (immediate = false) => {
      window.clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(runTranslation, immediate ? 0 : TRANSLATION_DEBOUNCE_MS);
    };

    scheduleTranslation(true);

    if (document.body && target !== ORIGINAL_LANGUAGE) {
      observer = new MutationObserver(() => scheduleTranslation(false));
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: TRANSLATABLE_ATTRIBUTES
      });
    }

    return () => {
      controller.abort();
      window.clearTimeout(debounceTimer);
      observer?.disconnect();
    };
  }, [target]);
};
