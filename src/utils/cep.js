/**
 * Utility for Brazilian CEP formatting and multi-provider address auto-fetch
 * (ViaCEP with fallback to BrasilAPI and OpenCEP)
 */

export const formatCep = (value = '') => {
  const digits = (value || '').toString().replace(/\D/g, '').slice(0, 8);
  if (digits.length > 5) {
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  }
  return digits;
};

const fetchWithTimeout = async (url, timeoutMs = 4000) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
};

export const fetchAddressByCep = async (cep = '') => {
  const digits = (cep || '').toString().replace(/\D/g, '');
  if (digits.length !== 8) return null;

  // 1. Tentar ViaCEP
  try {
    const response = await fetchWithTimeout(`https://viacep.com.br/ws/${digits}/json/`, 3500);
    if (response.ok) {
      const data = await response.json();
      if (!data.erro) {
        const addressParts = [data.logradouro, data.bairro].filter(Boolean);
        const street = addressParts.join(' - ');

        return {
          cep: data.cep || formatCep(digits),
          address: street || data.logradouro || '',
          logradouro: data.logradouro || '',
          bairro: data.bairro || '',
          city: data.localidade || '',
          state: data.uf ? data.uf.toUpperCase().trim() : '',
          country: 'Brasil'
        };
      }
    }
  } catch (viaCepErr) {
    console.warn('ViaCEP falhou, tentando fallback BrasilAPI:', viaCepErr);
  }

  // 2. Fallback: BrasilAPI
  try {
    const response = await fetchWithTimeout(`https://brasilapi.com.br/api/cep/v1/${digits}`, 3500);
    if (response.ok) {
      const data = await response.json();
      const addressParts = [data.street, data.neighborhood].filter(Boolean);
      const street = addressParts.join(' - ');

      return {
        cep: formatCep(digits),
        address: street || data.street || '',
        logradouro: data.street || '',
        bairro: data.neighborhood || '',
        city: data.city || '',
        state: data.state ? data.state.toUpperCase().trim() : '',
        country: 'Brasil'
      };
    }
  } catch (brasilApiErr) {
    console.warn('BrasilAPI falhou, tentando fallback OpenCEP:', brasilApiErr);
  }

  // 3. Fallback: OpenCEP
  try {
    const response = await fetchWithTimeout(`https://opencep.com/v1/${digits}`, 3500);
    if (response.ok) {
      const data = await response.json();
      const addressParts = [data.logradouro, data.bairro].filter(Boolean);
      const street = addressParts.join(' - ');

      return {
        cep: formatCep(digits),
        address: street || data.logradouro || '',
        logradouro: data.logradouro || '',
        bairro: data.bairro || '',
        city: data.localidade || '',
        state: data.uf ? data.uf.toUpperCase().trim() : '',
        country: 'Brasil'
      };
    }
  } catch (openCepErr) {
    console.warn('Todos os provedores de CEP falharam:', openCepErr);
  }

  return null;
};
