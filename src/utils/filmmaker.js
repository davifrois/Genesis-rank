export const FILMMAKER_HANDLE = '@genesis_filmaker';
export const FILMMAKER_INSTAGRAM_USERNAME = 'genesis_filmaker';
export const FILMMAKER_INSTAGRAM_URL = `https://www.instagram.com/${FILMMAKER_INSTAGRAM_USERNAME}/`;
export const FILMMAKER_WHATSAPP_PHONE = '5531993383014';

const DEFAULT_QUOTE_MESSAGE =
  'Olá, quero solicitar um orçamento de filmagem para evento/atleta na Genesis Esportes.';

const trimValue = (value) => (value || '').toString().trim();

export const buildFilmmakerWhatsappLink = (message = DEFAULT_QUOTE_MESSAGE) => {
  const normalizedMessage = trimValue(message) || DEFAULT_QUOTE_MESSAGE;
  return `https://api.whatsapp.com/send?phone=${FILMMAKER_WHATSAPP_PHONE}&text=${encodeURIComponent(normalizedMessage)}`;
};

export const resolveAftermovieTarget = (event) => {
  const directUrl = [
    event?.aftermovieUrl,
    event?.afterMovieUrl,
    event?.highlightUrl,
    event?.recapUrl,
    event?.videoUrl
  ].find((value) => trimValue(value));

  if (directUrl) {
    return {
      external: true,
      href: trimValue(directUrl)
    };
  }

  const eventName = trimValue(event?.name) || 'evento Genesis';
  return {
    external: true,
    href: buildFilmmakerWhatsappLink(`Olá, quero assistir ao aftermovie do ${eventName}.`)
  };
};
