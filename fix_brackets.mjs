import fs from 'fs';

let current = fs.readFileSync('src/pages/Dashboard.jsx', 'utf8');

const replacement = `<section className="panel" id="brackets">
                    <div className="panel-header">
                        <div>
                            <div className="panel-title">{copy.bracketsPanel.title}</div>
                            <div className="panel-subtitle">{copy.bracketsPanel.subtitle}</div>
                        </div>
                        <div className="panel-actions">
                            {events.length > 0 && (
                                <select
                                    className="input select-compact"
                                    value={bracketEventId}
                                    onChange={(event) => setBracketEventId(event.target.value)}
                                    aria-label={copy.bracketsPanel.selectEventAria}
                                >
                                    <option value="">{copy.bracketsPanel.selectEvent}</option>
                                    {events.map((event) => (
                                        <option key={event.id} value={event.id}>{event.name}</option>
                                    ))}
                                </select>
                            )}
                            <select
                                className="input select-compact"
                                value={bracketMode}
                                onChange={(event) => setBracketMode(event.target.value)}
                                aria-label={copy.bracketsPanel.selectCategoryAria}
                            >
                                <option value="ALL">{copy.bracketsPanel.allCategories}</option>
                                <option value="GI">{isEnglish ? 'GI (weight)' : 'GI (peso)'}</option>
                                <option value="NO-GI">{isEnglish ? 'NO-GI (weight)' : 'NO-GI (peso)'}</option>
                                <option value="ABS-GI">ABS GI</option>
                                <option value="ABS-NO-GI">ABS NO-GI</option>
                            </select>
                            {canManagePanel && (
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={handleGenerateBrackets}
                                    disabled={!events.length}
                                >
                                    <ClipboardList size={14} />
                                    {copy.bracketsPanel.generate}
                                </button>
                            )}
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => setBracketOrderByEvent({
                                    ...bracketOrderByEvent,
                                    [bracketEventId]: bracketOrderByEvent[bracketEventId] === 'ACADEMY' ? 'NAME' : 'ACADEMY'
                                })}
                            >
                                {bracketOrderByEvent[bracketEventId] === 'ACADEMY' ? 'Order: by Academy' : 'Order: by Name'}
                            </button>
                        </div>
                    </div>
                    <div className="panel-content">`;

let startIdx = current.indexOf('<section className="panel" id="brackets">');
let endIdx = current.indexOf('<div className="panel-content">', startIdx);

if (startIdx !== -1 && endIdx !== -1) {
    let toReplace = current.substring(startIdx, endIdx + '<div className="panel-content">'.length);
    current = current.replace(toReplace, replacement);
    
    // Also let's fix the link!
    const badLink = `<Link
                        to={\`/events/\${event.id}\`}
                        className="btn btn-primary"
                    >`;

    const goodLink = `<Link
                        to={\`/eventos/\${event.id}\`}
                        className="btn btn-primary"
                    >`;
    if (current.includes(badLink)) {
        current = current.replace(badLink, goodLink);
    }
    
    fs.writeFileSync('src/pages/Dashboard.jsx', current, 'utf8');
    console.log("Successfully replaced the entire brackets panel header!");
} else {
    console.log("Could not find start or end index.");
}
