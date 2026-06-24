const fs = require('fs');
const css = `
/* Layout Fixes */
body .app-main .container.container--full {
  width: 100% !important;
  max-width: none !important;
  padding-inline: 0 !important;
  overflow-x: clip;
}
`;
fs.appendFileSync('c:/Users/davif/OneDrive/Documentos/sitema de rank atletas/src/index.css', css);
console.log('Appended to index.css');
