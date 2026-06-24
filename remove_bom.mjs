import fs from 'fs';
const file = 'src/components/TournamentRegistrationFlow.jsx';
let content = fs.readFileSync(file, 'utf8');

if (content.charCodeAt(0) === 0xFEFF) {
  content = content.slice(1);
  fs.writeFileSync(file, content, 'utf8');
  console.log('BOM removed successfully.');
} else {
  // Try another approach if node's utf8 read didn't expose the BOM
  const buf = fs.readFileSync(file);
  if (buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF) {
    fs.writeFileSync(file, buf.slice(3));
    console.log('BOM removed successfully from buffer.');
  } else {
    console.log('No BOM found.');
  }
}
