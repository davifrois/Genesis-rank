const fs = require('fs');
const path = require('path');
const cssPath = path.join(__dirname, 'src', 'index.css');

let css = fs.readFileSync(cssPath, 'utf8');

const newCss = `
/* ========================================================
   Accommodation & Parents Tab Styles
======================================================== */

.sc-info-location-tab {
  border-radius: 8px;
  overflow: hidden;
  background-color: #27272a;
  margin: 0 24px 32px;
}

.sc-map-cta {
  padding: 16px 20px;
  background-color: #1f1f22;
  border-top: 1px solid #3f3f46;
}

.sc-accom-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  text-decoration: none;
  transition: opacity 0.2s, transform 0.15s;
  white-space: nowrap;
}

.sc-accom-btn:hover {
  opacity: 0.85;
  transform: translateY(-1px);
}

.sc-accom-btn--airbnb {
  background-color: #ff385c;
  color: #ffffff;
}

.sc-accom-btn--booking {
  background-color: #003580;
  color: #ffffff;
}

.sc-accom-btn--hotels {
  background-color: #c8102e;
  color: #ffffff;
}

.sc-accom-btn--maps {
  background-color: #4285f4;
  color: #ffffff;
}

/* Weight Table */
.sc-weight-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.sc-weight-table th {
  background-color: #1f1f22;
  color: #a1a1aa;
  padding: 10px 16px;
  text-align: left;
  font-weight: 600;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.sc-weight-table td {
  padding: 12px 16px;
  border-bottom: 1px solid #3f3f46;
  color: #e4e4e7;
}

.sc-weight-table tbody tr:last-child td {
  border-bottom: none;
}

.sc-weight-table tbody tr:hover td {
  background-color: #1f1f22;
}
`;

if (!css.includes('Accommodation & Parents Tab Styles')) {
  fs.writeFileSync(cssPath, css + '\n' + newCss);
  console.log('Accommodation CSS added successfully.');
} else {
  console.log('CSS already exists.');
}
