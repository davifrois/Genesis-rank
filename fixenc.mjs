import fs from 'fs';
const file = 'src/components/TournamentRegistrationFlow.jsx';
let c = fs.readFileSync(file, 'utf8');

// 1. Fix all encoding bugs (mojibake)
const fixes = [
  ['irÃÂ¡', 'irá'], ['ÃÂ¡', 'á'], ['ÃÂ£', 'ã'], ['ÃÂ§', 'ç'],
  ['ÃÂ©', 'é'], ['ÃÂ³', 'ó'], ['ÃÂ­', 'í'], ['ÃÂ¢', 'â'],
  ['ÃÂª', 'ê'], ['ÃÂ´', 'ô'], ['ÃÂµ', 'õ'], ['ÃÂ ', 'à'],
  ['CartÃ£o', 'Cartão'], ['JÃ¡', 'Já'], ['estÃ¡', 'está'],
  ['inscriÃ§Ã£o', 'inscrição'], ['inscriÃ§Ãµes', 'inscrições'],
  ['cÃ³digo', 'código'], ['confirmaÃ§Ã£o', 'confirmação'],
  ['IntegraÃ§Ã£o', 'Integração'], ['CrÃ©dito', 'Crédito'],
  ['Â·', '·'], ['Ã·', '·'], ['AvanÃ§ar', 'Avançar'],
  ['AVANÃAR', 'AVANÇAR'], ['AVANÃ\u0087AR', 'AVANÇAR'],
  ['NecessÃ¡ria', 'Necessária'], ['AtenÃ§Ã£o', 'Atenção'],
  ['obrigatÃ³rio', 'obrigatório'], ['identificaÃ§Ã£o', 'identificação'],
  ['GÃªnero', 'Gênero'], ['residÃªncia', 'residência'],
  ['Contato e residÃªncia', 'Contato e residência'],
];
fixes.forEach(([bad, good]) => { while (c.includes(bad)) c = c.split(bad).join(good); });

// 2. Fix specific broken text blocks
c = c.replace(/Modalidades \(Selecione o que irÃÂ¡ lutar\)/g, 'Modalidades (Selecione o que irá lutar)');
c = c.replace(/Modalidades \(Selecione o que irá lutar\)/, 'Modalidades (Selecione o que irá lutar)'); // already correct
c = c.replace(/\{formatBrlCurrency\(beltRegistration\.price\)\} Ã· VIA WHATSAPP/g, '{formatBrlCurrency(beltRegistration.price)} · VIA WHATSAPP');
c = c.replace(/\{activeBatchName\} Ã· \{/g, '{activeBatchName} · {');
c = c.replace(/\} Ã· Base/g, '} · Base');

// 3. Replace the CategorySelectionStep return JSX to show auto-detected category badge
const oldHeader = `  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="registration-step-v2"
    >
      <div className="registration-header-pro">
        <div className="event-tag">Inscrição de Atleta</div>
        <h2>Escolha suas categorias</h2>
        <div className="athlete-summary-bar">
          <div className="summary-item">
            <span className="label">Atleta:</span>
            <span className="value">{profile.fullName || profile.nome}</span>
          </div>
          <div className="summary-item">
            <span className="label">Faixa:</span>
            <span className="value">{profile.belt || profile.faixa}</span>
          </div>
        </div>
      </div>`;

const newHeader = `  const categoryInfo = useMemo(() => resolveCategoryByProfile(profile), [profile]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="registration-step-v2"
    >
      <div className="registration-header-pro">
        <div className="event-tag">Inscrição de Atleta</div>
        <h2>Escolha suas categorias</h2>

        {/* AUTO-DETECTED CATEGORY BADGE */}
        <div className="auto-category-badge" style={{ marginBottom: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            background: categoryInfo.ageCategoryColor + '22',
            border: \`1.5px solid \${categoryInfo.ageCategoryColor}\`,
            color: categoryInfo.ageCategoryColor,
            borderRadius: '20px', padding: '4px 14px', fontWeight: 700,
            fontSize: '13px', letterSpacing: '0.5px'
          }}>
            🎯 {categoryInfo.ageCategoryLabel}
          </span>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            background: categoryInfo.isFemale ? '#ec489920' : '#3b82f620',
            border: \`1.5px solid \${categoryInfo.isFemale ? '#ec4899' : '#3b82f6'}\`,
            color: categoryInfo.isFemale ? '#ec4899' : '#3b82f6',
            borderRadius: '20px', padding: '4px 14px', fontWeight: 700,
            fontSize: '13px', letterSpacing: '0.5px'
          }}>
            {categoryInfo.isFemale ? '♀ Feminino' : '♂ Masculino'}
          </span>
        </div>

        <div className="athlete-summary-bar">
          <div className="summary-item">
            <span className="label">Atleta:</span>
            <span className="value">{profile.fullName || profile.nome}</span>
          </div>
          <div className="summary-item">
            <span className="label">Faixa:</span>
            <span className="value">{profile.belt || profile.faixa}</span>
          </div>
          {categoryInfo.age > 0 && (
            <div className="summary-item">
              <span className="label">Idade:</span>
              <span className="value">{categoryInfo.age} anos</span>
            </div>
          )}
        </div>
      </div>`;

// Also fix label for modality section
c = c.replace(`<label>Modalidades (Selecione o que irÃÂ¡ lutar)</label>`, '<label>Modalidades (Selecione o que irá lutar)</label>');
c = c.replace(`<label>Modalidades (Selecione o que irà lutar)</label>`, '<label>Modalidades (Selecione o que irá lutar)</label>');

// Fix the footer breakdown
c = c.replace(
  /{activeBatchName} Ã· {serverClockPrice.ageGroup === 'Kids' ? 'Até 15 anos' : 'Acima de 15 anos'} Ã· Base {formatBrlCurrency(categoryBasePrice)}/g,
  `{activeBatchName} · {categoryInfo.ageCategoryLabel} · Base {formatBrlCurrency(categoryBasePrice)}`
);

if (c.includes(oldHeader)) {
  c = c.replace(oldHeader, newHeader);
  console.log('✅ Header replaced with auto-category badge');
} else {
  // Try with windows line endings
  const oldHeaderWin = oldHeader.replace(/\n/g, '\r\n');
  if (c.includes(oldHeaderWin)) {
    c = c.replace(oldHeaderWin, newHeader);
    console.log('✅ Header replaced (CRLF) with auto-category badge');
  } else {
    console.log('⚠️  Header not found exactly, encoding fixes still applied');
  }
}

fs.writeFileSync(file, c, 'utf8');
console.log('✅ Done. File saved.');
