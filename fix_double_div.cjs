const fs = require('fs');

let code = fs.readFileSync('src/pages/Dashboard.jsx', 'utf8');

const badBlock = `                    </div>
                    </div>
                </section>
                )}`;

const replacement = `                    </div>
                </section>
                )}`;

if (code.includes(badBlock)) {
    code = code.replace(badBlock, replacement);
    fs.writeFileSync('src/pages/Dashboard.jsx', code);
    console.log('Fixed double div syntax error!');
} else {
    // maybe it's slightly different
    console.log('Did not find bad block exact match');
    // let's do a regex to fix it safely
    const regex = /<\/div>\s*<\/div>\s*<\/section>\s*\)\}\s*\{canManagePanel && activeSection === 'overview' && \(/;
    if (regex.test(code)) {
        code = code.replace(regex, "</div>\n                </section>\n                )}\n                {canManagePanel && activeSection === 'overview' && (");
        fs.writeFileSync('src/pages/Dashboard.jsx', code);
        console.log('Fixed double div syntax error via regex!');
    }
}
