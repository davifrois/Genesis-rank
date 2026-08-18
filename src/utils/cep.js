/**
 * Utility for Brazilian CEP formatting and ViaCEP address auto-fetch
 */

export const formatCep = (value = '') => {
  const digits = (value || '').toString().replace(/\D/g, '').slice(0, 8);
  if (digits.length > 5) {
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  }
  return digits;
};

export const fetchAddressByCep = async (cep = '') => {
  const digits = (cep || '').toString().replace(/\D/g, '');
  if (digits.length !== 8) return null;

  try {
    const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
    if (!response.ok) return null;
    const data = await response.json();
    if (data.erro) return null;

    const street = [data.logradouro, data.bairro].filter(Boolean).join(' - ');

    return {
      cep: data.cep || formatCep(digits),
      address: street,
      logradouro: data.logradouro || '',
      bairro: data.bairro || '',
      city: data.localidade || '',
      state: data.uf ? data.uf.toUpperCase() : '',
      country: 'Brasil'
    };
  } catch (error) {
    console.warn('Silent failure fetching ViaCEP address:', error);
    return null;
  }
};
