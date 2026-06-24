const fs = require('fs');
const path = require('path');
const cssPath = path.join(__dirname, 'src', 'index.css');

let css = fs.readFileSync(cssPath, 'utf8');

const newCss = `
/* ========================================================
   Smoothcomp Style - Information Tab Refinement
======================================================== */

.sc-info-page {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

/* Block 1: Banner + Batches */
.sc-info-top-block {
  display: flex;
  background-color: #27272a;
  border-radius: 8px;
  overflow: hidden;
}

@media (max-width: 768px) {
  .sc-info-top-block {
    flex-direction: column;
  }
}

.sc-info-banner-wrap {
  flex: 2.5;
  background-color: #18181b;
}

.sc-info-banner-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.sc-info-banner-placeholder {
  width: 100%;
  height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #71717a;
  font-size: 1.25rem;
}

.sc-info-batches {
  flex: 1;
  padding: 32px;
  background-color: #1f1f22;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.sc-batch-row {
  display: flex;
  flex-direction: column;
  margin-bottom: 24px;
}
.sc-batch-row:last-child {
  margin-bottom: 0;
}

.sc-batch-row--event-date {
  margin-top: 16px;
  padding-top: 24px;
  border-top: 1px solid #3f3f46;
}

.sc-batch-name {
  font-size: 0.875rem;
  color: #a1a1aa;
  margin-bottom: 4px;
}

.sc-batch-dates {
  font-size: 1rem;
  font-weight: 600;
  color: #ffffff;
}

.sc-batch-time {
  color: #71717a;
  font-size: 0.875rem;
  font-weight: normal;
}

/* Body: Main Col + Sidebar */
.sc-info-body {
  display: grid;
  grid-template-columns: 1fr 350px;
  gap: 24px;
}

@media (max-width: 992px) {
  .sc-info-body {
    grid-template-columns: 1fr;
  }
}

.sc-info-main-col {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.sc-info-block {
  background-color: #18181b;
  border-radius: 8px;
  padding: 24px;
}

.sc-event-description {
  color: #e4e4e7;
  line-height: 1.6;
}

/* Sidebar Styles */
.sc-sidebar {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.sc-sidebar-card {
  background-color: #27272a;
  border-radius: 8px;
  overflow: hidden;
}

.sc-sidebar-card__header {
  background-color: #1f1f22;
  padding: 16px 20px;
  font-weight: 700;
  font-size: 1.125rem;
  border-bottom: 1px solid #3f3f46;
}

.sc-sidebar-card__header--blue {
  color: #eff6ff;
  background-color: #1d4ed8;
  padding: 4px 12px;
  display: inline-block;
  margin: 12px 20px;
  border-radius: 4px;
}

.sc-sidebar-card__body {
  padding: 16px 20px;
}

.sc-sidebar-card__body--links,
.sc-sidebar-card__body--entries {
  padding: 0;
}

.sc-organizer-name {
  font-weight: 700;
  font-size: 1.125rem;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.sc-organizer-logo {
  width: 24px;
  height: 24px;
  border-radius: 50%;
}

.sc-organizer-perk {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.875rem;
  color: #a1a1aa;
  margin-bottom: 8px;
}
.sc-organizer-perk:last-child {
  margin-bottom: 0;
}

/* Contact Links */
.sc-contact-link {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  border-bottom: 1px solid #3f3f46;
  color: #e4e4e7;
  text-decoration: none;
  font-weight: 600;
  font-size: 0.875rem;
  transition: background-color 0.2s;
}
.sc-contact-link:last-child {
  border-bottom: none;
}
.sc-contact-link:hover {
  background-color: #3f3f46;
}

/* Location */
.sc-location-block {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  font-size: 0.875rem;
  line-height: 1.5;
}

/* Entries */
.sc-entry-row {
  display: flex;
  justify-content: space-between;
  padding: 12px 20px;
  border-bottom: 1px solid #3f3f46;
  font-size: 0.875rem;
}
.sc-entry-row:last-child {
  border-bottom: none;
}
.sc-entry-row span:last-child {
  color: #a1a1aa;
}

/* Cancel Policy */
.sc-cancel-row {
  display: flex;
  flex-direction: column;
}
.sc-cancel-label {
  font-weight: 600;
  font-size: 0.875rem;
  margin-bottom: 4px;
}
.sc-cancel-date {
  color: #a1a1aa;
  font-size: 0.75rem;
}
`;

if (!css.includes('Information Tab Refinement')) {
  fs.writeFileSync(cssPath, css + '\\n' + newCss);
  console.log('Phase 4 CSS added successfully.');
} else {
  console.log('Phase 4 CSS already exists.');
}
