import re

with open('src/services/publicRegistrationService.js', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Add import
if 'import localforage' not in code:
    code = code.replace("import { authService } from './authService';", "import { authService } from './authService';\nimport localforage from 'localforage';")

# 2. Replace readPendingRegistrations
read_impl = """const readPendingRegistrations = async () => {
  try {
    const parsed = await localforage.getItem(LOCAL_PENDING_REGISTRATIONS_KEY);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => item && typeof item === 'object');
  } catch {
    return [];
  }
};"""
code = re.sub(r'const readPendingRegistrations = \(\) => \{.*?\n\};', read_impl, code, flags=re.DOTALL)

# 3. Replace writePendingRegistrations
write_impl = """const writePendingRegistrations = async (items) => {
  try {
    await localforage.setItem(LOCAL_PENDING_REGISTRATIONS_KEY, items);
    return true;
  } catch {
    return false;
  }
};"""
code = re.sub(r'const writePendingRegistrations = \(items\) => \{.*?\n\};', write_impl, code, flags=re.DOTALL)

# 4. Remove sanitizePayloadForOfflineQueue
code = re.sub(r'const sanitizePayloadForOfflineQueue = \(payload\) => \{.*?\n\};\n*', '', code, flags=re.DOTALL)

# 5. Update appendPendingRegistration
append_impl = """const appendPendingRegistration = async (payload, lastError = '', lastTraceId = '') => {
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
};"""
code = re.sub(r'const appendPendingRegistration = \(payload, lastError = \'\', lastTraceId = \'\'\) => \{.*?\n\};', append_impl, code, flags=re.DOTALL)

# 6. Update flushPendingRegistrations
code = code.replace('const flushPendingRegistrations = async () => {', 'const flushPendingRegistrations = async () => {')
code = code.replace('const pending = readPendingRegistrations();', 'const pending = await readPendingRegistrations();')
code = code.replace('writePendingRegistrations(pendingAfterLoop);', 'await writePendingRegistrations(pendingAfterLoop);')

# 7. Update listPendingRows
code = code.replace("const listPendingRows = (eventId = '') => {", "const listPendingRows = async (eventId = '') => {")
code = code.replace('const pending = readPendingRegistrations();', 'const pending = await readPendingRegistrations();')

# 8. Update async calls
code = code.replace('const pendingRecord = appendPendingRegistration(', 'const pendingRecord = await appendPendingRegistration(')
code = code.replace('const pendingRows = listPendingRows(eventId);', 'const pendingRows = await listPendingRows(eventId);')

code = code.replace("""if (normalizedId.startsWith('pending-')) {
      const pending = readPendingRegistrations();""", """if (normalizedId.startsWith('pending-')) {
      const pending = await readPendingRegistrations();""")
code = code.replace("""if (normalizedId.startsWith('pending-')) {\n      const pending = readPendingRegistrations();""", """if (normalizedId.startsWith('pending-')) {\n      const pending = await readPendingRegistrations();""")
code = code.replace("""if (normalizedId.startsWith('pending-')) {\r\n      const pending = readPendingRegistrations();""", """if (normalizedId.startsWith('pending-')) {\r\n      const pending = await readPendingRegistrations();""")

code = code.replace('if (writePendingRegistrations(newPending)) {', 'if (await writePendingRegistrations(newPending)) {')

# 9. Update toPendingRegistrationRow
code = code.replace("notes: payload.notes || '',", "notes: payload.notes || '',\n    price: payload.price || 0,")

# 10. Update scheduleNextSync and online listener
code = code.replace('const pending = readPendingRegistrations();', 'const pending = await readPendingRegistrations();')

with open('src/services/publicRegistrationService.js', 'w', encoding='utf-8') as f:
    f.write(code)

print('Patched successfully')
