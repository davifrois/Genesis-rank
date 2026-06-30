const fs = require('fs');
let code = fs.readFileSync('src/services/publicRegistrationService.js', 'utf8');

// Normalize line endings for regex matching
code = code.replace(/\r\n/g, '\n');

// 1. Add import
if (!code.includes('import localforage')) {
    code = code.replace("import { authService } from './authService';", "import { authService } from './authService';\nimport localforage from 'localforage';");
}

// 2. Replace readPendingRegistrations
const read_impl = `const readPendingRegistrations = async () => {
  try {
    const parsed = await localforage.getItem(LOCAL_PENDING_REGISTRATIONS_KEY);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => item && typeof item === 'object');
  } catch {
    return [];
  }
};`;
code = code.replace(/const readPendingRegistrations = \(\) => \{[\s\S]*?\n\};/, read_impl);

// 3. Replace writePendingRegistrations
const write_impl = `const writePendingRegistrations = async (items) => {
  try {
    await localforage.setItem(LOCAL_PENDING_REGISTRATIONS_KEY, items);
    return true;
  } catch {
    return false;
  }
};`;
code = code.replace(/const writePendingRegistrations = \(items\) => \{[\s\S]*?\n\};/, write_impl);

// 4. Remove sanitizePayloadForOfflineQueue
code = code.replace(/const sanitizePayloadForOfflineQueue = \(payload\) => \{[\s\S]*?\n\};\n*/, '');

// 5. Update appendPendingRegistration
const append_impl = `const appendPendingRegistration = async (payload, lastError = '', lastTraceId = '') => {
  const clientRequestId = (payload?.clientRequestId || '').toString().trim();
  const existing = await readPendingRegistrations();
  const pending = existing.filter((item) => {
    if (!clientRequestId) return true;
    const existingClientRequestId = (item?.payload?.clientRequestId || '').toString().trim();
    return existingClientRequestId !== clientRequestId;
  });
  const fullRecord = buildPendingRegistration(payload, lastError, lastTraceId);
  const nextWithFullPayload = [fullRecord, ...pending].slice(0, 100);

  await writePendingRegistrations(nextWithFullPayload);
  return fullRecord;
};`;
code = code.replace(/const appendPendingRegistration = \(payload, lastError = '', lastTraceId = ''\) => \{[\s\S]*?\n\};/, append_impl);

// 6. Update flushPendingRegistrations
code = code.replace('const flushPendingRegistrations = async () => {', 'const flushPendingRegistrations = async () => {');
code = code.replace('const pending = readPendingRegistrations();', 'const pending = await readPendingRegistrations();');
code = code.replace('writePendingRegistrations(pendingAfterLoop);', 'await writePendingRegistrations(pendingAfterLoop);');

// 7. Update listPendingRows
code = code.replace("const listPendingRows = (eventId = '') => {", "const listPendingRows = async (eventId = '') => {");
code = code.replace('const pending = readPendingRegistrations();', 'const pending = await readPendingRegistrations();');

// 8. Update async calls
code = code.replace('const pendingRecord = appendPendingRegistration(', 'const pendingRecord = await appendPendingRegistration(');
code = code.replace('const pendingRows = listPendingRows(eventId);', 'const pendingRows = await listPendingRows(eventId);');
code = code.replace('const pendingRows = listPendingRows(eventId);', 'const pendingRows = await listPendingRows(eventId);');

code = code.replace("const pending = readPendingRegistrations();", "const pending = await readPendingRegistrations();");
code = code.replace("const pending = readPendingRegistrations();", "const pending = await readPendingRegistrations();");
code = code.replace("const pending = readPendingRegistrations();", "const pending = await readPendingRegistrations();");
code = code.replace("const pending = readPendingRegistrations();", "const pending = await readPendingRegistrations();");
code = code.replace("const pending = readPendingRegistrations();", "const pending = await readPendingRegistrations();");
code = code.replace("const pending = readPendingRegistrations();", "const pending = await readPendingRegistrations();");
code = code.replace("const pending = readPendingRegistrations();", "const pending = await readPendingRegistrations();");

code = code.replace('if (writePendingRegistrations(newPending)) {', 'if (await writePendingRegistrations(newPending)) {');

// 9. Update toPendingRegistrationRow
code = code.replace("notes: payload.notes || '',", "notes: payload.notes || '',\n    price: payload.price || 0,");

// Restore Windows CRLF
code = code.replace(/\n/g, '\r\n');

fs.writeFileSync('src/services/publicRegistrationService.js', code);
console.log('Patched correctly');
