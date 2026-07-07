const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, 'src', 'pages', 'RankingAjp.css');
const newCSS = `

/* CATEGORY CARDS - AJP STYLE */
.ajp-category-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 32px;
    padding: 0 40px 40px;
    max-width: 1400px;
    margin: 0 auto;
}

@media (max-width: 900px) {
    .ajp-category-grid {
        grid-template-columns: 1fr;
        padding: 0 20px 40px;
    }
}

.ajp-category-card {
    background-color: #333333;
    border-radius: 8px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
}

.ajp-category-header {
    background-color: #555555;
    padding: 16px;
    text-align: center;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.ajp-category-title {
    margin: 0;
    font-size: 1rem;
    font-weight: 700;
    color: #ffffff;
    line-height: 1.4;
}

.ajp-category-subtitle {
    margin: 4px 0 0;
    font-size: 0.65rem;
    color: #cccccc;
    text-transform: uppercase;
}

.ajp-category-body {
    display: flex;
    flex-direction: column;
    padding: 12px 0;
}

.ajp-category-row {
    display: flex;
    align-items: center;
    padding: 12px 16px;
    text-decoration: none;
    color: inherit;
    transition: background-color 0.2s;
}

.ajp-category-row:hover {
    background-color: rgba(255, 255, 255, 0.05);
}

.ajp-category-rank {
    font-size: 0.9rem;
    font-weight: 700;
    color: #ffffff;
    width: 24px;
    flex-shrink: 0;
}

.ajp-category-avatar {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background-color: #444;
    overflow: hidden;
    margin-right: 12px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
}

.ajp-category-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.ajp-category-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
    overflow: hidden;
}

.ajp-category-name {
    font-size: 0.85rem;
    font-weight: 700;
    color: #ffffff;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    text-transform: uppercase;
}

.ajp-category-country {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.75rem;
    color: #aaaaaa;
}

.ajp-category-stats {
    display: flex;
    gap: 16px;
    align-items: flex-end;
    margin-left: 12px;
}

.ajp-stat-col {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
}

.ajp-stat-val {
    font-size: 0.9rem;
    font-weight: 800;
}

.ajp-stat-val.blue { color: #3b82f6; }
.ajp-stat-val.green { color: #10b981; }
.ajp-stat-val.red { color: #ef4444; }
.ajp-stat-val.gold { color: #fbbf24; }
.ajp-stat-val.silver { color: #9ca3af; }
.ajp-stat-val.bronze { color: #b45309; }

.ajp-stat-label {
    font-size: 0.65rem;
    color: #888888;
    text-transform: uppercase;
}

.ajp-category-footer {
    padding: 12px;
    background-color: #444444;
    text-align: center;
    border-top: 1px solid rgba(255, 255, 255, 0.05);
    cursor: pointer;
    transition: background-color 0.2s;
    font-size: 0.85rem;
    font-weight: 600;
    color: #ffffff;
}

.ajp-category-footer:hover {
    background-color: #555555;
}

.ajp-empty-state {
    padding: 30px;
    text-align: center;
    color: #aaaaaa;
    font-size: 0.9rem;
}
`;

fs.appendFileSync(cssPath, newCSS, 'utf8');
console.log("CSS appended.");
