const fs = require('fs');
const path = require('path');
const cssPath = path.join(__dirname, 'src', 'index.css');

let css = fs.readFileSync(cssPath, 'utf8');

const smoothcompCss = `
/* ========================================================
   Smoothcomp Style Event Details
======================================================== */
.sc-event-page {
  background-color: #111111;
  color: #ffffff;
  min-height: 100vh;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}

.sc-hero {
  background-color: #18181b; /* Slightly lighter than pure black */
  padding: 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #27272a;
}

.sc-hero-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.sc-hero-poster {
  width: 64px;
  height: 64px;
  border-radius: 4px;
  object-fit: cover;
}

.sc-hero-info h1 {
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0 0 4px 0;
  line-height: 1.2;
}

.sc-hero-info p {
  color: #a1a1aa;
  font-size: 0.875rem;
  margin: 0;
}

.sc-hero-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.sc-btn-icon {
  background-color: #27272a;
  border: 1px solid #3f3f46;
  color: #ffffff;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color 0.2s;
}

.sc-btn-icon:hover {
  background-color: #3f3f46;
}

.sc-btn-primary {
  background-color: #3b82f6; /* Register Blue */
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.sc-btn-primary:hover {
  background-color: #2563eb;
}

/* Tabs Navigation */
.sc-tabs-nav {
  background-color: #18181b;
  border-bottom: 1px solid #27272a;
  display: flex;
  padding: 0 24px;
  overflow-x: auto;
}

.sc-tab {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 20px;
  color: #a1a1aa;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  white-space: nowrap;
  transition: color 0.2s, border-bottom-color 0.2s;
}

.sc-tab:hover {
  color: #e4e4e7;
}

.sc-tab.active {
  color: #ffffff;
  border-bottom-color: #ffffff;
}

/* Sub-nav */
.sc-subnav {
  background-color: #1f1f22;
  padding: 12px 24px;
  display: flex;
  gap: 16px;
  border-bottom: 1px solid #27272a;
}

.sc-subtab {
  padding: 6px 16px;
  border-radius: 16px;
  font-size: 0.875rem;
  color: #a1a1aa;
  cursor: pointer;
}

.sc-subtab.active {
  background-color: #e4e4e7;
  color: #111111;
  font-weight: 600;
}

/* Content Area */
.sc-content {
  padding: 32px 24px;
  max-width: 1200px;
  margin: 0 auto;
}

/* Information Tab Layout */
.sc-info-layout {
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 24px;
}

@media (max-width: 768px) {
  .sc-info-layout {
    grid-template-columns: 1fr;
  }
}

.sc-card {
  background-color: #27272a;
  border-radius: 8px;
  overflow: hidden;
}

.sc-card-content {
  padding: 24px;
}

.sc-event-banner {
  width: 100%;
  aspect-ratio: 21/9;
  object-fit: cover;
  display: block;
}

.sc-info-main {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.sc-info-main h2 {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0 0 8px 0;
}

.sc-info-main p {
  color: #a1a1aa;
  line-height: 1.6;
  margin: 0;
}

.sc-dates-block {
  margin-bottom: 16px;
}

.sc-dates-block small {
  color: #a1a1aa;
  font-size: 0.75rem;
  display: block;
  margin-bottom: 4px;
}

.sc-dates-block span {
  font-weight: 600;
  font-size: 0.875rem;
}

/* Organizer Block */
.sc-organizer-header {
  padding: 16px;
  background-color: #1f1f22;
  border-bottom: 1px solid #3f3f46;
  font-weight: 600;
}

.sc-organizer-body {
  padding: 16px;
}

.sc-organizer-title {
  font-size: 1.125rem;
  font-weight: 700;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.sc-organizer-perk {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #a1a1aa;
  font-size: 0.875rem;
  margin-bottom: 12px;
}

.sc-organizer-perk-icon {
  color: #22c55e; /* Green check */
}

/* Athletes Tab */
.sc-section-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 24px;
}

.sc-filter-bar {
  display: flex;
  gap: 16px;
  background-color: #27272a;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 32px;
}

.sc-input {
  background-color: #18181b;
  border: 1px solid #3f3f46;
  color: #fff;
  padding: 10px 16px;
  border-radius: 4px;
  flex: 1;
  font-size: 0.875rem;
  outline: none;
}

.sc-input:focus {
  border-color: #3b82f6;
}

.sc-select {
  background-color: #18181b;
  border: 1px solid #3f3f46;
  color: #a1a1aa;
  padding: 10px 16px;
  border-radius: 4px;
  flex: 1;
  font-size: 0.875rem;
  outline: none;
  appearance: none;
}

/* Athlete Categories */
.sc-category-block {
  margin-bottom: 32px;
}

.sc-category-title {
  font-size: 1.25rem;
  font-weight: 700;
  margin-bottom: 8px;
}

.sc-category-meta {
  color: #a1a1aa;
  font-size: 0.875rem;
  margin-bottom: 8px;
}

.sc-category-link {
  color: #3b82f6;
  font-size: 0.875rem;
  text-decoration: none;
}

.sc-category-link:hover {
  text-decoration: underline;
}

/* Placeholder Views */
.sc-placeholder {
  color: #a1a1aa;
  font-size: 0.875rem;
  margin-top: 24px;
}

/* Results Tab */
.sc-results-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
}

.sc-btn-search {
  background-color: #0ea5e9; /* Light blue */
  color: white;
  border: none;
  padding: 8px 24px;
  border-radius: 4px;
  font-weight: 600;
  cursor: pointer;
}

.sc-btn-print {
  background-color: transparent;
  border: 1px solid #3f3f46;
  color: #fff;
  padding: 6px 16px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.875rem;
  cursor: pointer;
  float: right;
  margin-top: -48px; /* Alignment hack for the title */
}

.sc-medals-panel {
  background-color: #1f1f22;
  border-radius: 8px;
  padding: 24px;
  margin-top: 32px;
  text-align: center;
}

.sc-medals-title {
  font-weight: 700;
  margin-bottom: 16px;
  letter-spacing: 1px;
}

.sc-medals-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.sc-medal-box {
  padding: 16px;
  border-radius: 4px;
  font-weight: 700;
  color: #fff;
}

.sc-medal-gold { background-color: #eab308; }
.sc-medal-silver { background-color: #94a3b8; }
.sc-medal-bronze { background-color: #b45309; }

.sc-footer {
  text-align: center;
  padding: 32px;
  color: #a1a1aa;
  font-size: 0.875rem;
  border-top: 1px solid #27272a;
  margin-top: 64px;
}
`;

if (!css.includes('Smoothcomp Style Event Details')) {
  fs.writeFileSync(cssPath, css + '\\n' + smoothcompCss);
  console.log('Smoothcomp CSS added successfully.');
} else {
  console.log('Smoothcomp CSS already exists.');
}
