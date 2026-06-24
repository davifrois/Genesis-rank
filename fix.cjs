const fs = require('fs');
let c = fs.readFileSync('src/pages/Dashboard.jsx', 'utf8');
let matches = c.match(/.{0,20}Ã.{0,20}/g);
if (matches) {
  let unique = Array.from(new Set(matches));
  console.log(unique.join('\n'));
} else {
  console.log('No matches');
}
