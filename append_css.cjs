const fs = require('fs');
const path = require('path');
const cssPath = path.join(__dirname, 'src', 'index.css');

let css = fs.readFileSync(cssPath, 'utf8');
const premiumCss = `
/* ========================================================
   Fase 2: Dark Premium Glassmorphism Settings Design 
======================================================== */
.smooth-settings-page {
  background: radial-gradient(circle at top left, #1a1a2e, #121212);
  color: #f4f4f5;
  font-family: 'Inter', 'Outfit', sans-serif;
  min-height: 100vh;
}

.smooth-settings-shell {
  max-width: 1200px;
  margin: 0 auto;
}

.smooth-settings-header h1 {
  font-size: 1.8rem;
  font-weight: 700;
  background: linear-gradient(90deg, #38bdf8, #818cf8);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  letter-spacing: -0.5px;
}

.smooth-settings-card {
  background: rgba(24, 24, 27, 0.6) !important;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.05) !important;
  border-radius: 16px !important;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3) !important;
  padding: 24px !important;
  margin-bottom: 24px !important;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.smooth-settings-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 15px 40px rgba(0, 0, 0, 0.4) !important;
}

.smooth-settings-card h2 {
  color: #e4e4e7 !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
  padding-bottom: 12px;
  font-weight: 600;
}

.smooth-row {
  border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
  padding: 16px 0 !important;
  color: #a1a1aa !important;
}

.smooth-row strong {
  color: #f4f4f5 !important;
  font-weight: 500;
}

.smooth-row input, .smooth-row select, .smooth-row textarea {
  background: rgba(0, 0, 0, 0.2) !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  color: #fff !important;
  border-radius: 8px !important;
  padding: 10px 14px !important;
  transition: all 0.2s;
}

.smooth-row input:focus, .smooth-row select:focus, .smooth-row textarea:focus {
  border-color: #38bdf8 !important;
  outline: none;
  box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.2);
}

.smooth-row button {
  color: #38bdf8 !important;
  font-weight: 600 !important;
  padding: 6px 12px;
  border-radius: 6px;
  transition: background 0.2s;
}

.smooth-row button:hover {
  background: rgba(56, 189, 248, 0.1) !important;
}

.smooth-save-btn {
  background: linear-gradient(90deg, #0ea5e9, #3b82f6) !important;
  border: none !important;
  color: white !important;
  border-radius: 12px !important;
  padding: 14px 28px !important;
  font-size: 1.1rem !important;
  font-weight: 600 !important;
  box-shadow: 0 4px 15px rgba(14, 165, 233, 0.4) !important;
  transition: all 0.3s ease !important;
  width: 100%;
}

.smooth-save-btn:hover {
  transform: translateY(-2px) !important;
  box-shadow: 0 8px 25px rgba(14, 165, 233, 0.5) !important;
}

.genesis-gradient-btn {
  background: linear-gradient(90deg, #10b981, #059669);
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}
.genesis-gradient-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(16, 185, 129, 0.3);
}

.genesis-outline-btn {
  background: transparent;
  color: #e4e4e7;
  border: 1px solid rgba(255, 255, 255, 0.2);
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}
.genesis-outline-btn:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.4);
}
`;

if (!css.includes('Fase 2: Dark Premium Glassmorphism Settings Design')) {
    fs.writeFileSync(cssPath, css + '\\n' + premiumCss);
    console.log('CSS appended.');
}
