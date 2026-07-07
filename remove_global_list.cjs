const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'Athletes.jsx');
let content = fs.readFileSync(filePath, 'utf8');

const startMarker = '{/* GLOBAL LIST */}';
const startIndex = content.indexOf(startMarker);

if (startIndex !== -1) {
    const regex = /    <\/div>\s*\);\s*\};\s*export default Athletes;/;
    const endMatch = content.match(regex);
    if (endMatch) {
        const newContent = content.substring(0, startIndex) + endMatch[0];
        fs.writeFileSync(filePath, newContent, 'utf8');
        console.log("Global list removed successfully.");
    } else {
        console.log("Could not find end match.");
    }
} else {
    console.log("Could not find start marker.");
}
