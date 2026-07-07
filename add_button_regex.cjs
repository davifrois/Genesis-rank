const fs = require('fs');
const path = require('path');

const dashboardPath = path.join(__dirname, 'src', 'pages', 'Dashboard.jsx');
let dashboardContent = fs.readFileSync(dashboardPath, 'utf8');

const buttonRegex = /<button\s+type="button"\s+className="btn btn-primary"\s+onClick=\{handleAddManualScheduleItem\}\s*>\s*\{copy\.schedulePanel\.addItemAction\}\s*<\/button>/;

const newButtons = `<button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={handleAutoFillScheduleFromBrackets}
                                    style={{ marginRight: '8px' }}
                                >
                                    {isEnglish ? 'Auto-fill from Brackets' : 'Gerar das Chaves'}
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={handleAddManualScheduleItem}
                                >
                                    {copy.schedulePanel.addItemAction}
                                </button>`;

if (buttonRegex.test(dashboardContent)) {
    dashboardContent = dashboardContent.replace(buttonRegex, newButtons);
    console.log('Injected auto fill button');
} else {
    console.log('Failed to inject button');
}

fs.writeFileSync(dashboardPath, dashboardContent, 'utf8');
console.log('Updated Dashboard.jsx button');
