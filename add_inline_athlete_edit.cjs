const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'Dashboard.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add Modal Render before the final </div>
const modalRender = `
            <AthleteCheckinModal
                isOpen={!!editingAssignAthlete}
                onClose={() => setEditingAssignAthlete(null)}
                athlete={editingAssignAthlete}
            />
        </div>
    );
};

export default Dashboard;`;

content = content.replace(
    /        <\/div>\r?\n    \);\r?\n};\r?\n\r?\nexport default Dashboard;/g,
    modalRender
);

// 2. Add Edit button to event-assign-item
const listRegex = /<label key=\{athlete\.id\} className="event-assign-item">([\s\S]*?)<\/label>/g;

content = content.replace(listRegex, (match, innerContent) => {
    return `<div key={athlete.id} className="event-assign-item" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: '8px' }}>
                                                <label style={{ display: 'flex', alignItems: 'center', flex: 1, cursor: 'pointer', margin: 0 }}>${innerContent}</label>
                                                <button
                                                    type="button"
                                                    className="btn btn-ghost"
                                                    style={{ padding: '4px', minWidth: 'auto', minHeight: 'auto', marginLeft: '8px' }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setEditingAssignAthlete(athlete);
                                                    }}
                                                    title="Editar atleta"
                                                >
                                                    <Pencil size={16} />
                                                </button>
                                            </div>`;
});

fs.writeFileSync(filePath, content, 'utf8');
console.log('Dashboard.jsx updated successfully.');
