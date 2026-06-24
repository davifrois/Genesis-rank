const fs = require('fs');
const path = require('path');
const cssPath = path.join(__dirname, 'src', 'index.css');

let css = fs.readFileSync(cssPath, 'utf8');

// Replace the sc-info-top-block styles
css = css.replace(/\.sc-info-top-block \{[\s\S]*?min-height: 180px;\n\}/, `.sc-info-top-block {
  background-color: #27272a;
  border-radius: 12px;
  margin-bottom: 32px;
  display: flex;
  align-items: stretch;
  min-height: 220px;
  padding: 16px;
  gap: 24px;
}`);

css = css.replace(/\.sc-info-banner-wrap \{[\s\S]*?overflow: hidden;\n\}/, `.sc-info-banner-wrap {
  flex: 1 1 65%;
  overflow: hidden;
  border-radius: 8px;
  position: relative;
}`);

css = css.replace(/\.sc-info-batches \{[\s\S]*?justify-content: center;\n\}/, `.sc-info-batches {
  flex: 0 0 300px;
  padding: 16px 0;
  display: flex;
  flex-direction: column;
  gap: 20px;
  justify-content: center;
}`);

// Increase max width if they want it wider
css = css.replace(/\.sc-content \{\n  padding: 32px 24px;\n  max-width: 1200px;\n  margin: 0 auto;\n\}/, `.sc-content {
  padding: 32px 24px;
  max-width: 1400px; /* Expandido para os lados */
  margin: 0 auto;
}`);

fs.writeFileSync(cssPath, css);
console.log('CSS updated');
