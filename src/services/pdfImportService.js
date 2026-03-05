import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

if (GlobalWorkerOptions && workerSrc) {
  GlobalWorkerOptions.workerSrc = workerSrc;
}

const HEADER_IGNORE_MARKERS = [
  'RELACAO DE ATLETAS',
  'RELACAO DE ATLETAS POR CATEGORIA',
  'BJJ PROJETOS SOCIAIS',
];

const ACADEMY_KEYWORDS = new Set([
  'PROJETO',
  'GRACIE',
  'AREPT',
  'TEAM',
  'JJ',
  'BJJ',
  'CT',
  'ACADEMIA',
  'RENASER',
  'ARBJJ',
  'PIT',
  'BULL',
  'TATAME',
  'MAOS',
  'COLISEU',
]);

const ACADEMY_TAIL_KEYWORDS = new Set(['JJ', 'BJJ', 'TEAM', 'CT']);
const TABLE_FIELD_LABELS = {
  nome: ['NOME', 'ATLETA', 'ATLETAS', 'COMPETIDOR', 'COMPETIDORES'],
  academia: ['ACADEMIA', 'EQUIPE', 'TEAM'],
  faixa: ['FAIXA', 'FAIXAS', 'GRADUACAO', 'CINTO'],
  categoria: ['CATEGORIA', 'CATEGORIAS', 'CLASSE'],
  peso: ['PESO', 'PESOS'],
  sexo: ['SEXO', 'GENERO'],
};

const TABLE_LABEL_MAP = new Map(
  Object.entries(TABLE_FIELD_LABELS)
    .flatMap(([key, variants]) => variants.map((variant) => [variant, key])),
);

const normalizeForMatch = (value) => (
  value
    ? value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^0-9A-Za-z\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase()
    : ''
);

const cleanLine = (line) => (line || '').replace(/\s+/g, ' ').trim();
const trimLine = (line) => (line || '').replace(/\r/g, '').trim();
const stripTotalPrefix = (line) => {
  const match = (line || '').match(/^\s*TOTAL DE ATLETAS\s*:?\s*\d*\s*/i);
  if (!match) return line;
  return line.slice(match[0].length).trim();
};

const median = (values) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }
  return sorted[middle];
};

const groupItemsByLine = (items) => {
  const lines = new Map();
  const tolerance = 2;

  items.forEach((item) => {
    if (!item?.str) return;
    const x = item.transform?.[4];
    const y = item.transform?.[5];
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;

    const key = Math.round(y / tolerance) * tolerance;
    const lineItems = lines.get(key) || [];
    lineItems.push({
      str: item.str,
      x,
      width: Number.isFinite(item.width) ? item.width : 0,
    });
    lines.set(key, lineItems);
  });

  return Array.from(lines.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([, lineItems]) => lineItems.sort((a, b) => a.x - b.x));
};

const buildLineFromItems = (lineItems) => {
  if (!lineItems.length) return '';
  const charWidths = lineItems
    .map((item) => (item.str.length ? item.width / item.str.length : 0))
    .filter((value) => Number.isFinite(value) && value > 0);
  const charWidth = median(charWidths) || 4;
  let line = '';
  let cursor = 0;

  lineItems.forEach((item) => {
    const column = Math.max(0, Math.round(item.x / charWidth));
    if (column > cursor) {
      const gap = Math.min(column - cursor, 40);
      line += ' '.repeat(gap);
      cursor += gap;
    } else if (column < cursor) {
      line += ' ';
      cursor += 1;
    }
    line += item.str;
    cursor += item.str.length;
  });

  return line.trimEnd();
};

const buildTextFromItems = (items) => {
  const lines = groupItemsByLine(items);
  return lines
    .map(buildLineFromItems)
    .filter(Boolean)
    .join('\n');
};

const shouldIgnoreLine = (line) => {
  const cleaned = cleanLine(line);
  if (!cleaned) return true;
  const normalized = normalizeForMatch(cleaned);
  if (!normalized) return true;
  if (HEADER_IGNORE_MARKERS.some((marker) => normalized.includes(marker))) return true;
  if (normalized.startsWith('TOTAL DE ATLETAS')) {
    const remainder = normalized
      .replace(/^TOTAL DE ATLETAS\s*:?\s*\d*/, '')
      .trim();
    if (!remainder) return true;
  }
  return false;
};

