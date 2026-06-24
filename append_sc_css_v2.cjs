const fs = require('fs');
const path = require('path');
const cssPath = path.join(__dirname, 'src', 'index.css');

let css = fs.readFileSync(cssPath, 'utf8');

const newSmoothcompCss = `
/* ========================================================
   Smoothcomp Style - Phase 3 Updates
======================================================== */

.sc-hero-card {
  display: flex;
  flex-direction: row;
  background-color: #1f1f22; /* Darker background for the hero card */
  border: 1px solid #27272a;
}

@media (max-width: 768px) {
  .sc-hero-card {
    flex-direction: column;
  }
}

.sc-hero-banner-wrap {
  flex: 2;
  border-right: 1px solid #27272a;
}

.sc-hero-dates {
  flex: 1;
  padding: 24px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.sc-hero-dates .sc-dates-block {
  margin-bottom: 16px;
}
.sc-hero-dates .sc-dates-block:last-child {
  margin-bottom: 0;
}

.sc-time {
  color: #71717a;
  font-weight: normal;
  font-size: 0.75rem;
  margin-left: 4px;
}

.sc-highlight {
  background-color: #1e3a8a; /* Dark blue background */
  color: #eff6ff;
  padding: 2px 6px;
  border-radius: 4px;
  display: inline-block;
}

.sc-about-section {
  padding: 32px 0;
}

.sc-about-section h2 {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 12px;
}

.sc-about-text {
  color: #e4e4e7;
  line-height: 1.6;
  margin-bottom: 16px;
}

.sc-rating {
  font-size: 0.875rem;
  font-weight: 600;
  color: #e4e4e7;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.sc-stars {
  color: #eab308; /* Yellow */
}

.sc-points-list {
  list-style: none;
  padding: 0;
  margin: 0 0 16px 0;
}

.sc-points-list li {
  font-size: 0.875rem;
  color: #e4e4e7;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.sc-bonus-points {
  font-size: 0.875rem;
  color: #a1a1aa;
  margin-bottom: 24px;
}

.sc-divider {
  border: 0;
  border-top: 1px solid #3f3f46;
  margin: 24px 0;
}

.sc-about-section h3 {
  font-size: 1.125rem;
  font-weight: 700;
  margin-bottom: 16px;
  text-transform: uppercase;
}

.sc-trophy-list {
  list-style: none;
  padding: 0;
  margin: 0 0 24px 0;
}

.sc-trophy-list li {
  font-size: 0.875rem;
  color: #e4e4e7;
  margin-bottom: 12px;
  text-transform: uppercase;
}

.sc-info-sidebar {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.sc-card-header {
  padding: 16px 20px;
  background-color: #1f1f22;
  border-bottom: 1px solid #3f3f46;
  font-weight: 700;
  font-size: 1rem;
}

.sc-card-body {
  padding: 16px 20px;
  background-color: #27272a;
}

.sc-list-body {
  padding: 0;
}

.sc-list-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  border-bottom: 1px solid #3f3f46;
  color: #e4e4e7;
  text-decoration: none;
  font-size: 0.875rem;
  font-weight: 600;
  transition: background-color 0.2s;
}
.sc-list-item:last-child {
  border-bottom: none;
}
a.sc-list-item:hover {
  background-color: #3f3f46;
}

.sc-ml-auto {
  margin-left: auto;
  color: #a1a1aa;
}

.sc-location-item {
  align-items: flex-start;
  line-height: 1.5;
}

.sc-timezone {
  padding: 16px 20px;
  font-size: 0.75rem;
  color: #a1a1aa;
}
.sc-timezone small {
  display: block;
  margin-bottom: 4px;
}

.sc-price-item {
  justify-content: space-between;
  font-weight: normal;
}
.sc-price-item span:last-child {
  color: #a1a1aa;
}

.sc-highlight-blue {
  background-color: #1d4ed8;
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
}

.sc-policy-item {
  margin-bottom: 16px;
}
.sc-policy-item:last-child {
  margin-bottom: 0;
}
.sc-policy-item strong {
  display: block;
  font-size: 0.875rem;
  color: #e4e4e7;
  margin-bottom: 4px;
}
.sc-policy-item small {
  color: #a1a1aa;
  font-size: 0.75rem;
}
.sc-policy-expired strong, .sc-policy-expired small {
  color: #71717a;
}
`;

if (!css.includes('Smoothcomp Style - Phase 3 Updates')) {
  fs.writeFileSync(cssPath, css + '\\n' + newSmoothcompCss);
  console.log('Phase 3 CSS added successfully.');
} else {
  console.log('Phase 3 CSS already exists.');
}
