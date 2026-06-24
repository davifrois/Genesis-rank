const fs = require('fs');
const path = 'c:/Users/davif/OneDrive/Desktop/sitema de rank atletas/src/index.css';
let lines = fs.readFileSync(path, 'utf8').split('\n');

// Localizar a linha do .admin-shell
const shellIndex = lines.findIndex(l => l.includes('.admin-shell {'));

if (shellIndex !== -1) {
    // Substituir bloco .admin-shell e inserir .admin-sidebar e .admin-sidebar__header
    const newBlock = [
        '.admin-shell {',
        '  display: grid;',
        '  grid-template-columns: 260px 1fr;',
        '  gap: 3.5rem;',
        '  align-items: start;',
        '}',
        '',
        '.admin-sidebar {',
        '  position: sticky;',
        '  top: 96px;',
        '  align-self: start;',
        '  background: var(--surface);',
        '  border-radius: var(--radius-lg);',
        '  padding: 1.5rem;',
        '  box-shadow: 0 12px 48px rgba(0,0,0,0.3);',
        '  border: 1px solid rgba(88, 166, 255, 0.15);',
        '  display: flex;',
        '  flex-direction: column;',
        '  gap: 1.8rem;',
        '  height: fit-content;',
        '}',
        '',
        '.admin-sidebar__header {',
        '  display: flex;',
        '  align-items: center;',
        '  justify-content: space-between;',
        '}'
    ];

    // Encontrar o fim do bloco quebrado (até onde começam os próximos estilos válidos)
    let endIndex = shellIndex;
    while (endIndex < lines.length && !lines[endIndex].includes('.admin-sidebar__title')) {
        endIndex++;
    }

    lines.splice(shellIndex, endIndex - shellIndex, ...newBlock);
    fs.writeFileSync(path, lines.join('\n'), 'utf8');
    console.log('Admin CSS structure restored via script.');
} else {
    console.log('.admin-shell not found');
}
