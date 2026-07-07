const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, 'src', 'pages', 'AthletesAjp.css');
let cssContent = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, 'utf8') : '';

const newCss = `
/* --- NEW AJP STYLES FOR ATHLETES HEADER --- */
.athletes-ajp-header-section {
    background-color: #000000;
    background-image: linear-gradient(to bottom, rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.9)), url('../assets/jiu_jitsu_combat_bg.png');
    background-size: cover;
    background-position: center center;
    padding: 60px 40px 40px;
    margin-bottom: 0px;
    border-bottom: 1px solid #222;
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: flex-end;
    min-height: 250px;
}

.athletes-ajp-title {
    color: #ffffff;
    font-size: 2rem;
    font-weight: 800;
    margin-bottom: 20px;
    text-transform: uppercase;
    font-family: 'Inter', sans-serif;
    letter-spacing: 0.5px;
}

.athletes-ajp-title span.muted {
    color: #888888;
    font-weight: 600;
}

.athletes-ajp-filters-row {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    align-items: center;
    width: 100%;
    max-width: 1200px;
}

.athletes-ajp-input, .athletes-ajp-select {
    background-color: #ffffff;
    border: 1px solid #ccc;
    color: #333333;
    padding: 8px 12px;
    border-radius: 4px;
    font-size: 0.85rem;
    height: 38px;
    outline: none;
    font-family: 'Inter', sans-serif;
}

.athletes-ajp-input::placeholder {
    color: #888;
}

.athletes-ajp-input {
    flex: 1;
    min-width: 200px;
}

.athletes-ajp-select {
    min-width: 130px;
    cursor: pointer;
}

.athletes-ajp-btn-filter {
    background-color: #00a8e8;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 0 20px;
    height: 38px;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    text-transform: uppercase;
    transition: background-color 0.2s;
}
.athletes-ajp-btn-filter:hover {
    background-color: #008fcc;
}

.athletes-ajp-btn-share {
    background-color: #999999;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 0 15px;
    height: 38px;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    text-transform: uppercase;
    transition: background-color 0.2s;
}
.athletes-ajp-btn-share:hover {
    background-color: #888888;
}

/* TOP ATHLETES SECTION */
.athletes-ajp-top-section {
    background-color: #111111;
    padding: 50px 40px;
    color: #ffffff;
}

.athletes-ajp-top-title {
    text-align: center;
    font-size: 1.5rem;
    font-weight: 800;
    margin-bottom: 40px;
    text-transform: uppercase;
}
.athletes-ajp-top-title span.muted {
    color: #666666;
    font-weight: 700;
}

/* Ensure 3 columns grid matches Image 1 */
.athlete-community-columns {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
    max-width: 1200px;
    margin: 0 auto;
}

.athlete-community-column__head h3 {
    text-align: center;
    font-size: 0.9rem;
    font-weight: 700;
    color: #ffffff;
    text-transform: uppercase;
    margin-bottom: 15px;
}

.athlete-community-card {
    background-color: #2a2a2a;
    border-radius: 8px;
    padding: 10px 15px;
    margin-bottom: 10px;
    border: 1px solid #333;
}
.athlete-community-card__head {
    display: flex;
    align-items: center;
    gap: 15px;
}
.athlete-avatar {
    width: 45px;
    height: 45px;
    border-radius: 50%;
    object-fit: cover;
    border: 2px solid #444;
}
.athlete-info {
    display: flex;
    flex-direction: column;
}
.athlete-name-row {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
    font-size: 0.85rem;
    color: #ffffff;
    margin-bottom: 4px;
}
.athlete-name {
    color: #ffffff;
    text-decoration: none;
}
.athlete-stats {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 0.75rem;
    color: #aaaaaa;
}
.stat-badge {
    background-color: #444444;
    color: #ffffff;
    padding: 2px 6px;
    border-radius: 4px;
    font-weight: 600;
}
`;

if (!cssContent.includes('.athletes-ajp-header-section')) {
    fs.writeFileSync(cssPath, cssContent + '\\n' + newCss, 'utf8');
    console.log("CSS appended.");
} else {
    console.log("CSS already exists.");
}
