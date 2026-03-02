const escapeCsv = (value) => {
  if (value === null || value === undefined) return '';
  const text = String(value);
  const needsQuotes = /[";\n\r]/.test(text);
  const escaped = text.replace(/"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
};

export const buildFileSafeName = (value) => (
  (value || 'geral')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60)
);

export const downloadCsv = (filename, headers, rows) => {
  const safeName = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  const lines = [headers, ...rows].map((row) => row.map(escapeCsv).join(';'));
  const content = `\uFEFF${lines.join('\n')}`;
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = safeName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 500);
};
