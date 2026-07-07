const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, 'src', 'pages', 'RankingAjp.css');
let content = fs.readFileSync(cssPath, 'utf8');

const targetStr = `.ajp-header-section {
    background-color: #000000;
    background-image: linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.9)), url('../assets/jiu_jitsu_header_bg.png');
    background-size: cover;
    background-position: center 30%;
    padding: 30px 40px 0;
    margin-bottom: 40px;
    border-bottom: 1px solid #333;
    position: relative;
}`;

const replacement = `.ajp-header-section {
    background-color: #000000;
    background-image: linear-gradient(to bottom, rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.9)), url('../assets/jiu_jitsu_header_bg.png');
    background-size: cover;
    background-position: center 20%;
    padding: 30px 40px 0;
    margin-bottom: 40px;
    border-bottom: 1px solid #333;
    position: relative;
}`;

content = content.replace(targetStr, replacement);
fs.writeFileSync(cssPath, content, 'utf8');
console.log("Header CSS overlay updated.");
