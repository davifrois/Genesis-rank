import React from 'react';
import { useI18n } from '../hooks/useI18n';
import { Building2, Camera, Play, Sparkles, Trophy, User } from 'lucide-react';
import filmmakerPhotographer from '../../img/filmmaker-photographer.jfif';
import filmmakerVenue from '../../img/filmmaker-venue.jpg';
import filmmakerAthleteBlue from '../../img/filmmaker-athlete-blue.jpg';
import filmmakerMedal from '../../img/filmmaker-medal.jpg';
import filmmakerChampion from '../../img/filmmaker-champion.jpg';
import {
  buildFilmmakerWhatsappLink,
  FILMMAKER_HANDLE,
  FILMMAKER_INSTAGRAM_URL
} from '../utils/filmmaker';

const cardMediaByKey = {
  hero: {
    backgroundImage: `url(${filmmakerPhotographer})`,
    backgroundPosition: 'center 34%',
    backgroundSize: 'cover'
  },
  entrance: {
    backgroundImage: `url(${filmmakerVenue})`,
    backgroundPosition: 'center 58%',
    backgroundSize: 'cover'
  },
  active: {
    backgroundImage: `url(${filmmakerAthleteBlue})`,
    backgroundPosition: 'center 18%',
    backgroundSize: 'cover'
  },
  athlete: {
    backgroundImage: `url(${filmmakerChampion})`,
    backgroundPosition: 'center 22%',
    backgroundSize: 'cover'
  },
  academy: {
    backgroundImage: `url(${filmmakerMedal})`,
    backgroundPosition: 'center 42%',
    backgroundSize: 'cover'
  }
};

const cards = [
  {
    key: 'hero',
    area: 'hero',
    label: 'Aftermovies',
    icon: Camera,
    href: FILMMAKER_INSTAGRAM_URL
  },
  {
    key: 'entrance',
    area: 'entrance',
    label: 'Video de entrada',
    icon: Sparkles,
    href: 'https://www.instagram.com/reel/DPjdlYfkQt1/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA=='
  },
  {
    key: 'active',
    area: 'active',
    label: 'Highlights de luta',
    icon: Trophy,
    href: 'https://www.instagram.com/reel/DN1brri3jtr/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA=='
  },
  {
    key: 'athlete',
    area: 'athlete',
    label: 'Perfil de atleta',
    icon: User,
    href: 'https://www.instagram.com/p/DV9LvpoCTxf/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA=='
  },
  {
    key: 'academy',
    area: 'academy',
    label: 'Videos para academias',
    icon: Building2,
    href: 'https://www.instagram.com/reel/DRuXMwBEcNT/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA=='
  }
];

const FilmmakerShowcase = ({
  className = ''
}) => {
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
      whatsappMessage: 'Olá, quero solicitar um orçamento com .'
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
      whatsappMessage: 'Hello, I want to request a quote with .'
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
      whatsappMessage: 'Hola, quiero solicitar un presupuesto con .'
    },
    fr: {
      kicker: 'Genesis Filmmaker',
      topMessage: 'Votre championnat mérite un filmage de qualité',
      title: 'GENESIS FILMMAKER',
      subtitle: 'Votre parcours sur le tatami mérite d\'être immortalisé.',
      ctaLabel: 'DEMANDER UN DEVIS VIA WHATSAPP',
      creditPrefix: 'Filmé par',
      aftermovies: 'Aftermovies d\'Événements',
      entrance: 'Vidéos d\'Entrée',
      highlights: 'Moments Forts du Combat',
      athlete: 'Profils d\'Athlètes',
      academy: 'Vidéos pour Académies',
      whatsappMessage: 'Bonjour, je souhaite demander un devis avec .'
    }
  };
  const copy = copyByLanguage[uiVariant] || copyByLanguage.pt;

  const whatsappLink = buildFilmmakerWhatsappLink(
    copy.whatsappMessage
  );

  return (
    <section className={`filmmaker-showcase ${className}`.trim()} aria-label={copy.title}>
      <header className="filmmaker-showcase__head">
        <span className="filmmaker-showcase__kicker">{copy.kicker}</span>
        <strong className="filmmaker-showcase__top-message">{copy.topMessage}</strong>
        <h2>{title}</h2>
        <p>{copy.subtitle}</p>
      </header>

      <div className="filmmaker-showcase__stage">
        <div className="filmmaker-showcase__ambient" aria-hidden="true" />

        {cards.map((card) => {
          const labelDict = { hero: copy.aftermovies, entrance: copy.entrance, active: copy.highlights, athlete: copy.athlete, academy: copy.academy };
          const translatedLabel = labelDict[card.key] || card.label;
          const Icon = card.icon;
          return (
            <a
              key={card.key}
              className={`filmmaker-showcase__card filmmaker-showcase__card--${card.area}`}
              href={card.href}
              target="_blank"
              rel="noreferrer"
              aria-label={translatedLabel}
              title={translatedLabel}
            >
              <span className="filmmaker-showcase__media filmmaker-showcase__media--photo" style={cardMediaByKey[card.key]} aria-hidden="true" />
              <span className="filmmaker-showcase__glass" aria-hidden="true" />
              <span className="filmmaker-showcase__play" aria-hidden="true">
                <Play size={card.key === 'hero' ? 28 : 18} fill="currentColor" strokeWidth={1.8} />
              </span>
              <span className="filmmaker-showcase__sr-only">{translatedLabel}</span>

              {card.key === 'hero' ? (
                <span className="filmmaker-showcase__identity">
                  <img src="/genesis-logo.png" alt="" aria-hidden="true" />
                  <strong>{FILMMAKER_HANDLE}</strong>
                </span>
              ) : (
                <span className="filmmaker-showcase__label">
                  <Icon size={14} />
                  {translatedLabel}
                </span>
              )}
            </a>
          );
        })}

        <div className="filmmaker-showcase__cta">
          <a className="filmmaker-showcase__cta-button" href={whatsappLink} target="_blank" rel="noreferrer">
            {copy.ctaLabel}
          </a>
          <small>{`${copy.creditPrefix} `}</small>
        </div>
      </div>
    </section>
  );
};

export default FilmmakerShowcase;
