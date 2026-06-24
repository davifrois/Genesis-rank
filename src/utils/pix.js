const CRC16_POLY = 0x1021;

/**
 * Calculates CRC16 CCITT for a string
 */
function calculateCRC16(data) {
  let crc = 0xFFFF;
  for (let i = 0; i < data.length; i++) {
    let b = data.charCodeAt(i);
    for (let j = 0; j < 8; j++) {
      let bit = ((b >> (7 - j)) & 1) === 1;
      let c15 = ((crc >> 15) & 1) === 1;
      crc <<= 1;
      if (c15 ^ bit) crc ^= CRC16_POLY;
    }
  }
  crc &= 0xFFFF;
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function formatField(id, value) {
  const len = value.length.toString().padStart(2, '0');
  return `${id}${len}${value}`;
}

function normalizePixKey(key) {
  // Remove names in parentheses e.g. "594.343.682-00 (LEAN AUGUSTO)"
  let clean = key.replace(/\s*\(.*?\)\s*/g, '').trim();
  
  // Check if it's email
  if (clean.includes('@')) {
    return clean;
  }
  
  // Check if it's a UUID (Random Key)
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clean)) {
    return clean;
  }

  // Remove all non-numeric characters for phone/CPF/CNPJ check
  const digits = clean.replace(/\D/g, '');

  // CPF (11) or CNPJ (14)
  if (digits.length === 11 || digits.length === 14) {
    return digits; // purely numeric for CPF/CNPJ
  }

  // Phone (10 or 11 digits)
  if (digits.length >= 10 && digits.length <= 13) {
    // Phone must start with +55
    if (digits.startsWith('55')) {
      return '+' + digits;
    } else {
      return '+55' + digits;
    }
  }

  // Fallback to purely alphanumeric if unknown
  return clean.replace(/[^a-zA-Z0-9]/g, '');
}

/**
 * Generates the Pix Payload string
 */
export function generatePixPayload({ key, name, city, amount, reference = 'GENESIS' }) {
  // 00: Payload Format Indicator
  let payload = formatField('00', '01');

  // 26: Merchant Account Information
  const gui = formatField('00', 'br.gov.bcb.pix');
  const normalizedKey = normalizePixKey(key);
  const pixKey = formatField('01', normalizedKey);
  payload += formatField('26', gui + pixKey);

  // 52: Merchant Category Code
  payload += formatField('52', '0000');

  // 53: Transaction Currency (986 = BRL)
  payload += formatField('53', '986');

  // 54: Transaction Amount
  if (amount) {
    payload += formatField('54', Number(amount).toFixed(2));
  }

  // 58: Country Code
  payload += formatField('58', 'BR');

  // 59: Merchant Name
  payload += formatField('59', name.substring(0, 25).toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ""));

  // 60: Merchant City
  payload += formatField('60', city.substring(0, 15).toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ""));

  // 62: Additional Data Field
  const ref = formatField('05', reference.substring(0, 25).toUpperCase().replace(/\s/g, ''));
  payload += formatField('62', ref);

  // 63: CRC16
  payload += '6304';
  payload += calculateCRC16(payload);

  return payload;
}
