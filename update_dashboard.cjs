const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'Dashboard.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add import
if (!content.includes('CalendarWidget')) {
    content = content.replace("import { Search, Plus, Trash2, Edit2,", "import CalendarWidget from '../components/CalendarWidget';\nimport { Search, Plus, Trash2, Edit2,");
}

// 2. Add stat-card modifiers
content = content.replace('<div className="stat-card stat-card--focus">', '<div className="stat-card stat-card--focus stat-card--users">');
content = content.replace('<div className="stat-card stat-card--focus">', '<div className="stat-card stat-card--focus stat-card--points">');
content = content.replace('<div className="stat-card stat-card--focus">', '<div className="stat-card stat-card--focus stat-card--events">');
content = content.replace('<div className="stat-card stat-card--secondary">', '<div className="stat-card stat-card--secondary stat-card--records">');

// 3. Inject Calendar widget
const calendarInjection = `
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '20px' }}>
                      <CalendarWidget events={events} />
                      <section className="panel" style={{ margin: 0, height: '100%' }}>
                          <div className="panel-header">
                              <div>
                                  <div className="panel-title">{copy.beltSummary.title}</div>
`;

// Replace the start of beltSummary section to inject the grid wrapper
const oldBeltSummary = `<section className="panel">
                      <div className="panel-header">
                          <div>
                              <div className="panel-title">{copy.beltSummary.title}</div>`;

if (content.includes(oldBeltSummary)) {
    content = content.replace(oldBeltSummary, calendarInjection);
    
    // We also need to close the grid wrapper. The beltSummary ends with:
    //                   </div>
    //               </section>
    //               )}
    // Let's find the closing tag. It's right before athletesPanel (if it exists) or activeSection === 'athletes'
    // Actually, beltSummary is inside `activeSection === 'overview'`.
    const oldBeltEnd = `                  </section>
                  )}
                  {canManagePanel && activeSection === 'events' && (`;
    const newBeltEnd = `                  </section>
                  </div>
                  )}
                  {canManagePanel && activeSection === 'events' && (`;
                  
    if (content.includes(oldBeltEnd)) {
        content = content.replace(oldBeltEnd, newBeltEnd);
    }
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Dashboard.jsx successfully updated with new features!');
