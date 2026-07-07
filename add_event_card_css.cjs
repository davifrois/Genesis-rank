const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, 'src', 'index.css');
let cssContent = fs.readFileSync(cssPath, 'utf8');

// Replace old event-card styles with new modern ones
const oldStylesRegex = /\.event-card \{[\s\S]*?\.event-card__footer \{[\s\S]*?\}/;
// Actually regex replace is risky, I will just append the overriding CSS with !important
const overridingStyles = `
/* Modern Event Card Redesign */
.event-card {
    background: linear-gradient(145deg, rgba(22, 28, 45, 0.9) 0%, rgba(11, 15, 25, 0.9) 100%) !important;
    border-radius: 16px !important;
    padding: 0 !important;
    border: 1px solid rgba(255, 255, 255, 0.08) !important;
    display: flex !important;
    flex-direction: column !important;
    gap: 0 !important;
    overflow: hidden;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5) !important;
    transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease !important;
}

.event-card:hover {
    transform: translateY(-5px) !important;
    box-shadow: 0 15px 40px rgba(0, 0, 0, 0.7) !important;
    border-color: rgba(66, 133, 244, 0.5) !important;
}

.event-card__poster {
    width: 100% !important;
    aspect-ratio: 16 / 9 !important;
    border-radius: 0 !important;
    border: none !important;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
    position: relative;
}

.event-card__status-badge {
    position: absolute;
    top: 12px;
    right: 12px;
    z-index: 2;
    box-shadow: 0 4px 12px rgba(0,0,0,0.5);
}

.event-card__content {
    padding: 1.2rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.event-card__header {
    gap: 0 !important;
}

.event-card .event-name {
    font-size: 1.15rem !important;
    margin-bottom: 0.2rem;
    color: #fff;
}

.event-card .table-meta {
    font-size: 0.75rem;
    color: var(--muted-strong);
}

.event-card__stats {
    gap: 1rem !important;
    background: rgba(0, 0, 0, 0.2);
    padding: 0.8rem;
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.03);
}

.event-card__footer {
    display: flex !important;
    flex-direction: column !important;
    gap: 0.5rem !important;
}

.event-card__footer .btn {
    width: 100%;
    justify-content: center;
}
`;

if (!cssContent.includes('Modern Event Card Redesign')) {
    cssContent += overridingStyles;
    fs.writeFileSync(cssPath, cssContent, 'utf8');
    console.log('Added modern event card styles to index.css');
} else {
    console.log('Modern event card styles already present.');
}
