import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

const setupPdfWorker = () => {
  if (typeof window === 'undefined' || !GlobalWorkerOptions) return;
  try {
    GlobalWorkerOptions.workerPort = new Worker(workerSrc, { type: 'module' });
  } catch (err) {
    console.warn('Worker port initialization failed, using unpkg fallback:', err);
    GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs';
  }
};

setupPdfWorker();

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
  'ANDRADE',
  'TUDO',
  'TEDE',
  'MARCIO',
  'EQUIPE',
  'ERJJ',
  'TEMPLARIOS',
  'NFT',
  'ALAN',
  'GFTEAM',
  'CHECKMAT',
  'NOVA',
  'UNIAO',
  'ALLIANCE',
  'ATOS'
]);

const ACADEMY_TAIL_KEYWORDS = new Set(['JJ', 'BJJ', 'CT']);
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
  if (!line) return { nome: '', academia: '' };

  const rawLine = (line || '').replace(/\r/g, '').trim();

  // 1. Primary: Split by 2 or more spaces or tab (PDF column separation)
  const colParts = rawLine.split(/\s{2,}|\t/).map((s) => s.trim()).filter(Boolean);
  if (colParts.length >= 2) {
    const nome = colParts[0];
    const academia = colParts.slice(1).join(' ');
    if (nome && !/total de/i.test(nome) && !/relacao de/i.test(nome) && !/atualizado/i.test(nome)) {
      return { nome, academia };
    }
  }

  // 2. Fallback: Single-spaced keyword matching
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

  if (academyStart > 0) {
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
    if (nome && academia) {
      return { nome, academia };
    }
  }

  return { nome: cleaned, academia: '' };
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
    let pdf;
    
    try {
      pdf = await getDocument({ data: buffer }).promise;
    } catch (primaryErr) {
      console.warn('Primary worker attempt failed, trying unpkg CDN worker:', primaryErr);
      try {
        GlobalWorkerOptions.workerPort = null;
        GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs';
        pdf = await getDocument({ data: buffer }).promise;
      } catch (unpkgErr) {
        console.warn('unpkg CDN worker failed, trying jsDelivr CDN worker:', unpkgErr);
        GlobalWorkerOptions.workerPort = null;
        GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs';
        pdf = await getDocument({ data: buffer }).promise;
      }
    }

    let combined = '';

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const layoutText = buildTextFromItems(content.items);
      const rawText = content.items
        .map((item) => `${item.str}${item.hasEOL ? '\n' : ' '}`)
        .join('')
        .replace(/\r/g, '');

      if (layoutText) {
        combined += `${layoutText}\n${rawText}\n`;
      } else {
        combined += `${rawText}\n`;
      }
    }

    return combined;
  } catch (err) {
    console.error('Erro na extração de texto do PDF:', err);
    throw new Error(`Falha ao ler o PDF: ${err?.message || 'Verifique o arquivo.'}`);
  }
};

