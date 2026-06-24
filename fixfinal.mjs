import fs from 'fs';

let current = fs.readFileSync('src/pages/Dashboard.jsx', 'utf8');

const missingBlock = `                        <div>
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
`;

const anchor = `                            <button
                                type="button"
                                className="btn btn-secondary"`;

if (current.includes(missingBlock)) {
    console.log("Already fixed.");
} else if (current.includes(anchor)) {
    // Find the right anchor, which is inside <section className="panel" id="brackets">
    let sectionIdx = current.indexOf('id="brackets"');
    if (sectionIdx !== -1) {
        let anchorIdx = current.indexOf(anchor, sectionIdx);
        if (anchorIdx !== -1) {
            current = current.substring(0, anchorIdx) + missingBlock + current.substring(anchorIdx);
            fs.writeFileSync('src/pages/Dashboard.jsx', current, 'utf8');
            console.log("Successfully restored the missing brackets panel header!");
        } else {
            console.log("Anchor not found after section.");
        }
    } else {
        console.log("Section brackets not found.");
    }
} else {
    console.log("Anchor completely not found.");
}
