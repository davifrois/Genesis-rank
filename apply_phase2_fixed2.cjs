const fs = require('fs');

let code = fs.readFileSync('src/pages/Dashboard.jsx', 'utf8');

const stateVariables = `
    const [superFightsEventId, setSuperFightsEventId] = useState('');
    const [pendingSuperFights, setPendingSuperFights] = useState([{
        id: crypto.randomUUID(),
        category: 'Adulto',
        athlete1Name: '', athlete1Belt: 'Branca', athlete1Academy: '',
        athlete2Name: '', athlete2Belt: 'Branca', athlete2Academy: '',
        scheduledTime: ''
    }]);
    const [autoGenerateOptions, setAutoGenerateOptions] = useState({
        startTime: '',
        intervalMins: 5
    });
`;

if (!code.includes('setSuperFightsEventId')) {
    const insertStatePos = code.indexOf("const [scheduleEventId, setScheduleEventId]");
    if (insertStatePos !== -1) {
        code = code.slice(0, insertStatePos) + stateVariables + code.slice(insertStatePos);
    }
}

const sfLogic = fs.readFileSync('superFights_extracted.txt', 'utf8');

const wrappedSf = `                {canManagePanel && activeSection === 'superFights' && (
                <section className="panel" id="superFights">
                    <div className="panel-header">
                        <div>
                            <div className="panel-title">Lutas Casadas</div>
                            <div className="panel-subtitle">Gerencie as lutas casadas do evento</div>
                        </div>
                    </div>
                    <div className="panel-content">
${sfLogic}
                    </div>
                </section>
                )}\r\n`;

if (!code.includes('id="superFights"')) {
    const overviewPos = code.indexOf("{canManagePanel && activeSection === 'overview' && (", code.indexOf("{activeSection === 'schedule' && ("));
    
    if (overviewPos !== -1) {
        code = code.slice(0, overviewPos) + wrappedSf + code.slice(overviewPos);
    }
}

// Add the photo logic update manually in case it's not applied
const oldPhotoLogic = `<div className="registration-card__photo">{copy.registrationsPanel.noPhoto}</div>`;
const newPhotoLogic = `{item.athletePhotoUrl ? (
                                            <img className="registration-card__photo" src={item.athletePhotoUrl} alt={item.nome || copy.registrationsPanel.tableAthlete} loading="lazy" />
                                        ) : (
                                            <div className="registration-card__photo" title={copy.registrationsPanel.noPhoto}>
                                                <User size={28} color="currentColor" style={{ opacity: 0.5 }} />
                                            </div>
                                        )}`;

if (code.includes(oldPhotoLogic)) {
    const photoStart = code.indexOf("{item.athletePhotoUrl ? (");
    if (photoStart !== -1) {
       const photoEnd = code.indexOf(")}", code.indexOf(oldPhotoLogic)) + 2;
       code = code.slice(0, photoStart) + newPhotoLogic + code.slice(photoEnd);
    }
}

// Ensure User is imported
if (!code.includes('User,')) {
    code = code.replace('Users,', 'User,\n    Users,');
}

fs.writeFileSync('src/pages/Dashboard.jsx', code);
console.log('Successfully injected superFights!');
