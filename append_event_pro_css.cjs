const fs = require('fs');
const path = require('path');
const cssPath = path.join(__dirname, 'src', 'index.css');

let css = fs.readFileSync(cssPath, 'utf8');

const extraCss = `
/* Event Pro - full width container override */
.container--event-pro {
  max-width: 100% !important;
  padding: 0 !important;
  margin: 0 !important;
}

.app-main:has(.sc-event-page) {
  background-color: #111111;
  padding: 0;
}
`;

if (!css.includes('container--event-pro')) {
  fs.writeFileSync(cssPath, css + '\n' + extraCss);
  console.log('container--event-pro CSS added successfully.');
} else {
  console.log('CSS already exists.');
}
