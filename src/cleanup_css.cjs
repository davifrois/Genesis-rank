const fs = require('fs');
const path = 'c:/Users/davif/OneDrive/Desktop/sitema de rank atletas/src/index.css';
let content = fs.readFileSync(path, 'utf8');

// Fix the broken .btn-collapse block at line 3313 approx
// The content looked like:
// .event-card__quick-metrics span {
//   ...
//   .btn-collapse {
//     ...
//   }
// } .btn-collapse:hover { ... } background: var(--surface); ... }

// I will search for the specific broken pattern
const brokenPattern = /\.event-card__quick-metrics span \{[\s\S]+?\.btn-collapse \{[\s\S]+?\}[\s\S]+?\.btn-collapse:hover \{[\s\S]+?\}[\s\S]+?background: var\(--surface\);[\s\S]+?padding: 0\.26rem 0\.54rem;[\s\S]+?\}/;

const fixedQuickMetrics = `.event-card__quick-metrics span {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--muted-strong);
  background: var(--surface);
  border-radius: 999px;
  padding: 0.26rem 0.54rem;
}`;

const btnCollapseStyles = `.btn-collapse {
  background: rgba(88, 166, 255, 0.08);
  border: 1px solid rgba(88, 166, 255, 0.2);
  color: #58a6ff;
  padding: 0.65rem 1.2rem;
  border-radius: 10px;
  font-weight: 700;
  font-size: 0.82rem;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-right: 0.5rem;
  cursor: pointer;
  white-space: nowrap;
}

.btn-collapse:hover {
  background: rgba(88, 166, 255, 0.15);
  border-color: #58a6ff;
  box-shadow: 0 0 15px rgba(88, 166, 255, 0.15);
}

.admin-sidebar-toggle {
  background: rgba(88, 166, 255, 0.08) !important;
  border: 1px solid rgba(88, 166, 255, 0.2) !important;
  color: #58a6ff !important;
  border-radius: 10px !important;
  padding: 0.6rem 1rem !important;
  transition: all 0.2s !important;
  display: inline-flex !important;
  align-items: center !important;
  gap: 0.6rem !important;
}

.admin-sidebar-toggle:hover {
  background: rgba(88, 166, 255, 0.15) !important;
  border-color: #58a6ff !important;
}`;

content = content.replace(brokenPattern, fixedQuickMetrics);

// Add btnCollapseStyles to the end or a safe place
content += '\n\n' + btnCollapseStyles;

fs.writeFileSync(path, content, 'utf8');
console.log('CSS cleaned and styles consolidated.');
