const fs = require('fs');

let code = fs.readFileSync('src/components/FilmmakerShowcase.jsx', 'utf-8');

const translations = `
  const { uiVariant } = useI18n();
  const copyByLanguage = {
    pt: {
      kicker: 'Genesis Filmmaker',
      topMessage: 'Seu campeonato merece uma filmagem de qualidade',
      title: 'GENESIS FILMMAKER',
      subtitle: 'Sua jornada no tatame merece ser imortalizada.',
      ctaLabel: 'SOLICITAR ORCAMENTO VIA WHATSAPP',
      creditPrefix: 'Filmado por',
      aftermovies: 'Aftermovies de eventos',
      entrance: 'Vdeos de entrada',
      highlights: 'Highlights de luta',
      athlete: 'Perfil de atleta',
      academy: 'Vdeos para academias',
      whatsappMessage: 'Olá, quero solicitar um orçamento com \.'
    },
    en: {
      kicker: 'Genesis Filmmaker',
      topMessage: 'Your championship deserves quality filming',
      title: 'GENESIS FILMMAKER',
      subtitle: 'Your journey on the mat deserves to be immortalized.',
      ctaLabel: 'REQUEST QUOTE VIA WHATSAPP',
      creditPrefix: 'Filmed by',
      aftermovies: 'Event Aftermovies',
      entrance: 'Entrance Videos',
      highlights: 'Fight Highlights',
      athlete: 'Athlete Profiles',
      academy: 'Academy Videos',
      whatsappMessage: 'Hello, I want to request a quote with \.'
    },
    es: {
      kicker: 'Genesis Filmmaker',
      topMessage: 'Tu campeonato merece una filmación de calidad',
      title: 'GENESIS FILMMAKER',
      subtitle: 'Tu viaje en el tatami merece ser inmortalizado.',
      ctaLabel: 'SOLICITAR PRESUPUESTO POR WHATSAPP',
      creditPrefix: 'Filmado por',
      aftermovies: 'Aftermovies de Eventos',
      entrance: 'Videos de Entrada',
      highlights: 'Highlights de Lucha',
      athlete: 'Perfiles de Atletas',
      academy: 'Videos para Academias',
      whatsappMessage: 'Hola, quiero solicitar un presupuesto con \.'
    },
    fr: {
      kicker: 'Genesis Filmmaker',
      topMessage: 'Votre championnat mérite un filmage de qualité',
      title: 'GENESIS FILMMAKER',
      subtitle: 'Votre parcours sur le tatami mérite d\\'être immortalisé.',
      ctaLabel: 'DEMANDER UN DEVIS VIA WHATSAPP',
      creditPrefix: 'Filmé par',
      aftermovies: 'Aftermovies d\\'Événements',
      entrance: 'Vidéos d\\'Entrée',
      highlights: 'Moments Forts du Combat',
      athlete: 'Profils d\\'Athlètes',
      academy: 'Vidéos pour Académies',
      whatsappMessage: 'Bonjour, je souhaite demander un devis avec \.'
    }
  };
  const copy = copyByLanguage[uiVariant] || copyByLanguage.pt;
`;

code = code.replace("import { Building2", "import { useI18n } from '../hooks/useI18n';\nimport { Building2");

// Replace the props with our new setup
code = code.replace(/const FilmmakerShowcase = \(\{[\s\S]*?\}\) => \{/, "const FilmmakerShowcase = ({\n  className = ''\n}) => {" + translations);

// Replace card label mapping
code = code.replace(/cards\.map\(\(card\) => \{/, "cards.map((card) => {\n          const labelDict = { hero: copy.aftermovies, entrance: copy.entrance, active: copy.highlights, athlete: copy.athlete, academy: copy.academy };\n          const translatedLabel = labelDict[card.key] || card.label;");
code = code.replace(/aria-label=\{card\.label\}/g, "aria-label={translatedLabel}");
code = code.replace(/title=\{card\.label\}/g, "title={translatedLabel}");
code = code.replace(/\{card\.label\}/g, "{translatedLabel}");

// Replace texts
code = code.replace("{kicker}", "{copy.kicker}");
code = code.replace("{topMessage}", "{copy.topMessage}");
code = code.replace("{title}", "{copy.title}");
code = code.replace("{subtitle}", "{copy.subtitle}");
code = code.replace("{ctaLabel}", "{copy.ctaLabel}");
code = code.replace("{credit}", "{`${copy.creditPrefix} \`}");

// Replace whatsapp string
code = code.replace(/whatsappMessage \|\| \`Olá, quero solicitar um orçamento com \$\{FILMMAKER_HANDLE\}\.\`/g, "copy.whatsappMessage");

fs.writeFileSync('src/components/FilmmakerShowcase.jsx', code);
console.log('Done modifying FilmmakerShowcase.jsx');
