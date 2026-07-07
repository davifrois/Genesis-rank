const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'Dashboard.jsx');
let content = fs.readFileSync(filePath, 'utf8');

if (content.includes('const renderAdminEventCard = useCallback((event) => {')) {
    const startIndex = content.indexOf('const renderAdminEventCard = useCallback((event) => {');
    const endIndex = content.indexOf('}, [activeEventId, canManagePanel, copy, formatEventDate, handleActivateEvent, openEventModal]);') + 96;
    
    if (startIndex !== -1 && endIndex !== -1) {
        let functionBody = content.substring(startIndex, endIndex);
        
        // Replace poster and header
        const oldHeaderRegex = /<div className="event-card__poster">[\s\S]*?<\/div>\s*<div className="event-card__header">[\s\S]*?<div className="event-name">\{event\.name\}<\/div>\s*<div className="table-meta">\{metaParts\.join\(' - '\)\}<\/div>\s*<\/div>\s*<span className=\{\`tag \$\{isRegistrationOpen \? 'tag--open' : ''\}\`\}>\s*\{isRegistrationOpen \? copy\.eventsPanel\.open : copy\.eventsPanel\.closed\}\s*<\/span>\s*<\/div>/g;
        
        const newHeader = `<div className="event-card__poster">
                    {event.posterUrl ? (
                        <img src={event.posterUrl} alt={event.name || copy.eventsPanel.noPoster} loading="lazy" />
                    ) : (
                        <div className="event-card__poster-placeholder">{copy.eventsPanel.noPoster}</div>
                    )}
                    <span className={\`tag \${isRegistrationOpen ? 'tag--open' : ''} event-card__status-badge\`}>
                        {isRegistrationOpen ? copy.eventsPanel.open : copy.eventsPanel.closed}
                    </span>
                </div>
                <div className="event-card__content">
                    <div className="event-card__header">
                        <div>
                            <div className="event-name">{event.name}</div>
                            <div className="table-meta">{metaParts.join(' - ')}</div>
                        </div>
                    </div>`;
                    
        functionBody = functionBody.replace(oldHeaderRegex, newHeader);

        // Replace stats
        const oldStatsRegex = /<div className="event-card__stats">[\s\S]*?<\/div>\s*<\/div>/;
        const newStats = `<div className="event-card__stats">
                        <div className="event-stat">
                            <span><Users size={12} style={{marginRight: '4px', verticalAlign: 'text-bottom'}} /> {copy.eventsPanel.athletes}</span>
                            <strong>{event.athleteCount}</strong>
                        </div>
                        <div className="event-stat">
                            <span><CheckCircle2 size={12} style={{marginRight: '4px', verticalAlign: 'text-bottom'}} /> {copy.eventsPanel.activeEvent}</span>
                            <strong style={{ color: isActive ? '#10b981' : 'var(--ink)' }}>
                                {isActive ? copy.common.active : copy.common.inactive}
                            </strong>
                        </div>
                    </div>`;
                    
        functionBody = functionBody.replace(oldStatsRegex, newStats);

        // Add closing div for event-card__content right before the final closing div
        const finalDivIndex = functionBody.lastIndexOf('</div>');
        if (finalDivIndex !== -1) {
            functionBody = functionBody.substring(0, finalDivIndex) + '</div>\n' + functionBody.substring(finalDivIndex);
        }
        
        content = content.substring(0, startIndex) + functionBody + content.substring(endIndex);
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('Dashboard.jsx successfully updated with redesigned event card!');
    } else {
        console.log('Could not find render function boundaries.');
    }
}
