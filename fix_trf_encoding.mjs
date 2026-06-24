/**
 * Direct string replacement fixer for TournamentRegistrationFlow.jsx
 * Replaces U+FFFD replacement characters with the correct Portuguese chars.
 */
import { readFileSync, writeFileSync } from 'fs';

const filePath = './src/components/TournamentRegistrationFlow.jsx';
let text = readFileSync(filePath, 'utf8');

const FFFD = '\uFFFD';

// All known corrupted strings → correct versions
// Pattern: [broken, correct]
const fixes = [
  // Error messages
  [`inscri${FFFD}${FFFD}o: `, `inscrição: `],
  [`inscri${FFFD}o: `, `inscrição: `],

  // Header line with bullet
  [`Inscri${FFFD}${FFFD}o oficial Genesis`, `Inscrição oficial Genesis`],
  [`Inscri${FFFD}o oficial Genesis`, `Inscrição oficial Genesis`],
  [`Genesis ${FFFD}${FFFD}${FFFD} {event.name}`, `Genesis • {event.name}`],
  [`Genesis ${FFFD} {event.name}`, `Genesis • {event.name}`],

  // Policy section
  [`Pol${FFFD}tica de Cancelamento/Reembolso`, `Política de Cancelamento/Reembolso`],
  [`${FFFD}ltimo dia para cancelar`, `Último dia para cancelar`],
  [`an${FFFD}lise do organizador`, `análise do organizador`],
  [`${FFFD}ltimo dia para editar`, `Último dia para editar`],

  // Breadcrumb
  [`DETALHES DO USU${FFFD}RIO`, `DETALHES DO USUÁRIO`],
  [`DETALHES DO USU${FFFD}${FFFD}RIO`, `DETALHES DO USUÁRIO`],

  // Table labels
  [`G${FFFD}nero`, `Gênero`],
  [`resid${FFFD}ncia`, `residência`],

  // Photo section
  [`Necess${FFFD}ria`, `Necessária`],
  [`Aten${FFFD}${FFFD}o: `, `Atenção: `],
  [`Aten${FFFD}o: `, `Atenção: `],
  [`${FFFD} obrigat${FFFD}rio ter uma foto`, `É obrigatório ter uma foto`],
  [`obrigat${FFFD}rio ter uma foto`, `obrigatório ter uma foto`],
  [`identifica${FFFD}${FFFD}o no dia`, `identificação no dia`],
  [`identifica${FFFD}o no dia`, `identificação no dia`],

  // Payment section
  [`Cart${FFFD}${FFFD}o`, `Cartão`],
  [`Cart${FFFD}o`, `Cartão`],
  [`c${FFFD}digo acima`, `código acima`],
  [`Integra${FFFD}${FFFD}o com`, `Integração com`],
  [`Integra${FFFD}o com`, `Integração com`],
  [`Cr${FFFD}dito`, `Crédito`],
  [`confirma${FFFD}${FFFD}o imediata`, `confirmação imediata`],
  [`confirma${FFFD}o imediata`, `confirmação imediata`],
  [`J${FFFD} realizei`, `Já realizei`],

  // Success step
  [`est${FFFD} garantida`, `está garantida`],
  [`Ver minha inscri${FFFD}${FFFD}o`, `Ver minha inscrição`],
  [`Ver minha inscri${FFFD}o`, `Ver minha inscrição`],
  [`Minhas inscri${FFFD}${FFFD}${FFFD}es`, `Minhas inscrições`],
  [`Minhas inscri${FFFD}${FFFD}es`, `Minhas inscrições`],
  [`Minhas inscri${FFFD}es`, `Minhas inscrições`],

  // Other common patterns
  [`Inscri${FFFD}${FFFD}o Realizada`, `Inscrição Realizada`],
  [`Inscri${FFFD}o Realizada`, `Inscrição Realizada`],
  [`sua inscri${FFFD}${FFFD}o`, `sua inscrição`],
  [`sua inscri${FFFD}o`, `sua inscrição`],
  [`inscri${FFFD}${FFFD}o de cintur`, `inscrição de cintur`],
  [`inscri${FFFD}o de cintur`, `inscrição de cintur`],
  [`cintur${FFFD}${FFFD}o`, `cinturão`],
  [`cintur${FFFD}o`, `cinturão`],
  [`finalizar inscri${FFFD}${FFFD}o`, `finalizar inscrição`],
  [`finalizar inscri${FFFD}o`, `finalizar inscrição`],
  [`Inscri${FFFD}${FFFD}o de Atleta`, `Inscrição de Atleta`],
  [`Inscri${FFFD}o de Atleta`, `Inscrição de Atleta`],
  [`Inscri${FFFD}${FFFD}o no Absoluto`, `Inscrição no Absoluto`],
  [`Inscri${FFFD}o no Absoluto`, `Inscrição no Absoluto`],
  [`inscri${FFFD}${FFFD}o oficial`, `inscrição oficial`],
  [`inscri${FFFD}o oficial`, `inscrição oficial`],
  [`C${FFFD}digo Pix copiado`, `Código Pix copiado`],
  [`Foto Necess${FFFD}ria`, `Foto Necessária`],
  [`Foto Necess${FFFD}${FFFD}ria`, `Foto Necessária`],
];

let count = 0;
for (const [broken, correct] of fixes) {
  const before = text;
  text = text.split(broken).join(correct);
  if (text !== before) count++;
}

// Count remaining replacement chars
const remaining = (text.match(/\uFFFD/g) || []).length;

// Verification
const checks = [
  'inscrição', 'código', 'Já', 'Cartão', 'Atenção',
  'obrigatório', 'identificação', 'Política', 'Gênero', 'residência',
];

console.log(`Applied ${count} fix(es). Remaining U+FFFD chars: ${remaining}\n`);
console.log('Key strings:');
for (const word of checks) {
  console.log(`  ${text.includes(word) ? '✓' : '✗'} "${word}"`);
}

if (remaining > 0) {
  // Show remaining broken locations
  const lines = text.split('\n');
  console.log('\nLines with remaining U+FFFD:');
  lines.forEach((line, i) => {
    if (line.includes(FFFD)) {
      console.log(`  L${i+1}: ${line.trim().substring(0, 80)}`);
    }
  });
}

writeFileSync(filePath, text, 'utf8');
console.log('\n✅ File saved.');
