import fs from 'fs';
const file = 'src/components/TournamentRegistrationFlow.jsx';
let content = fs.readFileSync(file, 'utf8');

// Replace known mojibake manually based on the actual diagnostic output
const replacements = [
  ['irÃƒÂ¡', 'irá'],
  ['Ã‚·', '·'],
  ['AVANÃ‡AR', 'AVANÇAR'],
  ['AVANÃ\u0087AR', 'AVANÇAR'],
  ['AVANÃ\u0083Â\u0087AR', 'AVANÇAR'], // possible double encoding
  ['InscriÃ§Ã£o', 'Inscrição'],
  ['inscriÃ§Ã£o', 'inscrição'],
  ['inscriÃ§Ãµes', 'inscrições'],
  ['cÃ³digo', 'código'],
  ['confirmaÃ§Ã£o', 'confirmação'],
  ['IntegraÃ§Ã£o', 'Integração'],
  ['CrÃ©dito', 'Crédito'],
  ['CinturÃ£o', 'Cinturão'],
  ['cinturÃ£o', 'cinturão'],
  ['AtenÃ§Ã£o', 'Atenção'],
  ['obrigatÃ³rio', 'obrigatório'],
  ['identificaÃ§Ã£o', 'identificação'],
  ['PolÃ\u00adtica', 'Política'],
  ['polÃ\u00adtica', 'política'],
  ['Ã\u009altimo', 'Último'],
  ['Ã\u00baltimo', 'último'],
  ['anÃ¡lise', 'análise'],
  ['NecessÃ¡ria', 'Necessária'],
  ['GÃªnero', 'Gênero'],
  ['residÃªncia', 'residência'],
  ['AtÃ©', 'Até'],
  ['USUÃ\u0081RIO', 'USUÁRIO'],
  ['usuÃ¡rio', 'usuário'],
  ['organizaÃ§Ã£o', 'organização'],
  ['opÃ§Ãµes', 'opções'],
  ['paginaÃ§Ã£o', 'paginação'],
  ['ReembolsÃ', 'Reembolso'],
  ['Ã\u00a1', 'á'],
  ['Ã\u00a3', 'ã'],
  ['Ã\u00a7', 'ç'],
  ['Ã\u00a9', 'é'],
  ['Ã\u00b3', 'ó'],
  ['Ã\u00ba', 'ú'],
  ['Ã\u00ad', 'í'],
  ['Ã\u00a2', 'â'],
  ['Ã\u00aa', 'ê'],
  ['Ã\u00b4', 'ô'],
  ['Ã\u00b5', 'õ'],
  ['Ã\u00a0', 'à'],
  // And the ones specifically found in diagnostic
  ['irÃƒÂ¡', 'irá'],
  ['Ã‚·', '·'],
  ['AVANÃ\u2021AR', 'AVANÇAR'],
  ['InscriÃ§Ã£o', 'Inscrição'],
  ['AtenÃ§Ã£o', 'Atenção'],
  ['GÃªnero', 'Gênero'],
  ['residÃªncia', 'residência'],
  ['NecessÃ¡ria', 'Necessária'],
  ['obrigatÃ³rio', 'obrigatório'],
  ['identificaÃ§Ã£o', 'identificação'],
  ['PolÃ\u00adtica', 'Política'],
  ['anÃ¡lise', 'análise'],
  ['AtÃ©', 'Até'],
  ['USUÃ\u0081RIO', 'USUÁRIO'],
  ['CinturÃ£o', 'Cinturão']
];

// Execute replacements
replacements.forEach(([bad, good]) => {
  content = content.split(bad).join(good);
});

// Write back
fs.writeFileSync(file, content, 'utf8');

// Verification
const lines = content.split('\n');
console.log('Line 917:', lines[916]?.trim());
console.log('Line 956:', lines[955]?.trim());
console.log('Done replacing strings.');
