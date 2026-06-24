const fs = require('fs');
let c = fs.readFileSync('src/pages/Dashboard.jsx', 'utf8');
let idx = c.indexOf('id="brackets"');
if(idx === -1) {
    console.log('Not found');
} else {
    console.log(c.substring(idx - 100, idx + 1000));
}
