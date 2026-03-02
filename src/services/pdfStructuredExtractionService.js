import { extractTextFromPdfFile } from './pdfImportService';

const REQUIRED_FIELDS = ['sexo', 'faixa', 'idade', 'nome', 'academia'];

const FIELD_LABELS = {
  nome: ['nome', 'atleta', 'competidor', 'participante'],
  sexo: ['sexo', 'genero'],
  faixa: ['faixa', 'faixas', 'graduacao', 'cinto'],
  idade: ['idade'],
  academia: ['academia', 'equipe', 'team'],
};

const LABEL_VARIANT_MAP = new Map(
  Object.entries(FIELD_LABELS)
    .flatMap(([key, variants]) => variants.map((variant) => [variant, key])),
);

const LABEL_REGEX = new RegExp(
  `\\b(${Array.from(LABEL_VARIANT_MAP.keys()).join('|')})\\b`,
  'gi',
);

const resolveLabelKey = (normalizedLabel) => {
  if (LABEL_VARIANT_MAP.has(normalizedLabel)) {
    return LABEL_VARIANT_MAP.get(normalizedLabel);
  }

  const tokens = normalizedLabel.split(' ').filter(Boolean);
  const matches = tokens.filter((token) => LABEL_VARIANT_MAP.has(token));

  if (matches.length === 1) {
    return LABEL_VARIANT_MAP.get(matches[0]);
  }

  return null;
};

const SEXO_MAP = new Map([
  ['masculino', 'masculino'],
  ['masc', 'masculino'],
  ['m', 'masculino'],
  ['feminino', 'feminino'],
  ['fem', 'feminino'],
  ['f', 'feminino'],
]);

const FAIXA_MAP = new Map([
  ['branca', 'branca'],
  ['branco', 'branca'],
  ['brancas', 'branca'],
  ['brancos', 'branca'],
  ['cinza', 'cinza'],
  ['cinzas', 'cinza'],
  ['amarelo', 'amarelo'],
  ['amarela', 'amarelo'],
  ['amarelos', 'amarelo'],
  ['amarelas', 'amarelo'],
  ['azul', 'azul'],
  ['azuis', 'azul'],
  ['laranja', 'laranja'],
  ['laranjas', 'laranja'],
  ['verde', 'verde'],
  ['verdes', 'verde'],
  ['roxa', 'roxa'],
  ['roxo', 'roxa'],
  ['roxas', 'roxa'],
  ['roxos', 'roxa'],
  ['marrom', 'marrom'],
  ['marrons', 'marrom'],
  ['preta', 'preta'],
  ['preto', 'preta'],
  ['pretas', 'preta'],
  ['pretos', 'preta'],
]);