const parseCategoryHeader = (line) => {
  const cleaned = cleanLine(line);
  if (!cleaned.includes('/')) return null;
  const normalized = normalizeForMatch(cleaned);

  const parts = cleaned.split('/').map((part) => part.trim()).filter(Boolean);
  const matchParts = parts.map((part) => normalizeForMatch(part));
  if (matchParts.length < 4) return null;
  if (matchParts[0] !== 'FEMININO' && matchParts[0] !== 'MASCULINO') return null;

  return {
    genero: parts[0],
    faixa: parts[1],
    categoria: parts[2],
    peso: parts.slice(3).join(' / '),
  };
};

const splitTableColumns = (line) => (
  (line || '')
    .split(/\s*\|\s*|\s*;\s*|\t+|\s{2,}/)
    .map((value) => value.trim())
    .filter(Boolean)
);

const resolveTableLabelKey = (value) => {
  const normalized = normalizeForMatch(value);
  if (TABLE_LABEL_MAP.has(normalized)) return TABLE_LABEL_MAP.get(normalized);

  const tokens = normalized.split(' ').filter(Boolean);
  const matches = tokens.filter((token) => TABLE_LABEL_MAP.has(token));

  if (matches.length === 1) {
    return TABLE_LABEL_MAP.get(matches[0]);
  }

  return null;
};

const detectTableHeader = (line) => {
  const columns = splitTableColumns(line);
  if (columns.length < 2) return null;

  const indexes = {};
  columns.forEach((column, index) => {
    const key = resolveTableLabelKey(column);
    if (key) indexes[key] = index;
  });

  if (!indexes.nome || Object.keys(indexes).length < 2) return null;

  return {
    columnCount: columns.length,
    indexes,
  };
};

const parseAthletesFromTable = (lines, mode) => {
  const athletes = [];
  let header = null;

  lines.forEach((line) => {
    if (shouldIgnoreLine(line)) {
      header = null;
      return;
    }

    const headerCandidate = detectTableHeader(line);
    if (headerCandidate) {
      header = headerCandidate;
      return;
    }

    if (!header) return;

    const columns = splitTableColumns(line);
    const requiredIndex = Math.max(...Object.values(header.indexes));
    if (columns.length <= requiredIndex) return;

    const getColumn = (key) => {
      const index = header.indexes[key];
      return index === undefined ? '' : columns[index] || '';
    };

    const nome = getColumn('nome');
    if (!nome) return;

    athletes.push({
      nome,
      academia: getColumn('academia') || 'Sem academia',
      faixa: getColumn('faixa') || '',
      categoria: getColumn('categoria') || '',
      peso: getColumn('peso') || '',
      genero: getColumn('sexo') || '',
      isNoGi: mode === 'NO-GI',
      isAbsolute: false,
    });
  });

  return athletes;
};

const splitNameAcademia = (line) => {
  const cleaned = cleanLine(line);
  const tokens = cleaned.split(' ').filter(Boolean);
  const upperTokens = tokens.map((token) => normalizeForMatch(token));
  let academyStart = -1;

  for (let i = 0; i < upperTokens.length; i += 1) {
    if (ACADEMY_KEYWORDS.has(upperTokens[i])) {
      academyStart = i;
      break;
    }
  }

  if (academyStart === -1) {
    return { nome: cleaned, academia: '' };
  }

  if (ACADEMY_TAIL_KEYWORDS.has(upperTokens[academyStart])) {
    let moved = 0;
    let backIndex = academyStart - 1;
    while (backIndex >= 0 && moved < 2) {
      const candidate = upperTokens[backIndex];
      if (!candidate) break;
      academyStart = backIndex;
      backIndex -= 1;
      moved += 1;
    }
  }

  const nome = tokens.slice(0, academyStart).join(' ').trim();
  const academia = tokens.slice(academyStart).join(' ').trim();

  return { nome: nome || cleaned, academia };
};

