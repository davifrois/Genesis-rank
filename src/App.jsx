import React, { useMemo, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import {
  AlertCircle,
  ChevronDown,
  ExternalLink,
  Facebook,
  Instagram,
  LogIn,
  LogOut,
  Mail,
  MapPin,
  Phone,
  Settings,
  Trophy,
  User,
  Users,
  Youtube,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import About from './pages/About';
import Athletes from './pages/Athletes';
import Teams from './pages/Teams';
import TeamProfile from './pages/TeamProfile';
import Dashboard from './pages/Dashboard';
import Events from './pages/Events';
import EventDetails from './pages/EventDetails';
import EventReports from './pages/EventReports';
import Home from './pages/Home';
import Membership from './pages/Membership';
import MyAccount from './pages/MyAccount';
import News from './pages/News';
import Organizers from './pages/Organizers';
import PublicProfile from './pages/PublicProfile';
import Regulations from './pages/Regulations';
import Ranking from './pages/Ranking';
import TeamRanking from './pages/TeamRanking';
import EventRegistration from './pages/EventRegistration';
import SettingsPage from './pages/Settings';
import AcademyRegistration from './pages/AcademyRegistration';
import { useStore } from './hooks/useStore';
import { useI18n } from './hooks/useI18n';
import LoginOverlay from './components/LoginOverlay';
import { DEFAULT_EVENT_FEES, DEFAULT_EVENT_PIX_KEY } from './utils/eventPricing';
import { compressImage } from './utils/imageUtils';
import './index.css';

const MAX_EVENT_POSTER_UPLOAD_BYTES = 8_000_000;
const MAX_EVENT_ASSET_UPLOAD_BYTES = 1_500_000;
const TARGET_EVENT_POSTER_STORED_BYTES = 420_000;
const MAX_EVENT_POSTER_STORED_BYTES = 1_000_000;
const EVENT_POSTER_MAX_WIDTH = 1400;
const EVENT_POSTER_MAX_HEIGHT = 1800;
const EVENT_POSTER_MIN_DIMENSION = 360;
const EVENT_POSTER_INITIAL_QUALITY = 0.86;
const EVENT_POSTER_MIN_QUALITY = 0.5;
const EVENT_POSTER_MAX_ATTEMPTS = 8;

const createEventFormState = () => ({
  name: '',
  date: '',
  location: '',
  posterUrl: '',
  registrationUrl: '',
  weightTableGiUrl: '',
  weightTableNoGiUrl: '',
  circularUrl: '',
  weightTableGiOptions: '',
  weightTableNoGiOptions: '',
  pixKey: DEFAULT_EVENT_PIX_KEY,
  feeUnder15: DEFAULT_EVENT_FEES.under15,
  feeOver15: DEFAULT_EVENT_FEES.over15,
  feeCombo: DEFAULT_EVENT_FEES.combo,
  feeAbsolute: DEFAULT_EVENT_FEES.absolute,
  registrationOpen: true,
  internalRegistration: true
});

const isDataImageUrl = (value) => /^data:image\//i.test((value || '').toString().trim());
const isDataPdfUrl = (value) => /^data:application\/pdf/i.test((value || '').toString().trim());

const estimateDataUrlBytes = (dataUrl) => {
  const value = (dataUrl || '').toString();
  const separatorIndex = value.indexOf(',');
  if (separatorIndex < 0) return value.length;
  const base64 = value.slice(separatorIndex + 1);
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
};

const formatBytes = (bytes) => {
  const value = Number(bytes);
  if (!Number.isFinite(value) || value <= 0) return '0 KB';
  if (value < 1024) return `${value} B`;
  const kb = value / 1024;
  if (kb < 1024) return `${kb.toFixed(kb >= 100 ? 0 : 1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
};

const readFileAsDataUrl = (file) => compressImage(file, 800, 800, 0.7);

const loadImageFromDataUrl = (dataUrl) => new Promise((resolve, reject) => {
  const image = new Image();
  image.onload = () => resolve(image);
  image.onerror = () => reject(new Error('Falha ao processar imagem.'));
  image.src = dataUrl;
});

const compressEventPosterFile = async (file) => {
  const originalDataUrl = await readFileAsDataUrl(file);
  const image = await loadImageFromDataUrl(originalDataUrl);
  const naturalWidth = Math.max(1, image.naturalWidth || image.width || EVENT_POSTER_MIN_DIMENSION);
  const naturalHeight = Math.max(1, image.naturalHeight || image.height || EVENT_POSTER_MIN_DIMENSION);
  const fitRatio = Math.min(
    1,
    EVENT_POSTER_MAX_WIDTH / naturalWidth,
    EVENT_POSTER_MAX_HEIGHT / naturalHeight
  );

  let width = Math.max(1, Math.floor(naturalWidth * fitRatio));
  let height = Math.max(1, Math.floor(naturalHeight * fitRatio));
  let quality = EVENT_POSTER_INITIAL_QUALITY;
  let bestDataUrl = '';
  let bestBytes = Number.POSITIVE_INFINITY;

  for (let attempt = 0; attempt < EVENT_POSTER_MAX_ATTEMPTS; attempt += 1) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Falha ao comprimir imagem.');
    }

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.clearRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    const bytes = estimateDataUrlBytes(dataUrl);
    if (bytes < bestBytes) {
      bestDataUrl = dataUrl;
      bestBytes = bytes;
    }
    if (bytes <= TARGET_EVENT_POSTER_STORED_BYTES) {
      return { dataUrl, bytes };
    }

    if (quality > EVENT_POSTER_MIN_QUALITY) {
      quality = Math.max(EVENT_POSTER_MIN_QUALITY, quality - 0.1);
      continue;
    }

    const nextWidth = Math.max(EVENT_POSTER_MIN_DIMENSION, Math.floor(width * 0.86));
    const nextHeight = Math.max(EVENT_POSTER_MIN_DIMENSION, Math.floor(height * 0.86));
    if (nextWidth === width && nextHeight === height) {
      break;
    }
    width = nextWidth;
    height = nextHeight;
    quality = EVENT_POSTER_INITIAL_QUALITY;
  }

  if (!bestDataUrl) {
    throw new Error('Falha ao comprimir imagem.');
  }
  return {
    dataUrl: bestDataUrl,
    bytes: bestBytes
  };
};

const AppLayout = () => {
  const {
    currentUser,
    events,
    memberProfiles,
    deleteMemberProfile,
    eventModalOpen,
    closeEventModal,
    addEvent,
    logout
  } = useStore();
  const location = useLocation();
  const [logoReady, setLogoReady] = useState(true);
  const [eventForm, setEventForm] = useState(createEventFormState);
  const [eventError, setEventError] = useState('');

  // ONE-TIME CLEANUP FOR TEST PROFILES
  useEffect(() => {
    if (memberProfiles?.length > 0 && deleteMemberProfile) {
      const namesToRemove = [
        "Davi frois",
        "Regis Frois santos Frois",
        "Teste Davifrois Token",
        "Davifrois",
        "Teste Fluxo Aprovacao",
        "ATLETA SMOKE 20260310140618",
        "Teste Approve Fluxo",
        "Atleta Mail"
      ];
      const toRemove = memberProfiles.filter(p => namesToRemove.includes(p.fullName) || namesToRemove.includes(p.nome));
      if (toRemove.length > 0) {
        toRemove.forEach(p => deleteMemberProfile(p.id));
      }
    }
  }, [memberProfiles, deleteMemberProfile]);
  const [eventSuccess, setEventSuccess] = useState('');
  const [showLogin, setShowLogin] = useState(false);
  
  const linkedProfiles = useMemo(() => {
    if (!currentUser || !memberProfiles) return [];
    const username = (currentUser.username || '').toLowerCase();
    return memberProfiles.filter(p => {
      const accUser = (p.accountUsername || p.loginUsername || p.username || '').toLowerCase();
      const createdBy = (p.createdByUsername || '').toLowerCase();
      const email = (p.email || '').toLowerCase();
      return accUser === username || createdBy === username || email === username || p.id === currentUser.id;
    });
  }, [currentUser, memberProfiles]);

  const mainProfile = linkedProfiles[0];
  const finalAvatar = mainProfile?.photoUrl || mainProfile?.avatarUrl || currentUser?.avatarUrl || currentUser?.avatar || currentUser?.photoUrl;
  const finalName = mainProfile?.fullName || currentUser?.name || currentUser?.fullName || 'Atleta';
  const finalBelt = mainProfile?.belt || currentUser?.belt || 'Branca';

  const currentUserRole = (currentUser?.role || '').toString().trim().toLowerCase();
  const isCoachUser = currentUserRole === 'coach' || currentUserRole === 'professor';
  const canAccessAdmin = currentUserRole === 'admin';
  const canAccessDashboard = canAccessAdmin || currentUserRole === 'mesario';
  const isAdminRoute = location.pathname.startsWith('/admin');
  const isHomeRoute = location.pathname === '/';
  const isEventsRoute = location.pathname.startsWith('/eventos');
  const isOrganizersRoute = location.pathname.startsWith('/organizadores');
  const isAboutRoute = location.pathname.startsWith('/institucional');
  const isRegulationsRoute = location.pathname.startsWith('/regulamento');
  const { language, setLanguage, currentLanguage, languages, uiLanguage } = useI18n();
  const isEnglish = uiLanguage === 'en-US';
  const isSpanish = uiLanguage === 'es-ES';
  const isFrench = uiLanguage === 'fr-FR';
  const [eventPosterStoredSizeBytes, setEventPosterStoredSizeBytes] = useState(0);
  const [eventWeightTableGiStoredSizeBytes, setEventWeightTableGiStoredSizeBytes] = useState(0);
  const [eventWeightTableNoGiStoredSizeBytes, setEventWeightTableNoGiStoredSizeBytes] = useState(0);
  const [eventCircularStoredSizeBytes, setEventCircularStoredSizeBytes] = useState(0);

  const copy = useMemo(() => (
    isEnglish
      ? {
          utilityLinks: {
            about: 'About Us',
            organizers: 'Organizers',
            support: 'Support'
          },
          supportMenu: {
            whatsapp: 'WhatsApp',
            email: 'Send email'
          },
          utility: {
            partnerBrands: 'Partner brands',
            account: 'Account',
            language: 'Language'
          },
          nav: {
            events: 'Events',
            rankings: 'Rankings',
            athletes: 'Athletes',
            teams: 'Teams',
            news: 'News',
            regulations: 'Regulations'
          },
          eventsMenu: {
            upcoming: 'Upcoming Events',
            calendar: 'Events Calendar 2026',
            past: 'Past Events'
          },
          rankingMenu: {
            overall: 'Overall Ranking',
            gi: 'GI Ranking',
            noGi: 'NO-GI Ranking',
            teams: 'Team Ranking',
            registeredEvents: 'Registered tournaments',
            emptyEvents: 'No tournament registered'
          },
          membershipMenu: {
            member: 'Member Area',
            registerAcademy: 'Academy and Coach'
          },
          newsMenu: {
            blog: 'Blog & News',
            videos: 'Video Library',
            magazine: 'Jiu-Jitsu World Mag',
            social: 'Social Media'
          },
          regulationsMenu: {
            rankingRules: 'Ranking Rules',
            pointsSystem: 'Points System',
            eventLevels: 'Event Levels'
          },
          accountMenu: {
            myAccount: 'My account',
            academy: 'Academy',
            settings: 'Settings',
            manageProfiles: 'Manage profiles',
            logout: 'Log out',
            login: 'Login',
            register: 'Register'
          },
          footer: {
            description:
              'Genesis Esportes organizes Jiu-Jitsu events and tracks rankings with transparent and consistent operations. Founded in 2017 in Belo Horizonte.',
            followUs: 'Follow us',
            contact: 'Contact',
            phone: 'Phone / WhatsApp',
            email: 'Email',
            location: 'Location',
            mapLabel: 'Parque Turista - Contagem / MG',
            mapAddress: 'Rua Pains, 139',
            viewMap: 'View on map',
            rights: 'All rights reserved.'
          },
          eventModal: {
            title: 'Create event',
            close: 'Close',
            name: 'Event name',
            namePlaceholder: 'Ex: Stage 1 - Regional',
            date: 'Date',
            location: 'Location',
            locationPlaceholder: 'Ex: Main Arena',
            posterUrl: 'Poster image URL (optional)',
            posterUrlPlaceholder: 'https://.../poster.jpg',
            posterFile: 'Or upload poster image',
            posterCompressionHint: 'Uploaded poster is automatically compressed.',
            posterCompressedSize: 'Compressed size',
            posterTypeInvalid: 'Select a valid image file for the poster.',
            posterUploadTooLarge: 'Poster file too large. Maximum upload size is 8 MB.',
            posterTooLargeAfterCompression: 'Poster is still too large after compression. Choose a lighter file.',
            posterReadFail: 'Failed to process selected poster image.',
            registrationUrl: 'Registration URL (optional)',
            registrationUrlPlaceholder: 'https://...',
            weightTableGiUrl: 'GI weight table URL (image/PDF)',
            weightTableGiUrlPlaceholder: 'https://.../weight-gi.jpg',
            weightTableNoGiUrl: 'NO-GI weight table URL (image/PDF)',
            weightTableNoGiUrlPlaceholder: 'https://.../weight-no-gi.jpg',
            circularUrl: 'Event circular URL (optional)',
            circularUrlPlaceholder: 'https://.../circular.pdf',
            weightTableGiFile: 'Upload GI table file (image/PDF)',
            weightTableNoGiFile: 'Upload NO-GI table file (image/PDF)',
            circularFile: 'Upload event circular file (image/PDF)',
            assetStoredSize: 'Stored size',
            assetTypeInvalid: 'Select an image or PDF file.',
            assetUploadTooLarge: 'File too large. Maximum upload size is 1.5 MB.',
            assetReadFail: 'Failed to process selected file.',
            weightTableGiOptions: 'GI weight options (one per line)',
            weightTableGiOptionsPlaceholder: 'Ex: Light up to 76,00',
            weightTableNoGiOptions: 'NO-GI weight options (one per line)',
            weightTableNoGiOptionsPlaceholder: 'Ex: Middle up to 82,30',
            pixKey: 'Pix key (event owner)',
            pixKeyPlaceholder: 'CPF / CNPJ / email / phone / random key',
            feeUnder15: 'Fee up to 15 years (GI/NO-GI)',
            feeOver15: 'Fee over 15 years (GI/NO-GI)',
            feeCombo: 'Fee Combo GI + NO-GI',
            feeAbsolute: 'Fee Absolute GI / NO-GI',
            registrationOpen: 'Open registrations now',
            internalRegistration: 'Registration on our platform',
            cancel: 'Cancel',
            save: 'Save event',
            error: 'Failed to create event.'
          }
        }
      : isSpanish
        ? {
            utilityLinks: {
              about: 'Sobre nosotros',
              organizers: 'Organizadores',
              support: 'Soporte'
            },
            supportMenu: {
              whatsapp: 'WhatsApp',
              email: 'Enviar correo'
            },
            utility: {
              partnerBrands: 'Marcas asociadas',
              account: 'Cuenta',
              language: 'Idioma'
            },
            nav: {
              events: 'Eventos',
              rankings: 'Rankings',
              athletes: 'Atletas',
              teams: 'Equipos',
              news: 'Noticias',
              regulations: 'Reglamento'
            },
            eventsMenu: {
              upcoming: 'Proximos eventos',
              calendar: 'Calendario de eventos 2026',
              past: 'Eventos pasados'
            },
            rankingMenu: {
              overall: 'Ranking general',
              gi: 'Ranking GI',
              noGi: 'Ranking NO-GI',
              teams: 'Ranking de equipos',
              registeredEvents: 'Campeonatos registrados',
              emptyEvents: 'No hay campeonato registrado'
            },
            membershipMenu: {
              member: 'Area del miembro',
              registerAcademy: 'Academia y profesor'
            },
            newsMenu: {
              blog: 'Blog y noticias',
              videos: 'Biblioteca de videos',
              magazine: 'Revista Jiu-Jitsu World',
              social: 'Redes sociales'
            },
            regulationsMenu: {
              rankingRules: 'Reglas del ranking',
              pointsSystem: 'Sistema de puntos',
              eventLevels: 'Niveles del evento'
            },
            accountMenu: {
              myAccount: 'Mi cuenta',
              academy: 'Academia',
              settings: 'Configuracion',
              manageProfiles: 'Gestionar perfiles',
              logout: 'Salir',
              login: 'Iniciar sesion',
              register: 'Crear cuenta'
            },
            footer: {
              description:
                'Genesis Esportes organiza eventos de Jiu-Jitsu y monitorea rankings con transparencia y excelencia operativa. Fundada en 2017 en Belo Horizonte.',
              followUs: 'Siguenos',
              contact: 'Contacto',
              phone: 'Telefono / WhatsApp',
              email: 'Correo',
              location: 'Ubicacion',
              mapLabel: 'Parque Turista - Contagem / MG',
              mapAddress: 'Rua Pains, 139',
              viewMap: 'Ver en el mapa',
              rights: 'Todos los derechos reservados.'
            },
            eventModal: {
              title: 'Crear evento',
              close: 'Cerrar',
              name: 'Nombre del evento',
              namePlaceholder: 'Ej: Etapa 1 - Regional',
              date: 'Fecha',
              location: 'Lugar',
              locationPlaceholder: 'Ej: Arena Central',
              posterUrl: 'URL de imagen del cartel (opcional)',
              posterUrlPlaceholder: 'https://.../cartel.jpg',
              posterFile: 'O subir imagen del cartel',
              posterCompressionHint: 'El cartel subido se comprime automaticamente.',
              posterCompressedSize: 'Tamano comprimido',
              posterTypeInvalid: 'Seleccione un archivo de imagen valido para el cartel.',
              posterUploadTooLarge: 'Archivo del cartel muy grande. Tamano maximo de carga: 8 MB.',
              posterTooLargeAfterCompression: 'El cartel sigue grande tras la compresion. Elija un archivo mas ligero.',
              posterReadFail: 'Error al procesar la imagen del cartel seleccionada.',
              registrationUrl: 'URL de inscripcion (opcional)',
              registrationUrlPlaceholder: 'https://...',
              weightTableGiUrl: 'URL de tabla de peso GI (imagen/PDF)',
              weightTableGiUrlPlaceholder: 'https://.../tabla-gi.jpg',
              weightTableNoGiUrl: 'URL de tabla de peso NO-GI (imagen/PDF)',
              weightTableNoGiUrlPlaceholder: 'https://.../tabla-no-gi.jpg',
              circularUrl: 'URL de circular del evento (opcional)',
              circularUrlPlaceholder: 'https://.../circular.pdf',
              weightTableGiFile: 'Subir archivo tabla GI (imagen/PDF)',
              weightTableNoGiFile: 'Subir archivo tabla NO-GI (imagen/PDF)',
              circularFile: 'Subir archivo circular del evento (imagen/PDF)',
              assetStoredSize: 'Tamano almacenado',
              assetTypeInvalid: 'Seleccione un archivo de imagen o PDF.',
              assetUploadTooLarge: 'Archivo demasiado grande. Tamano maximo: 1,5 MB.',
              assetReadFail: 'No se pudo procesar el archivo seleccionado.',
              weightTableGiOptions: 'Opciones de peso GI (una por linea)',
              weightTableGiOptionsPlaceholder: 'Ej: Leve hasta 76,00',
              weightTableNoGiOptions: 'Opciones de peso NO-GI (una por linea)',
              weightTableNoGiOptionsPlaceholder: 'Ej: Medio hasta 82,30',
              pixKey: 'Clave Pix (responsable del evento)',
              pixKeyPlaceholder: 'CPF / CNPJ / correo / telefono / clave aleatoria',
              feeUnder15: 'Valor hasta 15 anos (GI/NO-GI)',
              feeOver15: 'Valor mayor de 15 anos (GI/NO-GI)',
              feeCombo: 'Valor Combo GI + NO-GI',
              feeAbsolute: 'Valor Absoluto GI / NO-GI',
              registrationOpen: 'Inscripciones abiertas ahora',
              internalRegistration: 'Inscripcion en nuestra plataforma',
              cancel: 'Cancelar',
              save: 'Guardar evento',
              error: 'No se pudo crear el evento.'
            }
          }
        : isFrench
          ? {
              utilityLinks: {
                about: 'A propos',
                organizers: 'Organisateurs',
                support: 'Support'
              },
              supportMenu: {
                whatsapp: 'WhatsApp',
                email: 'Envoyer un e-mail'
              },
              utility: {
                partnerBrands: 'Marques partenaires',
                account: 'Compte',
                language: 'Langue'
              },
              nav: {
                events: 'Evenements',
                rankings: 'Rankings',
                athletes: 'Athletes',
                teams: 'Equipes',
                news: 'Actualites',
                regulations: 'Reglement'
              },
              eventsMenu: {
                upcoming: 'Prochains evenements',
                calendar: 'Calendrier des evenements 2026',
                past: 'Evenements passes'
              },
              rankingMenu: {
                overall: 'Classement general',
                gi: 'Classement GI',
                noGi: 'Classement NO-GI',
                teams: 'Classement equipes',
                registeredEvents: 'Championnats enregistres',
                emptyEvents: 'Aucun championnat enregistre'
              },
              membershipMenu: {
                member: 'Espace membre',
                registerAcademy: 'Academie et professeur'
              },
              newsMenu: {
                blog: 'Blog et actualites',
                videos: 'Bibliotheque de videos',
                magazine: 'Magazine Jiu-Jitsu World',
                social: 'Reseaux sociaux'
              },
              regulationsMenu: {
                rankingRules: 'Regles du classement',
                pointsSystem: 'Systeme de points',
                eventLevels: "Niveaux d'evenement"
              },
              accountMenu: {
                myAccount: 'Mon compte',
                academy: 'Academie',
                settings: 'Parametres',
                manageProfiles: 'Gerer les profils',
                logout: 'Se deconnecter',
                login: 'Se connecter',
                register: "S'inscrire"
              },
              footer: {
                description:
                  'Genesis Esportes organise des evenements de Jiu-Jitsu et suit les classements avec transparence et excellence operationnelle. Fondee en 2017 a Belo Horizonte.',
                followUs: 'Suivez-nous',
                contact: 'Contact',
                phone: 'Telephone / WhatsApp',
                email: 'E-mail',
                location: 'Localisation',
                mapLabel: 'Parque Turista - Contagem / MG',
                mapAddress: 'Rua Pains, 139',
                viewMap: 'Voir sur la carte',
                rights: 'Tous droits reserves.'
              },
              eventModal: {
                title: 'Creer un evenement',
                close: 'Fermer',
                name: "Nom de l'evenement",
                namePlaceholder: 'Ex: Etape 1 - Regionale',
                date: 'Date',
                location: 'Lieu',
                locationPlaceholder: 'Ex: Arena Central',
                posterUrl: 'URL de limage de laffiche (optionnel)',
                posterUrlPlaceholder: 'https://.../affiche.jpg',
                posterFile: "Ou telecharger limage de laffiche",
                posterCompressionHint: 'Laffiche envoyee est compressee automatiquement.',
                posterCompressedSize: 'Taille compressee',
                posterTypeInvalid: "Selectionnez un fichier image valide pour laffiche.",
                posterUploadTooLarge: 'Fichier daffiche trop volumineux. Taille maximale: 8 MB.',
                posterTooLargeAfterCompression: 'Laffiche reste volumineuse apres compression. Choisissez un fichier plus leger.',
                posterReadFail: "Echec du traitement de limage de laffiche selectionnee.",
                registrationUrl: "URL d'inscription (optionnel)",
                registrationUrlPlaceholder: 'https://...',
                weightTableGiUrl: 'URL table de poids GI (image/PDF)',
                weightTableGiUrlPlaceholder: 'https://.../table-gi.jpg',
                weightTableNoGiUrl: 'URL table de poids NO-GI (image/PDF)',
                weightTableNoGiUrlPlaceholder: 'https://.../table-no-gi.jpg',
                circularUrl: "URL de la circulaire de l evenement (optionnel)",
                circularUrlPlaceholder: 'https://.../circulaire.pdf',
                weightTableGiFile: 'Telecharger fichier table GI (image/PDF)',
                weightTableNoGiFile: 'Telecharger fichier table NO-GI (image/PDF)',
                circularFile: 'Telecharger fichier circulaire evenement (image/PDF)',
                assetStoredSize: 'Taille stockee',
                assetTypeInvalid: 'Selectionnez un fichier image ou PDF.',
                assetUploadTooLarge: 'Fichier trop volumineux. Taille maximale: 1,5 MB.',
                assetReadFail: 'Echec du traitement du fichier selectionne.',
                weightTableGiOptions: 'Options de poids GI (une par ligne)',
                weightTableGiOptionsPlaceholder: 'Ex: Leve jusqua 76,00',
                weightTableNoGiOptions: 'Options de poids NO-GI (une par ligne)',
                weightTableNoGiOptionsPlaceholder: 'Ex: Moyen jusqua 82,30',
                pixKey: 'Cle Pix (responsable de levevement)',
                pixKeyPlaceholder: 'CPF / CNPJ / e-mail / telephone / cle aleatoire',
                feeUnder15: 'Tarif jusqua 15 ans (GI/NO-GI)',
                feeOver15: 'Tarif plus de 15 ans (GI/NO-GI)',
                feeCombo: 'Tarif Combo GI + NO-GI',
                feeAbsolute: 'Tarif Absolu GI / NO-GI',
                registrationOpen: 'Inscriptions ouvertes maintenant',
                internalRegistration: 'Inscription sur notre plateforme',
                cancel: 'Annuler',
                save: "Enregistrer l'evenement",
                error: "Echec de creation de levenement."
              }
            }
          : {
              utilityLinks: {
                about: 'Sobre',
                organizers: 'Organizadores',
                support: 'Suporte'
              },
              supportMenu: {
                whatsapp: 'WhatsApp',
                email: 'Enviar e-mail'
              },
              utility: {
                partnerBrands: 'Marcas parceiras',
                account: 'Conta',
                language: 'Idioma'
              },
              nav: {
                events: 'Eventos',
                rankings: 'Rankings',
                athletes: 'Atletas',
                teams: 'Equipes',
                news: 'Noticias',
                regulations: 'Regulamento'
              },
              eventsMenu: {
                upcoming: 'Proximos eventos',
                calendar: 'Calendario de eventos 2026',
                past: 'Eventos passados'
              },
              rankingMenu: {
                overall: 'Ranking geral',
                gi: 'Ranking GI',
                noGi: 'Ranking NO-GI',
                teams: 'Ranking equipes',
                registeredEvents: 'Campeonatos cadastrados',
                emptyEvents: 'Nenhum campeonato cadastrado'
              },
              membershipMenu: {
                member: 'Area do membro',
                registerAcademy: 'Academia e professor'
              },
              newsMenu: {
                blog: 'Blog e noticias',
                videos: 'Biblioteca de videos',
                magazine: 'Revista Jiu-Jitsu World',
                social: 'Midias sociais'
              },
              regulationsMenu: {
                rankingRules: 'Regras do ranking',
                pointsSystem: 'Sistema de pontos',
                eventLevels: 'Niveis de evento'
              },
              accountMenu: {
                myAccount: 'Minha conta',
                academy: 'Academia',
                settings: 'Configuracoes',
                manageProfiles: 'Gerenciar perfis',
                logout: 'Sair',
                login: 'Entrar',
                register: 'Cadastrar'
              },
              footer: {
                description:
                  'A Genesis Esportes organiza eventos de Jiu-Jitsu e monitora rankings com transparencia e excelencia operacional. Fundada em 2017, com sede em Belo Horizonte.',
                followUs: 'Siga-nos',
                contact: 'Contato',
                phone: 'Telefone / WhatsApp',
                email: 'E-mail',
                location: 'Localizacao',
                mapLabel: 'Parque Turista - Contagem / MG',
                mapAddress: 'Rua Pains, 139',
                viewMap: 'Ver no mapa',
                rights: 'Todos os direitos reservados.'
              },
              eventModal: {
                title: 'Criar evento',
                close: 'Fechar',
                name: 'Nome do evento',
                namePlaceholder: 'Ex: Etapa 1 - Regional',
                date: 'Data',
                location: 'Local',
                locationPlaceholder: 'Ex: Arena Central',
                posterUrl: 'URL da imagem do cartaz (opcional)',
                posterUrlPlaceholder: 'https://.../cartaz.jpg',
                posterFile: 'Ou envie a imagem do cartaz',
                posterCompressionHint: 'O cartaz enviado e comprimido automaticamente.',
                posterCompressedSize: 'Tamanho comprimido',
                posterTypeInvalid: 'Selecione um arquivo de imagem valido para o cartaz.',
                posterUploadTooLarge: 'Arquivo do cartaz muito grande. Tamanho maximo de envio: 8 MB.',
                posterTooLargeAfterCompression: 'O cartaz permaneceu grande apos a compressao. Escolha um arquivo menor.',
                posterReadFail: 'Falha ao processar a imagem do cartaz.',
                registrationUrl: 'URL de inscricao (opcional)',
                registrationUrlPlaceholder: 'https://...',
                weightTableGiUrl: 'URL da tabela de peso GI (imagem/PDF)',
                weightTableGiUrlPlaceholder: 'https://.../tabela-gi.jpg',
                weightTableNoGiUrl: 'URL da tabela de peso NO-GI (imagem/PDF)',
                weightTableNoGiUrlPlaceholder: 'https://.../tabela-no-gi.jpg',
                circularUrl: 'URL da circular do evento (opcional)',
                circularUrlPlaceholder: 'https://.../circular.pdf',
                weightTableGiFile: 'Enviar arquivo da tabela GI (imagem/PDF)',
                weightTableNoGiFile: 'Enviar arquivo da tabela NO-GI (imagem/PDF)',
                circularFile: 'Enviar arquivo da circular do evento (imagem/PDF)',
                assetStoredSize: 'Tamanho armazenado',
                assetTypeInvalid: 'Selecione um arquivo de imagem ou PDF.',
                assetUploadTooLarge: 'Arquivo muito grande. Tamanho maximo: 1,5 MB.',
                assetReadFail: 'Falha ao processar o arquivo selecionado.',
                weightTableGiOptions: 'Opcoes de peso GI (uma por linha)',
                weightTableGiOptionsPlaceholder: 'Ex: Leve ate 76,00',
                weightTableNoGiOptions: 'Opcoes de peso NO-GI (uma por linha)',
                weightTableNoGiOptionsPlaceholder: 'Ex: Medio ate 82,30',
                pixKey: 'Chave Pix (responsavel pelo campeonato)',
                pixKeyPlaceholder: 'CPF / CNPJ / e-mail / telefone / chave aleatoria',
                feeUnder15: 'Valor ate 15 anos (GI/NO-GI)',
                feeOver15: 'Valor acima de 15 anos (GI/NO-GI)',
                feeCombo: 'Valor Combo GI + NO-GI',
                feeAbsolute: 'Valor Absoluto GI / NO-GI',
                registrationOpen: 'Inscricoes abertas no momento',
                internalRegistration: 'Inscricao dentro da nossa plataforma',
                cancel: 'Cancelar',
                save: 'Salvar evento',
                error: 'Falha ao criar evento.'
              }
            }
  ), [isEnglish, isSpanish, isFrench]);

  const utilityLinks = useMemo(() => ([
    { label: copy.utilityLinks.about, path: '/institucional' },
    { label: copy.utilityLinks.organizers, path: '/organizadores' }
  ]), [copy.utilityLinks.about, copy.utilityLinks.organizers]);

  const supportItems = useMemo(() => ([
    {
      label: copy.supportMenu.whatsapp,
      href: 'https://api.whatsapp.com/send?phone=5531993383014&text=Ol%C3%A1%2C%20preciso%20de%20suporte%20no%20site%20Genesis%20Esportes.',
      icon: Phone
    },
    {
      label: copy.supportMenu.email,
      href: 'mailto:contato@genesisesportes.com.br?subject=Suporte%20Genesis%20Esportes',
      icon: Mail
    }
  ]), [copy.supportMenu.email, copy.supportMenu.whatsapp]);

  const rankingEventItems = useMemo(() => {
    if (!events?.length) return [];
    const getTime = (value) => {
      if (!value) return 0;
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
    };
    return [...events]
      .sort((a, b) => getTime(b.date || b.createdAt) - getTime(a.date || a.createdAt))
      .map((event) => ({
        label: event.name,
        path: `/ranking?event=${event.id}`
      }))
      .slice(0, 6);
  }, [events]);

  const navLeft = useMemo(() => {
    const rankingItems = rankingEventItems.length
      ? rankingEventItems
      : [{ type: 'label', label: copy.rankingMenu.emptyEvents }];

    return [
      {
        label: copy.nav.events,
        activePaths: ['/eventos'],
        items: [
          { label: copy.eventsMenu.upcoming, path: '/eventos?view=upcoming' },
          { label: copy.eventsMenu.calendar, path: '/eventos?view=calendar' },
          { label: copy.eventsMenu.past, path: '/eventos?view=past' }
        ]
      },
      {
        label: copy.nav.rankings,
        activePaths: ['/ranking', '/ranking-equipes'],
        items: rankingItems
      },
      { label: copy.nav.athletes, path: '/atletas', activePaths: ['/atletas'] }
    ];
  }, [copy, rankingEventItems]);

  const navRight = useMemo(() => ([
    {
      label: copy.nav.teams,
      activePaths: ['/equipes', '/equipe'],
      path: '/equipes'
    },
    {
      label: copy.nav.news,
      activePaths: ['/noticias'],
      path: '/noticias'
    },
    {
      label: copy.nav.regulations,
      activePaths: ['/regulamento'],
      path: '/regulamento'
    }
  ]), [copy]);

  const isActivePath = (paths = []) => paths.some((path) => location.pathname.startsWith(path));

  const handleCloseEventModal = () => {
    setEventError('');
    setEventSuccess('');
    setEventForm(createEventFormState());
    setEventPosterStoredSizeBytes(0);
    setEventWeightTableGiStoredSizeBytes(0);
    setEventWeightTableNoGiStoredSizeBytes(0);
    setEventCircularStoredSizeBytes(0);
    closeEventModal();
  };

  const handleCreateEvent = async (event) => {
    event.preventDefault();
    setEventError('');
    setEventSuccess('');

    try {
      const savedEvent = await addEvent(eventForm);
      const announcementAttempted = savedEvent?.announcementAttempted === true;
      const announcementRecipients = Number(savedEvent?.announcementRecipients || 0);
      const announcementSent = Number(savedEvent?.announcementSent || 0);
      const announcementFailed = Number(savedEvent?.announcementFailed || 0);

      if (announcementAttempted) {
        if (isEnglish) {
          setEventSuccess(`Event created and ${announcementSent} emails sent / ${announcementFailed} failures.`);
        } else if (isSpanish) {
          setEventSuccess(`Evento creado y ${announcementSent} correos enviados / ${announcementFailed} fallos.`);
        } else if (isFrench) {
          setEventSuccess(`Evenement cree et ${announcementSent} e-mails envoyes / ${announcementFailed} echecs.`);
        } else {
          setEventSuccess(`Evento criado e ${announcementSent} e-mails enviados / ${announcementFailed} falhas.`);
        }
      } else if (savedEvent && savedEvent.announcementAttempted === false) {
        if (isEnglish) {
          setEventSuccess(
            announcementRecipients > 0
              ? 'Event created, but announcement email was not sent.'
              : 'Event created. No announcement email sent (no valid recipients or SMTP not configured).'
          );
        } else if (isSpanish) {
          setEventSuccess(
            announcementRecipients > 0
              ? 'Evento creado, pero no se envio el aviso por correo.'
              : 'Evento creado. Aviso por correo no enviado (sin destinatarios validos o SMTP no configurado).'
          );
        } else if (isFrench) {
          setEventSuccess(
            announcementRecipients > 0
              ? "Evenement cree, mais l'annonce e-mail n'a pas ete envoyee."
              : "Evenement cree. Aucun e-mail d'annonce envoye (pas de destinataires valides ou SMTP non configure)."
          );
        } else {
          setEventSuccess(
            announcementRecipients > 0
              ? 'Evento criado, mas o aviso por e-mail nao foi enviado.'
              : 'Evento criado. Aviso por e-mail nao enviado (sem destinatarios validos ou SMTP nao configurado).'
          );
        }
      } else {
        if (isEnglish) setEventSuccess('Event created successfully.');
        else if (isSpanish) setEventSuccess('Evento creado con exito.');
        else if (isFrench) setEventSuccess('Evenement cree avec succes.');
        else setEventSuccess('Evento criado com sucesso.');
      }

      setEventForm(createEventFormState());
      setEventPosterStoredSizeBytes(0);
      setEventWeightTableGiStoredSizeBytes(0);
      setEventWeightTableNoGiStoredSizeBytes(0);
      setEventCircularStoredSizeBytes(0);
    } catch (err) {
      setEventError(err?.message || copy.eventModal.error);
      setEventSuccess('');
    }
  };

  const handleEventPosterUrlChange = (event) => {
    const value = event.target.value;
    setEventForm((prev) => ({ ...prev, posterUrl: value }));
    setEventPosterStoredSizeBytes(isDataImageUrl(value) ? estimateDataUrlBytes(value) : 0);
  };

  const createEventAssetUrlChangeHandler = (field, setSizeState) => (event) => {
    const value = event.target.value;
    setEventForm((prev) => ({ ...prev, [field]: value }));
    const storedBytes = (isDataImageUrl(value) || isDataPdfUrl(value)) ? estimateDataUrlBytes(value) : 0;
    setSizeState(storedBytes);
  };

  const handleEventPosterFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!/^image\//i.test(file.type || '')) {
      setEventError(copy.eventModal.posterTypeInvalid);
      event.target.value = '';
      return;
    }

    if (file.size > MAX_EVENT_POSTER_UPLOAD_BYTES) {
      setEventError(copy.eventModal.posterUploadTooLarge);
      event.target.value = '';
      return;
    }

    try {
      const compressed = await compressEventPosterFile(file);
      if (!compressed?.dataUrl || compressed.bytes > MAX_EVENT_POSTER_STORED_BYTES) {
        setEventError(copy.eventModal.posterTooLargeAfterCompression);
        return;
      }
      setEventForm((prev) => ({ ...prev, posterUrl: compressed.dataUrl }));
      setEventPosterStoredSizeBytes(compressed.bytes || 0);
      setEventError('');
    } catch {
      setEventError(copy.eventModal.posterReadFail || copy.eventModal.error);
    } finally {
      event.target.value = '';
    }
  };

  const createEventAssetFileChangeHandler = (field, setSizeState) => async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const mimeType = (file.type || '').toLowerCase();
    const fileName = (file.name || '').toLowerCase();
    const isPdf = mimeType === 'application/pdf' || fileName.endsWith('.pdf');
    const isImage = /^image\//i.test(mimeType) || /\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(fileName);

    if (!isImage && !isPdf) {
      setEventError(copy.eventModal.assetTypeInvalid || copy.eventModal.error);
      event.target.value = '';
      return;
    }

    if (file.size > MAX_EVENT_ASSET_UPLOAD_BYTES) {
      setEventError(copy.eventModal.assetUploadTooLarge || copy.eventModal.error);
      event.target.value = '';
      return;
    }

    try {
      let dataUrl = '';
      let bytes = 0;

      if (isImage) {
        const compressed = await compressEventPosterFile(file);
        if (!compressed?.dataUrl || compressed.bytes > MAX_EVENT_POSTER_STORED_BYTES) {
          setEventError(copy.eventModal.assetUploadTooLarge || copy.eventModal.error);
          event.target.value = '';
          return;
        }
        dataUrl = compressed.dataUrl;
        bytes = compressed.bytes || 0;
      } else {
        dataUrl = await readFileAsDataUrl(file);
        bytes = estimateDataUrlBytes(dataUrl);
        if (bytes > MAX_EVENT_ASSET_UPLOAD_BYTES) {
          setEventError(copy.eventModal.assetUploadTooLarge || copy.eventModal.error);
          event.target.value = '';
          return;
        }
      }

      setEventForm((prev) => ({ ...prev, [field]: dataUrl }));
      setSizeState(bytes);
      setEventError('');
    } catch {
      setEventError(copy.eventModal.assetReadFail || copy.eventModal.error);
    } finally {
      event.target.value = '';
    }
  };

  const handleWeightTableGiUrlChange = createEventAssetUrlChangeHandler('weightTableGiUrl', setEventWeightTableGiStoredSizeBytes);
  const handleWeightTableNoGiUrlChange = createEventAssetUrlChangeHandler('weightTableNoGiUrl', setEventWeightTableNoGiStoredSizeBytes);
  const handleCircularUrlChange = createEventAssetUrlChangeHandler('circularUrl', setEventCircularStoredSizeBytes);
  const handleWeightTableGiFileChange = createEventAssetFileChangeHandler('weightTableGiUrl', setEventWeightTableGiStoredSizeBytes);
  const handleWeightTableNoGiFileChange = createEventAssetFileChangeHandler('weightTableNoGiUrl', setEventWeightTableNoGiStoredSizeBytes);
  const handleCircularFileChange = createEventAssetFileChangeHandler('circularUrl', setEventCircularStoredSizeBytes);

  const accountItems = currentUser
    ? [
        { label: copy.accountMenu.myAccount, path: '/minha-conta', icon: User },
        ...(isCoachUser
          ? [{ label: copy.accountMenu.academy, path: '/academia', icon: Users }]
          : []),
        { label: copy.accountMenu.settings, path: '/configuracoes', icon: Settings },
        ...(canAccessDashboard
          ? [{ label: copy.accountMenu.manageProfiles, path: '/admin', icon: Users }]
          : []),
        { label: copy.accountMenu.logout, onClick: logout, icon: LogOut }
      ]
    : [
        { label: copy.accountMenu.login, onClick: () => setShowLogin(true), icon: LogIn },
        { label: copy.accountMenu.register, path: '/filiacao', icon: User }
      ];

  const renderAccountItem = (item) => {
    const Icon = item.icon;
    if (item.onClick) {
      return (
        <button key={item.label} type="button" className="utility-dropdown__item" onClick={item.onClick}>
          {Icon && <Icon size={14} />}
          <span>{item.label}</span>
        </button>
      );
    }
    return (
      <Link key={item.label} className="utility-dropdown__item" to={item.path}>
        {Icon && <Icon size={14} />}
        <span>{item.label}</span>
      </Link>
    );
  };

  const renderSupportItem = (item) => {
    const Icon = item.icon;
    const openInNewTab = /^https?:\/\//i.test(item.href);
    return (
      <a
        key={item.label}
        className="utility-dropdown__item"
        href={item.href}
        target={openInNewTab ? '_blank' : undefined}
        rel={openInNewTab ? 'noreferrer' : undefined}
      >
        {Icon && <Icon size={14} />}
        <span>{item.label}</span>
      </a>
    );
  };

  const renderNavItem = (item) => {
    const isActive = isActivePath(item.activePaths || []);

    if (item.items) {
      return (
        <div key={item.label} className={`nav-dropdown ${isActive ? 'is-active' : ''}`}>
          <button className={`main-nav-link ${isActive ? 'is-active' : ''}`} type="button">
            {item.label}
            <ChevronDown size={14} />
          </button>
          <div className="nav-dropdown__panel">
            {item.items.map((entry) => {
              if (entry.type === 'label') {
                return (
                  <div key={entry.label} className="nav-dropdown__label">
                    {entry.label}
                  </div>
                );
              }
            return (
                <Link key={entry.label} className={`nav-dropdown__item ${entry.icon ? 'has-icon' : ''}`} to={entry.path}>
                  {entry.icon && <entry.icon size={14} />}
                  <span>{entry.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      );
    }

    return (
      <Link
        key={item.label}
        to={item.path}
        className={`main-nav-link ${isActive ? 'is-active' : ''}`}
        aria-current={isActive ? 'page' : undefined}
      >
        {item.label}
      </Link>
    );
  };

  return (
    <div className="app-shell">
      <header className="app-topbar ajp-header">
        <div className="topbar-utility">
          <div className="container topbar-utility__inner">
            <div className="utility-social">
              <a
                className="utility-icon"
                href="https://api.whatsapp.com/send?phone=5531993383014&text=Contato%20%7C%20Site%20G%C3%AAnesis%20Esporte.%20Ol%C3%A1%2C%20tudo%20bem%3F"
                target="_blank"
                rel="noreferrer"
                aria-label="WhatsApp Genesis Esportes"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.149-.198.297-.767.966-.94 1.164-.173.198-.347.223-.644.075-.297-.149-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.133-.132.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.372-.025-.52-.075-.149-.669-1.612-.916-2.206-.242-.579-.487-.5-.669-.51-.173-.009-.372-.011-.57-.011-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.077 4.487.711.307 1.264.49 1.696.627.713.227 1.362.195 1.875.118.572-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.617h-.004a9.87 9.87 0 0 1-5.031-1.378L3.48 21.65l1.06-3.872a9.86 9.86 0 0 1-1.506-5.26c.001-5.448 4.434-9.88 9.887-9.88 2.64.001 5.122 1.03 6.99 2.899a9.83 9.83 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.883 9.884m8.413-18.297A11.82 11.82 0 0 0 12.06.198C5.555.198.26 5.49.258 11.997A11.8 11.8 0 0 0 1.89 18.3L0 24l5.84-1.53a11.84 11.84 0 0 0 6.215 1.787h.005c6.504 0 11.8-5.292 11.803-11.799a11.8 11.8 0 0 0-3.399-8.756" />
                </svg>
              </a>
              <a className="utility-icon" href="https://www.instagram.com/genesis_esportes/" target="_blank" rel="noreferrer">
                <Instagram size={18} />
              </a>
              <a className="utility-icon" href="https://www.facebook.com/genesis.tatames" target="_blank" rel="noreferrer">
                <Facebook size={18} />
              </a>
              <a className="utility-icon" href="https://www.youtube.com/channel/UCg9eEbos83Rw4S6fzT4peVA" target="_blank" rel="noreferrer">
                <Youtube size={18} />
              </a>
              <div className="utility-brands" aria-label={copy.utility.partnerBrands}>
                <span className="utility-brand-mark">TX7</span>
                <span className="utility-brand-mark">GENESIS PRO</span>
                <span className="utility-brand-mark">GENESIS TOUR</span>
              </div>
            </div>
            <div className="utility-links">
              {utilityLinks.map((link) => (
                <Link key={link.label} className="utility-link" to={link.path}>
                  {link.label}
                </Link>
              ))}
              <div className="utility-dropdown">
                <button className="utility-link" type="button">
                  {copy.utilityLinks.support}
                  <ChevronDown size={12} />
                </button>
                <div className="utility-dropdown__panel">
                  {supportItems.map(renderSupportItem)}
                </div>
              </div>
              <div className="utility-dropdown">
                <button className="utility-link" type="button">
                  {copy.utility.account}
                  <ChevronDown size={12} />
                </button>
                <div className="utility-dropdown__panel utility-dropdown__panel--account">
                  {currentUser && (
                    <div className="account-dropdown-header">
                      <div className="account-dropdown-avatar">
                        {finalAvatar ? (
                          <img src={finalAvatar} alt="" />
                        ) : (
                          <span>{(finalName).charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <div className="account-dropdown-info">
                        <strong>{finalName}</strong>
                        <small>{finalBelt}</small>
                      </div>
                    </div>
                  )}
                  
                  <div className="account-dropdown-group">
                    {accountItems.map(renderAccountItem)}
                  </div>
                  
                  {currentUser && linkedProfiles.length > 0 && (
                    <div className="account-dropdown-linked">
                      <div className="linked-label">PERFIS LIGADOS</div>
                      {linkedProfiles.map(profile => (
                        <Link to="/minha-conta" key={profile.id} className="linked-profile" style={{ marginBottom: linkedProfiles.length > 1 ? '8px' : 0 }}>
                          <div className="account-dropdown-avatar account-dropdown-avatar--small">
                            {profile.photoUrl || profile.avatarUrl ? (
                              <img src={profile.photoUrl || profile.avatarUrl} alt="" />
                            ) : (
                              <span>{(profile.fullName || 'U').charAt(0).toUpperCase()}</span>
                            )}
                          </div>
                          <span>{profile.fullName}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                  {currentUser && linkedProfiles.length === 0 && (
                    <div className="account-dropdown-linked">
                      <div className="linked-label">PERFIS LIGADOS</div>
                      <Link to="/minha-conta" className="linked-profile">
                        <div className="account-dropdown-avatar account-dropdown-avatar--small">
                          {finalAvatar ? (
                            <img src={finalAvatar} alt="" />
                          ) : (
                            <span>{(finalName).charAt(0).toUpperCase()}</span>
                          )}
                        </div>
                        <span>{finalName}</span>
                      </Link>
                    </div>
                  )}
                </div>
              </div>
              <div className="utility-dropdown utility-dropdown--language">
                <button className="utility-link utility-link--language" type="button" aria-label={copy.utility.language}>
                  <span className="utility-flag" aria-hidden="true">{currentLanguage.flag}</span>
                  <span>{currentLanguage.label}</span>
                  <ChevronDown size={12} />
                </button>
                <div className="utility-dropdown__panel utility-dropdown__panel--language">
                  {languages.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`utility-dropdown__item utility-dropdown__language-item ${language === item.id ? 'is-active' : ''}`}
                      onClick={() => setLanguage(item.id)}
                    >
                      <span className="utility-flag" aria-hidden="true">{item.flag}</span>
                      <span className="utility-language-labels">
                        <span>{item.label}</span>
                        <small>{item.country}</small>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="topbar-main">
          <div className="container topbar-main__inner">
            <nav className="main-nav">
              <div className="main-nav__group">
                {navLeft.map(renderNavItem)}
              </div>
              <Link to="/" className="brand-block brand-block--center">
                <div className="brand-mark">
                  {logoReady ? (
                    <img
                      src="/genesis-logo.png"
                      alt="Genesis Esportes"
                      className="brand-logo"
                      onError={() => setLogoReady(false)}
                    />
                  ) : (
                    <Trophy size={24} />
                  )}
                </div>
                <div className="brand-title">Genesis</div>
              </Link>
              <div className="main-nav__group main-nav__group--right">
                {navRight.map(renderNavItem)}
              </div>
            </nav>
          </div>
        </div>
      </header>

      <main className={`app-main ${isAdminRoute ? 'app-main--admin' : ''} ${(isEventsRoute || isOrganizersRoute || isAboutRoute || isRegulationsRoute) ? 'app-main--full' : ''}`}>
        <div className={`container ${isAdminRoute ? 'container--admin' : ''} ${isHomeRoute ? 'container--home' : ''} ${(isEventsRoute || isOrganizersRoute || isAboutRoute || isRegulationsRoute) ? 'container--full' : ''}`}>
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              <Routes location={location}>
                <Route path="/" element={<Home />} />
                <Route
                  path="/admin/*"
                  element={canAccessDashboard ? <Dashboard /> : <Navigate to="/ranking" replace />}
                />
                <Route path="/institucional" element={<About />} />
                <Route path="/organizadores" element={<Organizers />} />
                <Route path="/eventos" element={<Events />} />
                <Route path="/eventos/:eventId" element={<EventDetails />} />
                <Route path="/eventos/:eventId/relatorios" element={<EventReports />} />
                <Route path="/eventos/:eventId/inscricao" element={<EventRegistration />} />
                <Route path="/perfil-publico" element={<PublicProfile />} />
                <Route path="/ranking" element={<Ranking />} />
                <Route path="/ranking-equipes" element={<TeamRanking />} />
                <Route path="/atletas" element={<Athletes />} />
                <Route path="/equipes" element={<Teams />} />
                <Route path="/equipe/:academyId" element={<TeamProfile />} />
                <Route path="/filiacao" element={<Membership />} />
                <Route path="/academia" element={<Membership />} />
                <Route path="/registro-academia" element={<AcademyRegistration />} />
                <Route path="/minha-conta" element={<MyAccount />} />
                <Route path="/configuracoes" element={<SettingsPage />} />
                <Route path="/regulamento" element={<Regulations />} />
                <Route path="/noticias" element={<News />} />
              </Routes>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <footer className="app-footer">
        <div className="container footer-grid">
          <div className="footer-column footer-column--brand footer-brand">
            <div className="footer-brand__logo">
              {logoReady ? (
                <img
                  src="/genesis-logo.png"
                  alt="Genesis Esportes"
                  className="footer-brand__logo-img"
                  onError={() => setLogoReady(false)}
                />
              ) : (
                <Trophy size={28} />
              )}
            </div>
            <p className="footer-description">
              {copy.footer.description}
            </p>
            <div className="footer-social">
              <span className="footer-title footer-title--small">{copy.footer.followUs}</span>
              <div className="footer-social__links">
                <a className="footer-social__link" href="https://www.instagram.com/genesis_esportes/" target="_blank" rel="noreferrer">
                  <Instagram size={16} />
                </a>
                <a className="footer-social__link" href="https://www.facebook.com/genesis.tatames" target="_blank" rel="noreferrer">
                  <Facebook size={16} />
                </a>
                <a className="footer-social__link" href="https://www.youtube.com/channel/UCg9eEbos83Rw4S6fzT4peVA" target="_blank" rel="noreferrer">
                  <Youtube size={16} />
                </a>
              </div>
            </div>
          </div>

          <div className="footer-column footer-column--contact">
            <div className="footer-title">{copy.footer.contact}</div>
            <div className="footer-contact">
              <div className="footer-contact__item">
                <span className="footer-contact__icon"><Phone size={16} /></span>
                <div>
                  <span className="footer-contact__label">{copy.footer.phone}</span>
                  <a className="footer-link" href="tel:+5531993383014">(31) 99338-3014</a>
                </div>
              </div>
              <div className="footer-contact__item">
                <span className="footer-contact__icon"><Mail size={16} /></span>
                <div>
                  <span className="footer-contact__label">{copy.footer.email}</span>
                  <a className="footer-link" href="mailto:contato@genesisesportes.com.br">
                    contato@genesisesportes.com.br
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="footer-column footer-column--location">
            <div className="footer-title">{copy.footer.location}</div>
            <div className="footer-map">
              <div className="footer-map__frame">
                <MapPin size={18} />
                <div>
                  <strong>{copy.footer.mapLabel}</strong>
                  <span>{copy.footer.mapAddress}</span>
                </div>
              </div>
              <a
                className="footer-link footer-link--map"
                href="https://www.google.com/maps?q=Rua+Pains+139+Contagem+MG"
                target="_blank"
                rel="noreferrer"
              >
                {copy.footer.viewMap} <ExternalLink size={12} />
              </a>
            </div>
          </div>

        </div>

        <div className="footer-bottom">
          <div className="container footer-bottom__inner">
            <span>&copy; 2025 Genesis Esportes. {copy.footer.rights}</span>
            <span>CNPJ 27.835.080/0001-51</span>
          </div>
        </div>
      </footer>

      <AnimatePresence>
        {showLogin && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <LoginOverlay onClose={() => setShowLogin(false)} onSuccess={() => setShowLogin(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {eventModalOpen && (
          <>
            <motion.div
              className="modal-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseEventModal}
            />
            <motion.div
              className="modal-card modal-card--event"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
            >
              <div className="modal-panel modal-panel--event">
                <div className="modal-header">
                  <div className="modal-title">{copy.eventModal.title}</div>
                  <button type="button" className="btn btn-ghost" onClick={handleCloseEventModal}>
                    {copy.eventModal.close}
                  </button>
                </div>
                {eventError && (
                  <div className="login-error" role="alert">
                    <AlertCircle size={18} />
                    <p>{eventError}</p>
                  </div>
                )}
                {eventSuccess && (
                  <div className="profile-success" role="status">
                    <p>{eventSuccess}</p>
                  </div>
                )}
                <form onSubmit={handleCreateEvent}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                      <label className="table-meta">{copy.eventModal.name}</label>
                      <input
                        className="input"
                        type="text"
                        value={eventForm.name}
                        onChange={(event) => setEventForm({ ...eventForm, name: event.target.value })}
                        placeholder={copy.eventModal.namePlaceholder}
                        required
                      />
                    </div>
                    <div className="form-grid">
                      <div>
                        <label className="table-meta">{copy.eventModal.date}</label>
                        <input
                          className="input"
                          type="date"
                          value={eventForm.date}
                          onChange={(event) => setEventForm({ ...eventForm, date: event.target.value })}
                        />
                      </div>
                      <div>
                        <label className="table-meta">{copy.eventModal.location}</label>
                        <input
                          className="input"
                          type="text"
                          value={eventForm.location}
                          onChange={(event) => setEventForm({ ...eventForm, location: event.target.value })}
                          placeholder={copy.eventModal.locationPlaceholder}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="table-meta">{copy.eventModal.posterUrl}</label>
                      <input
                        className="input"
                        type="text"
                        value={eventForm.posterUrl}
                        onChange={handleEventPosterUrlChange}
                        placeholder={copy.eventModal.posterUrlPlaceholder}
                      />
                    </div>
                    <div>
                      <label className="table-meta">{copy.eventModal.posterFile}</label>
                      <input
                        className="input"
                        type="file"
                        accept="image/*"
                        onChange={handleEventPosterFileChange}
                      />
                      <div className="table-meta table-meta--tight">{copy.eventModal.posterCompressionHint}</div>
                      {eventPosterStoredSizeBytes > 0 && (
                        <div className="table-meta table-meta--tight">
                          {copy.eventModal.posterCompressedSize}: {formatBytes(eventPosterStoredSizeBytes)}
                        </div>
                      )}
                    </div>
                    {eventForm.posterUrl && (
                      <div>
                        <img
                          src={eventForm.posterUrl}
                          alt="Poster preview"
                          style={{
                            width: '100%',
                            maxHeight: '220px',
                            objectFit: 'cover',
                            borderRadius: '10px',
                            border: '1px solid var(--border)'
                          }}
                        />
                      </div>
                    )}
                    <div>
                      <label className="table-meta">{copy.eventModal.registrationUrl}</label>
                      <input
                        className="input"
                        type="text"
                        value={eventForm.registrationUrl}
                        onChange={(event) => setEventForm({ ...eventForm, registrationUrl: event.target.value })}
                        placeholder={copy.eventModal.registrationUrlPlaceholder}
                      />
                    </div>
                    <div className="form-grid">
                      <div>
                        <label className="table-meta">{copy.eventModal.weightTableGiUrl}</label>
                        <input
                          className="input"
                          type="text"
                          value={eventForm.weightTableGiUrl}
                          onChange={handleWeightTableGiUrlChange}
                          placeholder={copy.eventModal.weightTableGiUrlPlaceholder}
                        />
                        <label className="table-meta table-meta--tight">{copy.eventModal.weightTableGiFile}</label>
                        <input
                          className="input"
                          type="file"
                          accept="image/*,application/pdf"
                          onChange={handleWeightTableGiFileChange}
                        />
                        {eventWeightTableGiStoredSizeBytes > 0 && (
                          <div className="table-meta table-meta--tight">
                            {copy.eventModal.assetStoredSize}: {formatBytes(eventWeightTableGiStoredSizeBytes)}
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="table-meta">{copy.eventModal.weightTableNoGiUrl}</label>
                        <input
                          className="input"
                          type="text"
                          value={eventForm.weightTableNoGiUrl}
                          onChange={handleWeightTableNoGiUrlChange}
                          placeholder={copy.eventModal.weightTableNoGiUrlPlaceholder}
                        />
                        <label className="table-meta table-meta--tight">{copy.eventModal.weightTableNoGiFile}</label>
                        <input
                          className="input"
                          type="file"
                          accept="image/*,application/pdf"
                          onChange={handleWeightTableNoGiFileChange}
                        />
                        {eventWeightTableNoGiStoredSizeBytes > 0 && (
                          <div className="table-meta table-meta--tight">
                            {copy.eventModal.assetStoredSize}: {formatBytes(eventWeightTableNoGiStoredSizeBytes)}
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="table-meta">{copy.eventModal.circularUrl}</label>
                      <input
                        className="input"
                        type="text"
                        value={eventForm.circularUrl}
                        onChange={handleCircularUrlChange}
                        placeholder={copy.eventModal.circularUrlPlaceholder}
                      />
                      <label className="table-meta table-meta--tight">{copy.eventModal.circularFile}</label>
                      <input
                        className="input"
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={handleCircularFileChange}
                      />
                      {eventCircularStoredSizeBytes > 0 && (
                        <div className="table-meta table-meta--tight">
                          {copy.eventModal.assetStoredSize}: {formatBytes(eventCircularStoredSizeBytes)}
                        </div>
                      )}
                    </div>
                    <div className="form-grid">
                      <div>
                        <label className="table-meta">{copy.eventModal.weightTableGiOptions}</label>
                        <textarea
                          className="input"
                          value={eventForm.weightTableGiOptions}
                          onChange={(event) => setEventForm({ ...eventForm, weightTableGiOptions: event.target.value })}
                          placeholder={copy.eventModal.weightTableGiOptionsPlaceholder}
                          rows={4}
                        />
                      </div>
                      <div>
                        <label className="table-meta">{copy.eventModal.weightTableNoGiOptions}</label>
                        <textarea
                          className="input"
                          value={eventForm.weightTableNoGiOptions}
                          onChange={(event) => setEventForm({ ...eventForm, weightTableNoGiOptions: event.target.value })}
                          placeholder={copy.eventModal.weightTableNoGiOptionsPlaceholder}
                          rows={4}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="table-meta">{copy.eventModal.pixKey}</label>
                      <input
                        className="input"
                        type="text"
                        value={eventForm.pixKey}
                        onChange={(event) => setEventForm({ ...eventForm, pixKey: event.target.value })}
                        placeholder={copy.eventModal.pixKeyPlaceholder}
                        required
                      />
                    </div>
                    <div className="form-grid">
                      <div>
                        <label className="table-meta">{copy.eventModal.feeUnder15}</label>
                        <input
                          className="input"
                          type="number"
                          min="0"
                          step="0.01"
                          value={eventForm.feeUnder15}
                          onChange={(event) => setEventForm({ ...eventForm, feeUnder15: event.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <label className="table-meta">{copy.eventModal.feeOver15}</label>
                        <input
                          className="input"
                          type="number"
                          min="0"
                          step="0.01"
                          value={eventForm.feeOver15}
                          onChange={(event) => setEventForm({ ...eventForm, feeOver15: event.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <label className="table-meta">{copy.eventModal.feeCombo}</label>
                        <input
                          className="input"
                          type="number"
                          min="0"
                          step="0.01"
                          value={eventForm.feeCombo}
                          onChange={(event) => setEventForm({ ...eventForm, feeCombo: event.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <label className="table-meta">{copy.eventModal.feeAbsolute}</label>
                        <input
                          className="input"
                          type="number"
                          min="0"
                          step="0.01"
                          value={eventForm.feeAbsolute}
                          onChange={(event) => setEventForm({ ...eventForm, feeAbsolute: event.target.value })}
                          required
                        />
                      </div>
                    </div>
                    <label className="checkbox-inline">
                      <input
                        type="checkbox"
                        checked={eventForm.registrationOpen}
                        onChange={(event) => setEventForm({ ...eventForm, registrationOpen: event.target.checked })}
                      />
                      <span>{copy.eventModal.registrationOpen}</span>
                    </label>
                    <label className="checkbox-inline">
                      <input
                        type="checkbox"
                        checked={eventForm.internalRegistration}
                        onChange={(event) => setEventForm({ ...eventForm, internalRegistration: event.target.checked })}
                      />
                      <span>{copy.eventModal.internalRegistration}</span>
                    </label>
                  </div>
                  <div className="form-actions">
                    <button type="button" className="btn btn-ghost" onClick={handleCloseEventModal}>
                      {copy.eventModal.cancel}
                    </button>
                    <button type="submit" className="btn btn-primary">
                      {copy.eventModal.save}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

function App() {
  return (
    <Router>
      <AppLayout />
    </Router>
  );
}

export default App;

