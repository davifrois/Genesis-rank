import fs from 'fs';
const file = 'src/components/TournamentRegistrationFlow.jsx';

// Read raw buffer and check actual bytes at the problematic location
const buf = fs.readFileSync(file);
const text = buf.toString('utf8');

const idx = text.indexOf('irÃÂ¡');
if (idx >= 0) {
  const slice = buf.slice(idx, idx + 20);
  console.log('Bytes around irÃÂ¡:', [...slice].map(b => b.toString(16).padStart(2,'0')).join(' '));
}

const idx2 = text.indexOf('Ã·');
if (idx2 >= 0) {
  const slice2 = buf.slice(idx2, idx2 + 6);
  console.log('Bytes around Ã·:', [...slice2].map(b => b.toString(16).padStart(2,'0')).join(' '));
}

// Try reading as latin1
const latin = buf.toString('latin1');
console.log('latin1 at irÃÂ¡ pos:', latin.substring(idx, idx+10));