export const parseAthletesFromText = (text, mode) => {
  const rawLines = (text || '').split(/\r?\n/).map(trimLine).filter(Boolean);
  
  // Check if file uses inline format: ATHLETE_NAME GENDER / BELT / CATEGORY / WEIGHT
  const isInlineFormat = rawLines.some((line) => {
    if (!line.includes('/')) return false;
    const firstPart = line.split('/')[0].trim();
    const tokens = firstPart.split(/\s+/);
    if (tokens.length >= 2) {
      const nonGenderTokens = tokens.filter((t) => !['MASCULINO', 'FEMININO', 'MASC', 'FEM', 'M', 'F'].includes(t.toUpperCase()));
      return nonGenderTokens.length > 0;
    }
    return false;
  });

  const parsedAthletes = [];

  if (isInlineFormat) {
    let currentAcademy = '';
    
    rawLines.forEach((line) => {
      if (/Total de/i.test(line)) return;
      
      if (line.includes('/')) {
        const parts = line.split('/');
        if (parts.length >= 3) {
          const firstPart = parts[0].trim();
          const tokens = firstPart.split(' ');
          
          let genero = '';
          let nome = '';
          const lastToken = tokens[tokens.length - 1].toUpperCase();
          if (['MASCULINO', 'FEMININO', 'MASC', 'FEM', 'M', 'F'].includes(lastToken)) {
            genero = tokens.pop();
          }
          nome = tokens.join(' ');
          
          const faixa = parts[1].trim();
          const categoria = parts[2].trim();
          const peso = parts[3] ? parts[3].trim() : 'Padrao';

          const idadeMatch = categoria.match(/\d+/);
          let idade = '';
          if (idadeMatch) {
            idade = parseInt(idadeMatch[0], 10);
          } else if (/adulto|master/i.test(categoria)) {
            idade = 20;
          }

          if (nome) {
            parsedAthletes.push({
              nome,
              academia: currentAcademy || 'Sem academia',
              faixa,
              categoria: `${categoria} / ${genero || 'Masculino'} / ${faixa} / ${peso}`,
              peso,
              genero: genero || 'Masculino',
              idade,
              isNoGi: mode === 'NO-GI',
              isAbsolute: false,
            });
          }
        }
        return;
      }
      
      if (line.trim().length > 0 && !/RELAÇÃO DE ATLETAS/i.test(line) && !/Arquivo Atualizado/i.test(line) && !/DIAMANTES DO VALE/i.test(line) && !/RELACAO DE ATLETAS/i.test(line)) {
        currentAcademy = line.trim();
      }
    });
  }

  if (!parsedAthletes.length) {
    // STANDARD / CATEGORY HEADER FORMAT:
    // FEMININO / CINZA / PRE MIRIM 6 / PLUMA ATE 18,90
    // IRIS KATHERINE RODRIGUES DA CRUZ OLIVEIRA    TEAM BALLOUTTA
    // Total de Atletas: 1
    const normalizedText = (text || '')
      .replace(/(FEMININO|MASCULINO)\s*\//gi, '\n$1 /')
      .replace(/TOTAL DE ATLETAS/gi, '\nTOTAL DE ATLETAS');
    const lines = normalizedText.split(/\r?\n/).map(trimLine).filter(Boolean);
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
              parsedAthletes.push({
                nome: parsed.nome,
                academia: parsed.academia || 'Sem academia',
                faixa: currentCategory.faixa,
                categoria: `${currentCategory.categoria} / ${currentCategory.genero} / ${currentCategory.faixa} / ${currentCategory.peso}`,
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
            parsedAthletes.push({
              nome: inline.nome,
              academia: inline.academia || 'Sem academia',
              faixa: currentCategory.faixa,
              categoria: `${currentCategory.categoria} / ${currentCategory.genero} / ${currentCategory.faixa} / ${currentCategory.peso}`,
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

      if (/total de atletas/i.test(sanitizedLine) || /divinolandia/i.test(sanitizedLine) || /relacao de atletas/i.test(sanitizedLine) || /atualizado/i.test(sanitizedLine)) return;

      const { nome, academia } = splitNameAcademia(sanitizedLine);
      if (!nome) return;

      parsedAthletes.push({
        nome,
        academia: academia || 'Sem academia',
        faixa: currentCategory.faixa,
        categoria: `${currentCategory.categoria} / ${currentCategory.genero} / ${currentCategory.faixa} / ${currentCategory.peso}`,
        peso: currentCategory.peso,
        genero: currentCategory.genero,
        isNoGi: mode === 'NO-GI',
        isAbsolute: false,
      });
    });
  }

  const finalAthletes = parsedAthletes.length ? parsedAthletes : parseAthletesFromTable((text || '').split(/\r?\n/).map(trimLine).filter(Boolean), mode);

  // Deduplicate athletes by (nome + faixa + genero)
  const uniqueAthletes = [];
  const seen = new Set();

  (finalAthletes || []).forEach((athlete) => {
    const key = `${normalizeForMatch(athlete.nome)}_${normalizeForMatch(athlete.faixa)}_${normalizeForMatch(athlete.genero)}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueAthletes.push(athlete);
    }
  });

  return uniqueAthletes;
};
