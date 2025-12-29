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

const shouldIgnoreLine = (line) => {
  const cleaned = cleanLine(line);
  if (!cleaned) return true;
  const normalized = normalizeForMatch(cleaned);
  if (!normalized) return true;
  if (HEADER_IGNORE_MARKERS.some((marker) => normalized.includes(marker))) return true;
  if (normalized.startsWith('TOTAL DE ATLETAS')) return true;
  return false;
};

const parseCategoryHeader = (line) => {
  const cleaned = cleanLine(line);
  const normalized = normalizeForMatch(cleaned);
  if (!normalized.includes('/')) return null;

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

export const extractTextFromPdfFile = async (file) => {
  if (!file) {
    throw new Error('Arquivo nao encontrado.');
  }

  try {
    const buffer = await file.arrayBuffer();
    const pdf = await getDocument({ data: buffer }).promise;
    let combined = '';

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const text = content.items
        .map((item) => `${item.str}${item.hasEOL ? '\n' : ' '}`)
        .join('')
        .trim();
      combined += `${text}\n`;
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
  const lines = normalizedText.split(/\r?\n/).map(cleanLine).filter(Boolean);
  const athletes = [];
  let currentCategory = null;

  lines.forEach((line) => {
    if (shouldIgnoreLine(line)) return;
    const header = parseCategoryHeader(line);
    if (header) {
      currentCategory = header;
      return;
    }

    if (!currentCategory) return;
    const { nome, academia } = splitNameAcademia(line);
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

  return athletes;
};
