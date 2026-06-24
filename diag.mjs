import fs from 'fs';
const file = 'src/components/TournamentRegistrationFlow.jsx';
const buf = fs.readFileSync(file);
let c = buf.toString('latin1');  // read as latin1 to see raw bytes

// Map all the broken sequences to correct UTF-8 equivalents
const repairs = [
  // irÃÂ¡ → irá (triple-encoded)
  ['ir\xc3\xc2\xa1', 'ir\xc3\xa1'],    // irÃÂ¡ → irá
  // Ã· → ·
  ['\xc3\xb7', '\xc2\xb7'],
  // AVAN\xc3\x87AR
  ['AVAN\xc3\x87AR', 'AVAN\xc3\x87AR'],
  // Inscri\xc3\xa7\xc3\xa3o
];

// Better approach: decode as latin1, re-encode fixing mojibake
// The file has some UTF-8 content and some Latin1 content mixed
// Let's use a different strategy: read as utf8, find broken chars, fix them

let cu = fs.readFileSync(file, 'utf8');

// These are the actual broken strings we see in the file
const textFixes = [
  ['irÃÂ¡', 'irá'],
  ['Ã·', '·'],
  ['ÃÂ¡', 'á'],
  ['ÃÂ£', 'ã'],
  ['ÃÂ§', 'ç'],
  ['ÃÂ©', 'é'],
  ['ÃÂ³', 'ó'],
  ['ÃÂº', 'ú'],
  ['ÃÂ', 'Á'],
];

textFixes.forEach(([bad, good]) => {
  while (cu.includes(bad)) cu = cu.split(bad).join(good);
});

console.log('Sample lines 917:', cu.split('\n')[916]);
console.log('Sample lines 956:', cu.split('\n')[955]);
console.log('Done');