const normalizeForMatch = (value) => (
  (value || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^0-9A-Za-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
);

const cleanText = (value) => (
  (value || '')
    .toString()
    .replace(/\s+/g, ' ')
    .trim()
);

const normalizeName = (value) => (
  cleanText(value)
    .replace(/[^\p{L}\s'-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
);

const normalizeAcademia = (value) => cleanText(value);

const normalizeSexo = (value) => {
  const tokens = normalizeForMatch(value).split(' ').filter(Boolean);
  for (const token of tokens) {
    if (SEXO_MAP.has(token)) return SEXO_MAP.get(token);
  }
  return '';
};

const normalizeFaixa = (value) => {
  const tokens = normalizeForMatch(value).split(' ').filter(Boolean);
  for (const token of tokens) {
    if (FAIXA_MAP.has(token)) return FAIXA_MAP.get(token);
  }
  return '';
};

const parseIdade = (value) => {
  const match = (value || '').toString().match(/-?\d+/);
  if (!match) return null;
  const idade = Number(match[0]);
  if (!Number.isFinite(idade) || idade <= 0) return null;
  return Math.trunc(idade);
};

const classifyIdade = (idade) => (idade <= 17 ? 'juvenil' : 'adulto');

const createEmptyRecord = () => ({
  nome: '',
  sexo: '',
  faixa: '',
  idade: null,
  categoriaIdade: '',
  academia: '',
  _raw: {},
});

const hasRecordValues = (record) => (
  REQUIRED_FIELDS.some((field) => {
    if (field === 'idade') return Number.isFinite(record.idade);
    return Boolean(record[field]);
  })
);

const applyValueToRecord = (record, key, value) => {
  const cleaned = cleanText(value);
  if (!cleaned) return;

  record._raw[key] = cleaned;

  if (key === 'nome') {
    record.nome = normalizeName(cleaned);
  }

  if (key === 'sexo') {
    record.sexo = normalizeSexo(cleaned);
  }

  if (key === 'faixa') {
    record.faixa = normalizeFaixa(cleaned);
  }

  if (key === 'idade') {
    const idade = parseIdade(cleaned);
    record.idade = idade;
    record.categoriaIdade = idade ? classifyIdade(idade) : '';
  }

  if (key === 'academia') {
    record.academia = normalizeAcademia(cleaned);
  }
};

const normalizeWithIndexMap = (value) => {
  let normalized = '';
  const indexMap = [];
  const input = (value || '').toString();

  for (let i = 0; i < input.length; i += 1) {
    const base = input[i]
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

    if (!base) continue;
    for (let j = 0; j < base.length; j += 1) {
      normalized += base[j];
      indexMap.push(i);
    }
  }

  return { normalized, indexMap };
};

const extractInlinePairs = (line) => {
  if (!line) return [];
  const { normalized, indexMap } = normalizeWithIndexMap(line);
  const matches = Array.from(normalized.matchAll(LABEL_REGEX));
  if (!matches.length) return [];

  const validMatches = [];
  matches.forEach((match) => {
    const label = match[1];
    const key = LABEL_VARIANT_MAP.get(label);
    if (!key) return;

    const startIndex = match.index ?? 0;
    const endIndex = startIndex + match[0].length - 1;
    const startOriginal = indexMap[startIndex];
    const endOriginal = (indexMap[endIndex] ?? startOriginal) + 1;

    const rawBefore = line.slice(0, startOriginal);
    const before = rawBefore.replace(/\s+$/g, '');
    const hasDoubleSpaceBoundary = /\s{2,}$/.test(rawBefore);
    const after = line.slice(endOriginal);
    const nextChar = after.trimStart()[0];
    const hasSeparator = nextChar === ':' || nextChar === '-';
    const boundary = before === '' || /[|;\-]$/.test(before) || hasDoubleSpaceBoundary;

    if (!hasSeparator && !boundary) return;

    validMatches.push({
      key,
      startOriginal,
      endOriginal,
      hasSeparator,
    });
  });

  if (!validMatches.length) return [];

  const pairs = [];
  for (let i = 0; i < validMatches.length; i += 1) {
    const current = validMatches[i];
    const next = validMatches[i + 1];
    let valueStart = current.endOriginal;

    while (valueStart < line.length && /[\s:\-]/.test(line[valueStart])) {
      valueStart += 1;
    }

    const valueEnd = next ? next.startOriginal : line.length;
    const value = line.slice(valueStart, valueEnd).trim();

    pairs.push({ key: current.key, value });
  }

  return pairs;
};

const splitTableColumns = (line) => (
  (line || '')
    .split(/\s*\|\s*|\s*;\s*|\t+|\s{2,}/)
    .map((value) => value.trim())
    .filter(Boolean)
);

const detectTableHeader = (line) => {
  const columns = splitTableColumns(line);
  if (columns.length < 3) return null;

  const indexes = {};
  columns.forEach((column, index) => {
    const key = resolveLabelKey(normalizeForMatch(column));
    if (key) indexes[key] = index;
  });

  if (Object.keys(indexes).length < 3) return null;

  return {
    columnCount: columns.length,
    indexes,
  };
};

const parseRecordsFromTable = (lines) => {
  const records = [];
  let header = null;

  lines.forEach((line) => {
    const headerCandidate = detectTableHeader(line);
    if (headerCandidate) {
      header = headerCandidate;
      return;
    }

    if (!header) return;
    if (!line) {
      header = null;
      return;
    }

    const columns = splitTableColumns(line);
    if (columns.length < header.columnCount) {
      header = null;
      return;
    }

    const record = createEmptyRecord();
    Object.entries(header.indexes).forEach(([key, index]) => {
      applyValueToRecord(record, key, columns[index] ?? '');
    });

    if (hasRecordValues(record)) records.push(record);
  });

  return records;
};

const parseRecordsFromLabels = (lines) => {
  const records = [];
  let current = createEmptyRecord();
  let pendingKey = null;

  lines.forEach((line) => {
    const pairs = extractInlinePairs(line);

    if (pairs.length) {
      pendingKey = null;
      pairs.forEach((pair) => {
        if (pair.key === 'nome' && hasRecordValues(current) && pair.value) {
          records.push(current);
          current = createEmptyRecord();
        }

        if (pair.value) {
          applyValueToRecord(current, pair.key, pair.value);
        } else {
          pendingKey = pair.key;
        }
      });
      return;
    }

    if (pendingKey) {
      applyValueToRecord(current, pendingKey, line);
      pendingKey = null;
    }
  });

  if (hasRecordValues(current)) records.push(current);

  return records;
};

export const parseAthleteRecordsFromText = (text) => {
  const lines = (text || '')
    .replace(/\r/g, '\n')
    .split('\n')
    .map(cleanText)
    .filter(Boolean);

  const tableRecords = parseRecordsFromTable(lines);
  if (tableRecords.length) return tableRecords;

  return parseRecordsFromLabels(lines);
};

export const validateAthleteRecord = (record) => {
  const errors = [];

  if (!record.nome || record.nome.split(' ').length < 2) {
    errors.push({ field: 'nome', message: 'Campo nome obrigatorio ou invalido.' });
  }

  if (record.sexo !== 'masculino' && record.sexo !== 'feminino') {
    errors.push({ field: 'sexo', message: 'Campo sexo obrigatorio ou invalido.' });
  }

  if (!FAIXA_MAP.has(record.faixa)) {
    errors.push({ field: 'faixa', message: 'Campo faixa obrigatorio ou invalido.' });
  }

  if (!Number.isFinite(record.idade) || record.idade <= 0) {
    errors.push({ field: 'idade', message: 'Campo idade obrigatorio ou invalido.' });
  }

  if (!record.academia) {
    errors.push({ field: 'academia', message: 'Campo academia obrigatorio.' });
  }

  if (record.idade && !record.categoriaIdade) {
    errors.push({ field: 'categoriaIdade', message: 'Classificacao de idade ausente.' });
  }

  return errors;
};

export const buildValidationReport = (records) => {
  if (!records.length) {
    return {
      totalRecords: 0,
      validRecords: 0,
      invalidRecords: 0,
      errors: [
        {
          record: 0,
          field: 'registro',
          message: 'Nenhum registro encontrado.',
        },
      ],
    };
  }

  const errors = [];
  const invalidRecords = new Set();

  records.forEach((record, index) => {
    const recordErrors = validateAthleteRecord(record);
    if (!recordErrors.length) return;

    invalidRecords.add(index + 1);
    recordErrors.forEach((error) => {
      errors.push({ record: index + 1, field: error.field, message: error.message });
    });
  });

  return {
    totalRecords: records.length,
    validRecords: records.length - invalidRecords.size,
    invalidRecords: invalidRecords.size,
    errors,
  };
};

export const extractStructuredDataFromPdfFile = async (file) => {
  try {
    const text = await extractTextFromPdfFile(file);
    const records = parseAthleteRecordsFromText(text);
    const report = buildValidationReport(records);

    return { records, report };
  } catch (error) {
    throw new Error('Falha ao extrair dados do PDF. Verifique o arquivo.');
  }
};
