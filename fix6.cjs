const fs = require('fs');

let oldCode = fs.readFileSync('dashboard_old.jsx', 'utf8');
let curCode = fs.readFileSync('src/pages/Dashboard.jsx', 'utf8');

const bracketsStartOld = oldCode.indexOf('<div className="panel-content">', oldCode.indexOf("{activeSection === 'brackets' && ("));
const bracketsEndOld = oldCode.indexOf('</section>', bracketsStartOld);
const bracketsContentOld = oldCode.substring(bracketsStartOld, bracketsEndOld);

const scheduleStartOld = oldCode.indexOf("{activeSection === 'schedule' && (");
const scheduleEndOld = oldCode.indexOf('</section>', scheduleStartOld) + 10;
const scheduleContentOld = oldCode.substring(scheduleStartOld, scheduleEndOld);

const sfStartCur = curCode.indexOf('<div className="bracket-event-selector">');
const sfEndCur = curCode.indexOf('</section>', sfStartCur);
const sfContentCur = curCode.substring(sfStartCur, sfEndCur);

let newCode = curCode.replace(sfContentCur, bracketsContentOld);

const insertIndex = newCode.indexOf("                {canManagePanel && activeSection === 'overview' && (", newCode.indexOf("</section>", newCode.indexOf("{activeSection === 'brackets' && (")));

const wrappedSf = `                {canManagePanel && activeSection === 'superFights' && (
                <section className="panel" id="superFights">
                    <div className="panel-header">
                        <div>
                            <div className="panel-title">Lutas Casadas</div>
                            <div className="panel-subtitle">Gerencie as lutas casadas do evento</div>
                        </div>
                    </div>
                    <div className="panel-content">
${sfContentCur}
                </section>
                )}\r\n`;

const wrappedSchedule = scheduleContentOld + "\r\n                )}\r\n";

newCode = newCode.slice(0, insertIndex) + wrappedSf + wrappedSchedule + newCode.slice(insertIndex);

fs.writeFileSync('src/pages/Dashboard.jsx', newCode);
console.log('Fixed successfully!');
