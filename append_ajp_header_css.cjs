const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, 'src', 'pages', 'RankingAjp.css');
const newCSS = `

/* PAGE CONTAINER & HEADER */
.ajp-page-container {
    background-color: #121212;
    min-height: 100vh;
    color: #ffffff;
    font-family: 'Inter', sans-serif;
    padding-bottom: 60px;
}

.ajp-header-section {
    background-color: #000000;
    padding: 30px 40px 0;
    margin-bottom: 40px;
    border-bottom: 1px solid #333;
}

.ajp-header-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    max-width: 1400px;
    margin: 0 auto 20px;
}

.ajp-header-title {
    font-size: 1.5rem;
    font-weight: 800;
    margin: 0;
    text-transform: uppercase;
}

.ajp-event-dropdown {
    background-color: #333;
    color: #fff;
    border: none;
    padding: 8px 16px;
    border-radius: 4px;
    font-size: 0.85rem;
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
}

.ajp-breadcrumb {
    max-width: 1400px;
    margin: 0 auto 30px;
    background-color: #222;
    padding: 12px 16px;
    border-radius: 4px;
    font-size: 0.75rem;
    color: #888;
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
}

.ajp-breadcrumb .bc-current {
    color: #ccc;
}

.ajp-gender-toggles {
    max-width: 1400px;
    margin: 0 auto;
    display: flex;
    gap: 16px;
    padding-bottom: 30px;
}

.ajp-gender-btn {
    background-color: transparent;
    color: #888;
    border: 1px solid #444;
    padding: 8px 24px;
    border-radius: 4px;
    font-size: 0.85rem;
    font-weight: 700;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: all 0.2s;
}

.ajp-gender-btn:hover {
    background-color: #222;
    color: #fff;
}

.ajp-gender-btn.active {
    background-color: #333;
    color: #fff;
    border-color: #555;
}
`;

fs.appendFileSync(cssPath, newCSS, 'utf8');
console.log("Header CSS appended.");
