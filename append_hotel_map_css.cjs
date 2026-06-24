const fs = require('fs');
const path = require('path');
const cssPath = path.join(__dirname, 'src', 'index.css');
let css = fs.readFileSync(cssPath, 'utf8');

const newCss = `
/* ========================================================
   Hotel Map Preview & Accommodation Cards
======================================================== */

.sc-location-page {
  padding: 0 24px 40px;
}

.sc-hotel-map-btn {
  display: block;
  text-decoration: none;
  border-radius: 12px;
  overflow: hidden;
  position: relative;
  margin-bottom: 24px;
  transition: transform 0.2s, box-shadow 0.2s;
}
.sc-hotel-map-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
}

.sc-hotel-map-preview {
  width: 100%;
  height: 340px;
  background: linear-gradient(135deg, #1a2a1a 0%, #2d4a2d 30%, #1a3a2a 60%, #2a3d1a 100%);
  position: relative;
  overflow: hidden;
}

/* Simulated map grid lines */
.sc-hotel-map-preview::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px);
  background-size: 60px 60px;
}

/* Simulated roads */
.sc-hotel-map-preview::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255,255,255,0.08) 2px, transparent 2px),
    linear-gradient(90deg, rgba(255,255,255,0.08) 2px, transparent 2px),
    linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
    linear-gradient(150deg, rgba(255,255,255,0.06) 2px, transparent 2px);
  background-size: 180px 180px, 200px 200px, 90px 90px, 250px 250px;
}

.sc-hotel-map-pins {
  position: absolute;
  inset: 0;
  z-index: 2;
}

.sc-pin {
  position: absolute;
  background-color: #dc2626;
  color: white;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 4px 8px;
  border-radius: 4px;
  white-space: nowrap;
  box-shadow: 0 2px 6px rgba(0,0,0,0.5);
  animation: pin-pulse 3s ease-in-out infinite;
}
.sc-pin::after {
  content: '';
  position: absolute;
  bottom: -5px;
  left: 50%;
  transform: translateX(-50%);
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-top: 5px solid #dc2626;
}

.sc-pin--selected {
  background-color: #1e3a8a;
  font-size: 0.875rem;
  padding: 6px 12px;
  z-index: 3;
  transform: scale(1.1);
}
.sc-pin--selected::after {
  border-top-color: #1e3a8a;
}

@keyframes pin-pulse {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
}

.sc-hotel-map-overlay {
  position: absolute;
  inset: 0;
  z-index: 4;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(2px);
  transition: background 0.2s;
}
.sc-hotel-map-btn:hover .sc-hotel-map-overlay {
  background: rgba(0, 0, 0, 0.3);
}

.sc-hotel-map-cta-text {
  display: flex;
  align-items: center;
  gap: 10px;
  background-color: #3b82f6;
  color: white;
  padding: 14px 24px;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 700;
  box-shadow: 0 4px 20px rgba(59, 130, 246, 0.5);
  transition: background-color 0.2s, transform 0.2s;
}
.sc-hotel-map-btn:hover .sc-hotel-map-cta-text {
  background-color: #2563eb;
  transform: scale(1.03);
}

.sc-hotel-map-sub {
  color: rgba(255,255,255,0.8);
  font-size: 0.875rem;
  margin: 10px 0 0;
  text-align: center;
}

/* Accommodation Cards Grid */
.sc-accom-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
}

.sc-accom-card {
  display: flex;
  align-items: center;
  gap: 16px;
  background-color: #27272a;
  border: 1px solid #3f3f46;
  border-radius: 10px;
  padding: 16px 20px;
  text-decoration: none;
  color: #e4e4e7;
  transition: background-color 0.2s, border-color 0.2s, transform 0.15s;
}
.sc-accom-card:hover {
  background-color: #3f3f46;
  border-color: #52525b;
  transform: translateY(-2px);
}

.sc-accom-card__logo {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.sc-accom-card__logo--airbnb { background-color: #ff385c; color: #fff; }
.sc-accom-card__logo--booking { background-color: #003580; color: #fff; }
.sc-accom-card__logo--hotels { background-color: #c8102e; color: #fff; }
.sc-accom-card__logo--maps { background-color: #4285f4; color: #fff; }

.sc-accom-card__info {
  flex: 1;
}
.sc-accom-card__name {
  font-weight: 700;
  font-size: 0.9375rem;
  margin-bottom: 2px;
}
.sc-accom-card__desc {
  font-size: 0.8125rem;
  color: #a1a1aa;
}
.sc-accom-card__arrow {
  font-size: 1.25rem;
  color: #71717a;
  transition: color 0.2s, transform 0.2s;
}
.sc-accom-card:hover .sc-accom-card__arrow {
  color: #e4e4e7;
  transform: translateX(4px);
}
`;

if (!css.includes('Hotel Map Preview & Accommodation Cards')) {
  fs.writeFileSync(cssPath, css + '\n' + newCss);
  console.log('Hotel map CSS added.');
} else {
  console.log('CSS already exists.');
}
