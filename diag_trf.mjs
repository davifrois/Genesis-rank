// Diagnose exact byte representation of garbled text
import { readFileSync } from 'fs';

const content = readFileSync('./src/components/TournamentRegistrationFlow.jsx');

// Find the garbled string and show its raw bytes
const searchStr = 'inscrição';
// Try to find it in different encodings
let idx = -1;

// Scan for 'inscri' which should be ASCII
const ascii = Buffer.from('inscri');
for (let i = 0; i < content.length - ascii.length; i++) {
  let match = true;
  for (let j = 0; j < ascii.length; j++) {
    if (content[i+j] !== ascii[j]) { match = false; break; }
  }
  if (match) {
    console.log(`Found 'inscri' at offset ${i}:`);
    const slice = content.slice(i, i + 20);
    console.log('  Hex:', [...slice].map(b => b.toString(16).padStart(2,'0')).join(' '));
    console.log('  Latin1:', slice.toString('latin1'));
    console.log('  UTF8 attempt:', (() => { try { return slice.toString('utf8'); } catch(e) { return '(invalid)'; }})());
    console.log();
    if (++idx > 5) break;
  }
}
