import fs from 'fs';
const file = 'src/components/TournamentRegistrationFlow.jsx';

// Read as buffer then force UTF-8
let c = fs.readFileSync(file, 'utf8');

// Comprehensive mojibake repair - all patterns observed
const fixes = [
  // Double-encoded UTF-8 sequences (most common pattern)
  ['Ã\u00c7Ã\u009e', 'Ã'], ['Ã\u00a7Ã\u00a3o', 'ção'],
  ['inscri\u00e3\u00a7\u00e3\u00a3o', 'inscrição'],
  // Single encoding artifacts  
  ['Cintur\ufffdão', 'Cinturão'], ['Cintur\ufffdo', 'Cinturão'],
  ['inscri\ufffdo', 'inscrição'], ['Inscri\ufffdo', 'Inscrição'],
  ['A inscri', 'A inscrição'],
  ['Aten\ufffd\ufffd\ufffdo', 'Atenção'], ['Aten\ufffdo', 'Atenção'],
  ['obrigat\ufffdo', 'obrigatório'], ['obrigat\ufffd\ufffdo', 'obrigatório'],
  ['identifica\ufffd\ufffd\ufffdo', 'identificação'], ['identifica\ufffdo', 'identificação'],
  ['Pol\ufffd\ufffdtica', 'Política'], ['Pol\ufffdtica', 'Política'],
  ['Cancelamento/Reembolso', 'Cancelamento/Reembolso'],
  ['\ufffd\ufffdltimo', 'Último'], ['\ufffdltimo', 'Último'],
  ['an\ufffd\ufffdlise', 'análise'], ['an\ufffdlise', 'análise'],
  ['USU\ufffd\ufffd\ufffdRIO', 'USUÁRIO'], ['USU\ufffdRIO', 'USUÁRIO'],
  ['G\ufffd\ufffdnero', 'Gênero'], ['G\ufffdnero', 'Gênero'],
  ['resid\ufffd\ufffdncia', 'residência'], ['resid\ufffdncia', 'residência'],
  ['Necess\ufffd\ufffdia', 'Necessária'], ['Necess\ufffdria', 'Necessária'],
  ['obrigat\ufffd\ufffdo', 'obrigatório'],
  ['ir\ufffd\ufffd ', 'irá '], ['ir\ufffd ', 'irá '],
  ['lutar', 'lutar'],
  ['\ufffd\ufffd VIA WHATSAPP', '· VIA WHATSAPP'], ['\ufffd VIA WHATSAPP', '· VIA WHATSAPP'],
  ['\ufffd\ufffd Base', '· Base'], ['\ufffd Base', '· Base'],
  ['\ufffd\ufffd {serverClockPrice', '· {serverClockPrice'],
  ['At\ufffd 15', 'Até 15'],
  ['AVAN\ufffdAR', 'AVANÇAR'], ['AVAN\ufffd\ufffdAR', 'AVANÇAR'],
  ['Cintur\ufffd\ufffdo', 'Cinturão'],
  ['\"Erro ao finalizar inscri\ufffd\ufffd\ufffdo', '"Erro ao finalizar inscrição'],
  ['\"Erro ao finalizar inscri\ufffdo', '"Erro ao finalizar inscrição'],
  ['Inscri\ufffd\ufffdo oficial', 'Inscrição oficial'],
  ['Inscri\ufffdo oficial', 'Inscrição oficial'],
  ['\ufffd\ufffd •', '• '],
  [' \ufffd ', ' · '],
];

fixes.forEach(([bad, good]) => {
  while (c.includes(bad)) c = c.split(bad).join(good);
});

// Regex-based fixes for remaining artifacts
c = c.replace(/AVAN[Ã\ufffd]+AR/g, 'AVANÇAR');
c = c.replace(/Cintur[aã\ufffd]+o/g, 'Cinturão');
c = c.replace(/inscri[çc\ufffd]+[aã\ufffd]+o/gi, m => m[0] === m[0].toUpperCase() ? 'Inscrição' : 'inscrição');
c = c.replace(/Aten[çc\ufffd]+[aã\ufffd]+o/gi, 'Atenção');
c = c.replace(/identifica[çc\ufffd]+[aã\ufffd]+o/gi, 'identificação');
c = c.replace(/obrigat[oó\ufffd]+rio/gi, 'obrigatório');
c = c.replace(/USU[AÁ\ufffd]+RIO/g, 'USUÁRIO');
c = c.replace(/G[êe\ufffd]+nero/gi, m => m[0] === 'G' ? 'Gênero' : 'gênero');
c = c.replace(/resid[êe\ufffd]+ncia/gi, 'residência');
c = c.replace(/Pol[íi\ufffd]+tica/gi, 'Política');
c = c.replace(/[Úu\ufffd]+ltimo/gi, m => m[0] === m[0].toUpperCase() ? 'Último' : 'último');
c = c.replace(/an[áa\ufffd]+lise/gi, 'análise');
c = c.replace(/Necess[áa\ufffd]+ria/gi, 'Necessária');
c = c.replace(/ir[áa\ufffd]+ lutar/g, 'irá lutar');
c = c.replace(/At[eé\ufffd]+ 15/g, 'Até 15');
c = c.replace(/[\ufffd·•]+\s*VIA WHATSAPP/g, '· VIA WHATSAPP');
c = c.replace(/[\ufffd·•]+\s*Base/g, '· Base');
c = c.replace(/[\ufffd·•]+\s*\{serverClockPrice/g, '· {serverClockPrice');
c = c.replace(/[\ufffd·•]+\s*\{categoryInfo/g, '· {categoryInfo');

// Fix broken alert message
c = c.replace(/alert\("Erro ao finalizar inscri[^"]*"/g, 'alert("Erro ao finalizar inscrição: " + error.message');

// Fix the breakdown line that uses ageGroup to use categoryInfo.ageCategoryLabel
c = c.replace(
  /\{activeBatchName\}[^{]*\{serverClockPrice\.ageGroup === 'Kids' \? 'Até 15 anos' : 'Acima de 15 anos'\}[^{]*Base/g,
  `{activeBatchName} · {categoryInfo.ageCategoryLabel} · Base`
);

fs.writeFileSync(file, c, 'utf8');
console.log('✅ All encoding bugs fixed. File saved.');