const extractInlineAthleteFromHeader = (line) => {
  const parts = (line || '').split('/').map((part) => part.trim()).filter(Boolean);
  if (parts.length < 4) return null;

  const tail = parts.slice(3).join(' ').trim();
  if (!tail) return null;

  const tokens = tail.split(/\s+/);
  let lastNumberIndex = -1;
  tokens.forEach((token, index) => {
    if (/\d/.test(token)) lastNumberIndex = index;
  });

  if (lastNumberIndex === -1 || lastNumberIndex >= tokens.length - 1) return null;

  const remainder = tokens.slice(lastNumberIndex + 1).join(' ').trim();
  if (!remainder) return null;

  const { nome, academia } = splitNameAcademia(remainder);
  if (!nome) return null;

  return { nome, academia };
};

export const extractTextFromPdfFile = async (file) => {
  if (!file) {
    throw new Error('Arquivo não encontrado.');
  }

  try {
    const buffer = await file.arrayBuffer();
    const pdf = await getDocument({ data: buffer }).promise;
    let combined = '';

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const layoutText = buildTextFromItems(content.items);
      if (layoutText) {
        combined += `${layoutText}\n`;
      } else {
        const fallbackText = content.items
          .map((item) => `${item.str}${item.hasEOL ? '\n' : ' '}`)
          .join('')
          .trim();
        combined += `${fallbackText}\n`;
      }
    }

    return combined;
  } catch (err) {
    throw new Error('Falha ao ler o PDF. Verifique o arquivo.');
  }
};

export const parseAthletesFromText = (text, mode) => {
  const normalizedText = (text || '')
    .replace(/(FEMININO|MASCULINO)\s*\//gi, '\n$1 /')
    .replace(/TOTAL DE ATLETAS/gi, '\nTOTAL DE ATLETAS');
  const lines = normalizedText.split(/\r?\n/).map(trimLine).filter(Boolean);
  const athletes = [];
  let currentCategory = null;

  lines.forEach((line) => {
    if (shouldIgnoreLine(line)) return;
    const header = parseCategoryHeader(line);
    if (header) {
      currentCategory = header;
      const columns = splitTableColumns(line);
      if (columns.length > 1) {
        const nomeCandidate = columns[1];
        if (nomeCandidate) {
          const academiaCandidate = columns[2] || '';
          const parsed = academiaCandidate
            ? { nome: nomeCandidate, academia: academiaCandidate }
            : splitNameAcademia(nomeCandidate);
          if (parsed.nome) {
            athletes.push({
              nome: parsed.nome,
              academia: parsed.academia || 'Sem academia',
              faixa: currentCategory.faixa,
              categoria: currentCategory.categoria,
              peso: currentCategory.peso,
              genero: currentCategory.genero,
              isNoGi: mode === 'NO-GI',
              isAbsolute: false,
            });
          }
        }
      }
      if (columns.length <= 1) {
        const inline = extractInlineAthleteFromHeader(line);
        if (inline) {
          athletes.push({
            nome: inline.nome,
            academia: inline.academia || 'Sem academia',
            faixa: currentCategory.faixa,
            categoria: currentCategory.categoria,
            peso: currentCategory.peso,
            genero: currentCategory.genero,
            isNoGi: mode === 'NO-GI',
            isAbsolute: false,
          });
        }
      }
      return;
    }

    if (!currentCategory) return;
    const sanitizedLine = stripTotalPrefix(line);
    if (!sanitizedLine) return;
    const { nome, academia } = splitNameAcademia(sanitizedLine);
    if (!nome) return;

    athletes.push({
      nome,
      academia: academia || 'Sem academia',
      faixa: currentCategory.faixa,
      categoria: currentCategory.categoria,
      peso: currentCategory.peso,
      genero: currentCategory.genero,
      isNoGi: mode === 'NO-GI',
      isAbsolute: false,
    });
  });

  if (athletes.length) return athletes;

  return parseAthletesFromTable(lines, mode);
};
