const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'index.css');
let content = fs.readFileSync(filePath, 'utf8');

const newStyles = `
/* Dashboard Stat Cards Colored Modifiers */
.stat-card--users .stat-card__icon { color: #3b82f6 !important; }
.stat-card--users { border-bottom: 3px solid #3b82f6 !important; }

.stat-card--points .stat-card__icon { color: #f59e0b !important; }
.stat-card--points { border-bottom: 3px solid #f59e0b !important; }

.stat-card--events .stat-card__icon { color: #10b981 !important; }
.stat-card--events { border-bottom: 3px solid #10b981 !important; }

.stat-card--records .stat-card__icon { color: #8b5cf6 !important; }
.stat-card--records { border-bottom: 3px solid #8b5cf6 !important; }
`;

if (!content.includes('.stat-card--users')) {
    content += newStyles;
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('index.css updated with colored stat card modifiers!');
} else {
    console.log('Modifiers already present.');
}
