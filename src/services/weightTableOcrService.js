import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { extractTextFromPdfFile } from './pdfImportService';

if (GlobalWorkerOptions && workerSrc) {
  GlobalWorkerOptions.workerSrc = workerSrc;
}

const MIN_OPTIONS_FOUND_WITHOUT_OCR = 3;
const DEFAULT_MAX_PDF_PAGES = 3;

const WEIGHT_KEYWORD_REGEX = /\b(galo|pluma|pena|leve|medio|meio\s*pesado|pesado|super\s*pesado|pesadissimo|absoluto|ate|acima)\b/i;
const WEIGHT_VALUE_REGEX = /\b\d{1,3}(?:[.,]\d{1,2})\b/;

const IGNORE_LINE_REGEX = [
  /^(tabela|table)\s+de\s+peso/i,
  /^relacao\s+de\s+atletas/i,
  /^atletas\s+por\s+/i,
  /^arquivo\s+atualizado/i,
  /^evento\s*[:-]/i,
  /^categoria\s+de\s+peso/i,
  /^circular/i,
  /^inscric/i,
  /^check[-\s]?in/i,
  /^total\s+de\s+atletas/i,
  /^masculino\s*$/i,
  /^feminino\s*$/i,
];

const normalizeLookup = (value) => (
  (value || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
);

const hasWeightKeyword = (line) => WEIGHT_KEYWORD_REGEX.test(normalizeLookup(line));

const shouldIgnoreLine = (line) => (
  IGNORE_LINE_REGEX.some((pattern) => pattern.test(line))
);

const sanitizeOcrLine = (line) => (
  (line || '')
    .toString()
    .replace(/[|]+/g, ' | ')
    .replace(/\s+/g, ' ')
    .replace(/^[-\u2013\u2014\u2022\s]+/, '')
    .trim()
);

const pickBestWeightSnippet = (line) => {
  const segments = (line || '')
    .split(/[|/;]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (!segments.length) return line;

  for (let index = segments.length - 1; index >= 0; index -= 1) {
    const segment = segments[index];
    if (!hasWeightKeyword(segment)) continue;
    if (shouldIgnoreLine(segment)) continue;
    return segment;
  }

  return line;
};

const toDisplayWeightOption = (line) => {
  const cleaned = (line || '')
    .replace(/\s+/g, ' ')
    .replace(/\bNO\s*GI\b/gi, 'NO-GI')
    .trim();

  if (!cleaned) return '';

  const parts = cleaned.split(' ');
  return parts
    .map((part, index) => {
      const raw = part.trim();
      if (!raw) return '';
      const lookup = normalizeLookup(raw);
      if (lookup === 'gi') return 'GI';
      if (lookup === 'no-gi' || lookup === 'nogi') return 'NO-GI';
      if (lookup === 'kg') return 'kg';
      if (/^\d/.test(raw)) return raw;
      if (index > 0 && ['de', 'do', 'da', 'dos', 'das', 'e', 'ate', 'a'].includes(lookup)) {
        return lookup;
      }
      return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
    })
    .filter(Boolean)
    .join(' ');
};

const isWeightOptionLine = (line) => {
  if (!line) return false;
  if (line.length < 3 || line.length > 96) return false;
  if (shouldIgnoreLine(line)) return false;
  if (!hasWeightKeyword(line)) return false;

  const containsAbsoluto = /\babsoluto\b/i.test(line);
  if (containsAbsoluto) return true;

  return WEIGHT_VALUE_REGEX.test(line) || /\b(ate|at[eé]|acima)\b/i.test(line);
};

export const extractWeightOptionsFromText = (text) => {
  const unique = new Map();
  const lines = (text || '')
    .toString()
    .replace(/\r/g, '\n')
    .split('\n')
    .map(sanitizeOcrLine)
    .filter(Boolean);

  lines.forEach((line) => {
    const snippet = pickBestWeightSnippet(line);
    if (!isWeightOptionLine(snippet)) return;
    const option = toDisplayWeightOption(snippet);
    if (!option) return;
    const key = normalizeLookup(option).replace(/[^\w\s.-]/g, '');
    if (!key || unique.has(key)) return;
    unique.set(key, option);
  });

  return [...unique.values()];
};

const recognizeTextFromImageSource = async (imageSource, onProgress) => {
  const tesseractModule = await import('tesseract.js');
  const recognize = tesseractModule.recognize || tesseractModule.default?.recognize;
  if (typeof recognize !== 'function') {
    throw new Error('OCR indisponivel neste navegador.');
  }

  const result = await recognize(imageSource, 'por+eng+spa+fra', {
    logger: (message) => {
      if (!onProgress) return;
      if ((message?.status || '').toString() !== 'recognizing text') return;
      onProgress(Math.round(Number(message.progress || 0) * 100));
    }
  });

  return (result?.data?.text || '').toString();
};

const getFileExtension = (name) => {
  const text = (name || '').toString().trim().toLowerCase();
  if (!text.includes('.')) return '';
  return text.slice(text.lastIndexOf('.') + 1);
};

const isPdfFile = (file) => {
  const mime = (file?.type || '').toString().toLowerCase();
  if (mime.includes('pdf')) return true;
  const extension = getFileExtension(file?.name);
  return extension === 'pdf';
};

const isImageFile = (file) => {
  const mime = (file?.type || '').toString().toLowerCase();
  if (mime.startsWith('image/')) return true;
  const extension = getFileExtension(file?.name);
  return ['jpg', 'jpeg', 'png', 'webp', 'bmp'].includes(extension);
};

const renderPdfPageToCanvas = async (pdf, pageNumber) => {
  if (typeof document === 'undefined') {
    throw new Error('OCR de PDF requer ambiente de navegador.');
  }

  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale: 2 });
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.floor(viewport.width));
  canvas.height = Math.max(1, Math.floor(viewport.height));
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Falha ao preparar imagem para OCR.');
  }

  await page.render({ canvasContext: context, viewport }).promise;
  return canvas;
};

