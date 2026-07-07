const fs = require('fs');
const path = require('path');

const dashboardPath = path.join(__dirname, 'src', 'pages', 'Dashboard.jsx');
let dashboardContent = fs.readFileSync(dashboardPath, 'utf8');

const buttonRegex = /<button\s+type="button"\s+className="btn btn-secondary"\s+onClick=\{handleExportBracketsPdf\}\s+disabled=\{\!orderedFilteredBrackets\.length\}\s*>\s*<Download size=\{14\} \/>\s*\{copy\.bracketsPanel\.exportPdf\}\s*<\/button>/;

const newBracketButtons = `<button
                                  type="button"
                                  className="btn btn-primary"
                                  onClick={handlePublishAndGeneratePDF}
                                  disabled={!orderedFilteredBrackets.length}
                                  style={{ marginRight: '8px' }}
                              >
                                  <Download size={14} />
                                  {isEnglish ? 'Publish & Schedule PDF' : 'Publicar e Gerar PDF'}
                              </button>
                              <button
                                  type="button"
                                  className="btn btn-secondary"
                                  onClick={handleExportBracketsPdf}
                                  disabled={!orderedFilteredBrackets.length}
                              >
                                  <Download size={14} />
                                  {copy.bracketsPanel.exportPdf}
                              </button>`;

if (dashboardContent.match(buttonRegex)) {
    dashboardContent = dashboardContent.replace(buttonRegex, newBracketButtons);
    console.log('Injected Publicar e Gerar PDF button');
} else {
    console.log('Failed to match button regex. Attempting fallback replace...');
    const fallbackRegex = /<button\s+type="button"\s+className="btn btn-secondary"\s+onClick=\{handleExportBracketsPdf\}[\s\S]*?<\/button>/;
    if (dashboardContent.match(fallbackRegex)) {
        dashboardContent = dashboardContent.replace(fallbackRegex, newBracketButtons);
        console.log('Injected via fallback regex');
    }
}

fs.writeFileSync(dashboardPath, dashboardContent, 'utf8');
