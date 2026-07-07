const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, 'src', 'index.css');
let cssContent = fs.readFileSync(cssPath, 'utf8');

// Use regex to replace .bracket-schedule
const bracketScheduleRegex = /\.bracket-schedule\s*\{[^}]+\}/;
const newBracketSchedule = `.bracket-schedule {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  background: rgba(30, 41, 59, 0.35); /* Glassmorphism base */
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.05), 0 8px 32px rgba(0, 0, 0, 0.15);
  padding: 1.25rem;
  margin-bottom: 1.5rem;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.bracket-schedule:hover {
  background: rgba(30, 41, 59, 0.45);
  border-color: rgba(255, 255, 255, 0.1);
}`;

if (bracketScheduleRegex.test(cssContent)) {
    cssContent = cssContent.replace(bracketScheduleRegex, newBracketSchedule);
    console.log('Replaced .bracket-schedule');
}

// Use regex to replace .schedule-manual-item
const scheduleManualItemRegex = /\.schedule-manual-item\s*\{[^}]+\}/;
const newScheduleItem = `.schedule-manual-item {
  position: relative;
  border: 1px solid rgba(255, 255, 255, 0.03);
  border-radius: 12px;
  background: linear-gradient(145deg, rgba(30, 41, 59, 0.6) 0%, rgba(15, 23, 42, 0.8) 100%);
  padding: 1rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  overflow: hidden;
  transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.schedule-manual-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  border-color: rgba(255, 255, 255, 0.1);
}

.schedule-manual-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  width: 4px;
  background: var(--primary);
  box-shadow: 0 0 10px var(--primary);
  opacity: 0.8;
  transition: opacity 0.3s ease;
}

.schedule-manual-item:hover::before {
  opacity: 1;
}

.schedule-manual-item[data-type="FIGHT"]::before {
  background: #3b82f6;
  box-shadow: 0 0 12px #3b82f6;
}
.schedule-manual-item[data-type="FIGHT"]:hover {
  border-right: 1px solid rgba(59, 130, 246, 0.3);
}

.schedule-manual-item[data-type="BREAK"]::before {
  background: #f59e0b;
  box-shadow: 0 0 12px #f59e0b;
}
.schedule-manual-item[data-type="BREAK"]:hover {
  border-right: 1px solid rgba(245, 158, 11, 0.3);
}

.schedule-manual-item[data-type="CEREMONY"]::before {
  background: #8b5cf6;
  box-shadow: 0 0 12px #8b5cf6;
}
.schedule-manual-item[data-type="CEREMONY"]:hover {
  border-right: 1px solid rgba(139, 92, 246, 0.3);
}

.schedule-manual-item[data-type="OTHER"]::before {
  background: #06b6d4;
  box-shadow: 0 0 12px #06b6d4;
}
.schedule-manual-item[data-type="OTHER"]:hover {
  border-right: 1px solid rgba(6, 182, 212, 0.3);
}`;

if (scheduleManualItemRegex.test(cssContent)) {
    cssContent = cssContent.replace(scheduleManualItemRegex, newScheduleItem);
    console.log('Replaced .schedule-manual-item');
}

fs.writeFileSync(cssPath, cssContent, 'utf8');
console.log('Done CSS modifications!');
