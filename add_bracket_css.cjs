const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, 'src', 'index.css');
let cssContent = fs.readFileSync(cssPath, 'utf8');

const overridingStyles = `
/* Modern Bracket Drag and Drop Overhaul */
.bracket-card {
    background: linear-gradient(145deg, rgba(20, 25, 40, 0.7) 0%, rgba(10, 14, 24, 0.9) 100%) !important;
    border: 1px solid rgba(255, 255, 255, 0.1) !important;
    border-radius: 16px !important;
    box-shadow: 0 10px 30px rgba(0,0,0,0.4) !important;
    backdrop-filter: blur(10px);
}

.bracket-match {
    background: rgba(0, 0, 0, 0.3) !important;
    border: 1px solid rgba(255, 255, 255, 0.05) !important;
    border-radius: 12px !important;
    padding: 0 !important;
    overflow: hidden;
    position: relative;
    box-shadow: inset 0 2px 10px rgba(0,0,0,0.5);
    margin-bottom: 12px;
}

.bracket-match__index {
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 0.65rem;
    color: rgba(255,255,255,0.2);
    font-weight: 900;
}

.bracket-seed {
    padding: 12px 16px !important;
    display: flex;
    flex-direction: column;
    justify-content: center;
    border-bottom: 1px solid rgba(255,255,255,0.05) !important;
    transition: all 0.2s ease;
    cursor: grab;
    position: relative;
}

.bracket-seed:last-child {
    border-bottom: none !important;
}

.bracket-seed:hover {
    background: rgba(255,255,255,0.05);
}

.bracket-seed.is-dragging {
    opacity: 0.4;
}

.bracket-seed::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 4px;
    background: #3b82f6; /* Default Blue */
}

.bracket-seed:last-of-type::before {
    background: #ef4444; /* Red for 2nd slot */
}

.bracket-seed__name {
    font-size: 0.9rem !important;
    font-weight: 700 !important;
    color: #fff !important;
}

.bracket-seed__academy {
    font-size: 0.7rem !important;
    color: rgba(255,255,255,0.5) !important;
}

.bracket-vs {
    display: none !important; /* Hide old vs tag */
}

/* Podium Drop Zones */
.bracket-podium {
    display: flex !important;
    flex-direction: column;
    gap: 1rem !important;
    background: transparent !important;
    border: none !important;
    padding: 0 !important;
}

.bracket-podium-zone {
    display: flex;
    align-items: center;
    background: rgba(0, 0, 0, 0.4);
    border: 2px dashed rgba(255,255,255,0.1);
    border-radius: 12px;
    padding: 12px;
    gap: 16px;
    transition: all 0.3s ease;
    min-height: 70px;
}

.bracket-podium-zone.is-drag-over {
    background: rgba(59, 130, 246, 0.2);
    border-color: #3b82f6;
    transform: scale(1.02);
}

.bracket-podium-zone.filled {
    border-style: solid;
    border-color: rgba(255,255,255,0.15);
    background: rgba(255,255,255,0.03);
}

.podium-medal {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 800;
    font-size: 1.2rem;
    box-shadow: 0 4px 10px rgba(0,0,0,0.5);
    flex-shrink: 0;
}

.podium-medal.gold {
    background: linear-gradient(135deg, #FFD700 0%, #D4AF37 100%);
    color: #4A3C00;
    text-shadow: 0 1px 0 rgba(255,255,255,0.5);
}
.podium-medal.silver {
    background: linear-gradient(135deg, #E0E0E0 0%, #BDBDBD 100%);
    color: #424242;
}
.podium-medal.bronze {
    background: linear-gradient(135deg, #CD7F32 0%, #A0522D 100%);
    color: #3E1E08;
}

.podium-athlete-info {
    flex: 1;
    display: flex;
    flex-direction: column;
}
.podium-athlete-name {
    font-size: 1rem;
    font-weight: 700;
    color: #fff;
}
.podium-athlete-academy {
    font-size: 0.75rem;
    color: var(--muted-strong);
}

.podium-empty-text {
    font-size: 0.85rem;
    color: var(--muted);
    font-style: italic;
    pointer-events: none;
}
`;

if (!cssContent.includes('Modern Bracket Drag and Drop Overhaul')) {
    cssContent += overridingStyles;
    fs.writeFileSync(cssPath, cssContent, 'utf8');
    console.log('Added modern bracket styles to index.css');
} else {
    console.log('Modern bracket styles already present.');
}