const extractPdfTextWithOcr = async (file, maxPages, onProgress) => {
  const buffer = await file.arrayBuffer();
  const pdf = await getDocument({ data: buffer }).promise;
  const pageCount = Math.min(Math.max(1, maxPages), pdf.numPages || 1);
  let mergedText = '';

  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
    if (onProgress) {
      onProgress({
        stage: 'render',
        page: pageNumber,
        pages: pageCount,
        progress: Math.round(((pageNumber - 1) / pageCount) * 100),
      });
    }

    const canvas = await renderPdfPageToCanvas(pdf, pageNumber);
    const pageText = await recognizeTextFromImageSource(canvas, (progress) => {
      if (!onProgress) return;
      onProgress({
        stage: 'ocr',
        page: pageNumber,
        pages: pageCount,
        progress,
      });
    });

    if (pageText) {
      mergedText += `\n${pageText}`;
    }
  }

  return mergedText.trim();
};

export const extractWeightOptionsFromFile = async (file, options = {}) => {
  if (!file) {
    throw new Error('Selecione um arquivo de tabela para OCR.');
  }

  const { maxPdfPages = DEFAULT_MAX_PDF_PAGES, onProgress } = options;

  if (isPdfFile(file)) {
    const textFromPdf = await extractTextFromPdfFile(file);
    const optionsFromPdfText = extractWeightOptionsFromText(textFromPdf);

    if (optionsFromPdfText.length >= MIN_OPTIONS_FOUND_WITHOUT_OCR) {
      return {
        options: optionsFromPdfText,
        sourceText: textFromPdf,
        usedOcr: false,
      };
    }

    const ocrText = await extractPdfTextWithOcr(file, maxPdfPages, onProgress);
    const mergedText = `${textFromPdf || ''}\n${ocrText || ''}`.trim();
    return {
      options: extractWeightOptionsFromText(mergedText),
      sourceText: mergedText,
      usedOcr: true,
    };
  }

  if (!isImageFile(file)) {
    throw new Error('Arquivo invalido. Use imagem ou PDF da tabela de peso.');
  }

  if (onProgress) {
    onProgress({ stage: 'ocr', page: 1, pages: 1, progress: 0 });
  }
  const text = await recognizeTextFromImageSource(file, (progress) => {
    if (!onProgress) return;
    onProgress({ stage: 'ocr', page: 1, pages: 1, progress });
  });

  return {
    options: extractWeightOptionsFromText(text),
    sourceText: text,
    usedOcr: true,
  };
};

export const extractWeightOptionsFromUrl = async (url, options = {}) => {
  const sourceUrl = (url || '').toString().trim();
  if (!sourceUrl) {
    throw new Error('Informe a URL da tabela para extracao OCR.');
  }

  let response;
  try {
    response = await fetch(sourceUrl);
  } catch {
    throw new Error('Nao foi possivel baixar a tabela. Verifique CORS ou use upload de arquivo.');
  }

  if (!response.ok) {
    throw new Error('Falha ao baixar tabela para OCR.');
  }

  const blob = await response.blob();
  const fileName = sourceUrl.split('/').pop() || `tabela-${Date.now()}`;
  const file = new File([blob], fileName, { type: blob.type || undefined });
  return extractWeightOptionsFromFile(file, options);
};

