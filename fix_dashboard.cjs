const fs = require('fs');

let c = fs.readFileSync('src/pages/Dashboard.jsx', 'utf8');

const badChunk = `aria-label={copy.bracketsPanel.selectEventAria}
                                    {copy.bracketsPanel.generate}
                                </button>`;

const goodChunk = `aria-label={copy.bracketsPanel.selectEventAria}
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
                                <option value="GI">GI</option>
                                <option value="NO-GI">NO-GI</option>
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
                                </button>`;

if(c.includes(badChunk)) {
    c = c.replace(badChunk, goodChunk);
    console.log('Fixed broken chunk');
} else {
    console.log('Chunk not found');
}

const badLink = `<Link
                        to={\`/events/\${event.id}\`}
                        className="btn btn-primary"
                    >`;

const goodLink = `<Link
                        to={\`/eventos/\${event.id}\`}
                        className="btn btn-primary"
                    >`;

if(c.includes(badLink)) {
    c = c.replace(badLink, goodLink);
    console.log('Fixed link');
} else {
    console.log('Link not found');
}

fs.writeFileSync('src/pages/Dashboard.jsx', c);
