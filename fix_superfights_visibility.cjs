const fs = require('fs');

async function fix() {
    let dashboard = fs.readFileSync('src/pages/Dashboard.jsx', 'utf8');
    
    // 1. Add Eye and EyeOff imports
    if (!dashboard.includes('EyeOff')) {
        dashboard = dashboard.replace('X\n} from \'lucide-react\';', 'X,\n    Eye,\n    EyeOff\n} from \'lucide-react\';');
    }

    // 2. Add published: false to new superfight initialization
    if (!dashboard.includes('status: \'pending\',\n                                        published: false')) {
        dashboard = dashboard.replace(
            `fighter2: { name: '', academy: '', belt: 'Branca', photo: '' },\n                                        status: 'pending'`,
            `fighter2: { name: '', academy: '', belt: 'Branca', photo: '' },\n                                        status: 'pending',\n                                        published: false`
        );
    }

    // 3. Add the toggle button in the list of fights
    const buttonBlock = `<button onClick={() => {
                                                        const updatedEvent = { ...activeEvent };
                                                        const fightIndex = updatedEvent.superFights.findIndex(f => f.id === fight.id);
                                                        if (fightIndex >= 0) {
                                                            updatedEvent.superFights[fightIndex] = { ...fight, published: !fight.published };
                                                            updateEvent(activeEvent.id, updatedEvent);
                                                        }
                                                    }} style={{ background: 'transparent', border: 'none', color: fight.published ? '#22c55e' : '#94a3b8', cursor: 'pointer' }} title={fight.published ? "Despublicar luta" : "Publicar luta"}>
                                                        {fight.published ? <Eye size={16} /> : <EyeOff size={16} />}
                                                    </button>`;

    if (!dashboard.includes('<EyeOff size={16} />')) {
        dashboard = dashboard.replace(
            `<button onClick={() => setSuperfightForm(fight)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><Pencil size={16} /></button>`,
            `${buttonBlock}\n                                                    <button onClick={() => setSuperfightForm(fight)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><Pencil size={16} /></button>`
        );
    }
    
    // 4. Update the LUTA PRINCIPAL label to indicate if it's published or draft
    if (!dashboard.includes('RASCUNHO')) {
        dashboard = dashboard.replace(
            `<span style={{ fontSize: '12px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '4px 8px', borderRadius: '4px', fontWeight: 600 }}>LUTA PRINCIPAL</span>`,
            `<div style={{ display: 'flex', gap: '8px' }}>
                                                    <span style={{ fontSize: '12px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '4px 8px', borderRadius: '4px', fontWeight: 600 }}>LUTA PRINCIPAL</span>
                                                    {!fight.published && <span style={{ fontSize: '12px', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', padding: '4px 8px', borderRadius: '4px', fontWeight: 600 }}>RASCUNHO</span>}
                                                </div>`
        );
    }

    fs.writeFileSync('src/pages/Dashboard.jsx', dashboard);

    // 5. Update EventDetails.jsx to only show published fights
    let eventDetails = fs.readFileSync('src/pages/EventDetails.jsx', 'utf8');
    if (!eventDetails.includes('filter(f => f.published)')) {
        eventDetails = eventDetails.replace(
            `const superFightsList = event.superFights || [];`,
            `const superFightsList = (event.superFights || []).filter(f => f.published);`
        );
        fs.writeFileSync('src/pages/EventDetails.jsx', eventDetails);
    }
    
    console.log("Done");
}

fix();
