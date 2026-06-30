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
import CoachManagerPage from './pages/CoachManagerPage';
import { useStore } from './hooks/useStore';
import { useI18n } from './hooks/useI18n';
import LoginOverlay from './components/LoginOverlay';
import { DEFAULT_EVENT_FEES, DEFAULT_EVENT_PIX_KEY } from './utils/eventPricing';
import { compressImage } from './utils/imageUtils';
import './index.css';
import './components/Footer.css';

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
  endDate: '',
  location: '',
  eventDescription: '',
  posterUrl: '',
  registrationUrl: '',
  accommodationEnabled: false,
  accommodationTitle: '',
  accommodationDescription: '',
  beltRegistrationEnabled: false,
  beltRegistrationPhone: '',
  weightTableGiUrl: '',
  weightTableNoGiUrl: '',
  circularUrl: '',
  weightTableGiOptions: '',
  useCustomWeightTableGi: false,
  useCustomWeightTableNoGi: false,
  weightTableNoGiOptions: '',
  pixKey: DEFAULT_EVENT_PIX_KEY,
  batches: [
    {
      id: Date.now().toString(),
      name: 'Lote 1',
      startDate: '',
      endDate: '',
      feeUnder15: DEFAULT_EVENT_FEES.under15,
      feeOver15: DEFAULT_EVENT_FEES.over15,
      feeCombo: DEFAULT_EVENT_FEES.combo,
      feeAbsolute: DEFAULT_EVENT_FEES.absolute
    }
  ],
  registrationOpen: true,
  internalRegistration: true,
  closeOnCapacity: false,
  maxAthletes: ''
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
  const [eventModalTab, setEventModalTab] = useState('info');


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

  const mainProfile = useMemo(() => {
    if (!currentUser || linkedProfiles.length === 0) return null;
    const username = (currentUser.username || '').toLowerCase();
    const currentName = (currentUser.name || '').toLowerCase();

    let best = null;
    let bestScore = 0;

    linkedProfiles.forEach(p => {
      let score = 0;
      if ((p.fullName || '').toLowerCase() === currentName) score += 5;
      if ((p.email || '').toLowerCase() === username) score += 3;
      if (score > bestScore) {
        bestScore = score;
        best = p;
      }
    });

    return bestScore > 0 ? best : null;
  }, [currentUser, linkedProfiles]);

  const otherProfiles = useMemo(() => {
    let filtered = linkedProfiles;
    if (mainProfile) {
      filtered = linkedProfiles.filter(p => p.id !== mainProfile.id);
    }
    const role = (currentUser?.role || '').toString().trim().toLowerCase();
    if (role === 'professor' || role === 'coach') {
      return filtered.slice(0, 2);
    }
    return filtered;
  }, [linkedProfiles, mainProfile, currentUser]);

  const finalAvatar = mainProfile?.photoUrl || mainProfile?.avatarUrl || currentUser?.avatarUrl || currentUser?.avatar || currentUser?.photoUrl;
  const finalName = mainProfile?.fullName || currentUser?.name || currentUser?.fullName || 'Atleta';
  const finalBelt = mainProfile?.belt || currentUser?.belt || 'Branca';

  const currentUserRole = (currentUser?.role || '').toString().trim().toLowerCase();
  const isCoachUser = currentUserRole === 'coach' || currentUserRole === 'professor' || currentUserRole === 'admin';
  const canAccessAdmin = currentUserRole === 'admin';
  const canAccessDashboard = canAccessAdmin || currentUserRole === 'mesario';
  const isAdminRoute = location.pathname.startsWith('/admin');
  const isHomeRoute = location.pathname === '/';
  const isEventsRoute = location.pathname.startsWith('/eventos');
  const isOrganizersRoute = location.pathname.startsWith('/organizadores');
  const isAboutRoute = location.pathname.startsWith('/institucional');
  const isRegulationsRoute = location.pathname.startsWith('/regulamento');
  const isRankingRoute = location.pathname.startsWith('/ranking');
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

  const handleAddBatch = () => {
    setEventForm(prev => ({
      ...prev,
      batches: [
        ...(prev.batches || []),
        {
          id: Date.now().toString() + Math.random().toString(36).substring(2, 7),
          name: `Lote ${(prev.batches?.length || 0) + 1}`,
          startDate: '',
          endDate: '',
          feeUnder15: DEFAULT_EVENT_FEES.under15,
          feeOver15: DEFAULT_EVENT_FEES.over15,
          feeCombo: DEFAULT_EVENT_FEES.combo,
          feeAbsolute: DEFAULT_EVENT_FEES.absolute
        }
      ]
    }));
  };

  const handleRemoveBatch = (indexToRemove) => {
    setEventForm(prev => ({
      ...prev,
      batches: prev.batches.filter((_, idx) => idx !== indexToRemove)
    }));
  };

  const handleBatchChange = (index, field, value) => {
    setEventForm(prev => {
      const newBatches = [...prev.batches];
      newBatches[index] = { ...newBatches[index], [field]: value };
      return { ...prev, batches: newBatches };
    });
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
          ? [
              { label: copy.accountMenu.academy, path: '/academia', icon: Users },
              { label: 'Gerente de Inscrições', path: '/gerente-treinador', icon: Users }
            ]
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
                  
                  {currentUser && otherProfiles.length > 0 && (
                    <div className="account-dropdown-linked">
                      <div className="linked-label">PERFIS LIGADOS</div>
                      {otherProfiles.map(profile => (
                        <Link to={`/minha-conta?profileId=${profile.id}`} key={profile.id} className="linked-profile" style={{ marginBottom: otherProfiles.length > 1 ? '8px' : 0 }}>
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
                </div>
              </div>
              <div className="utility-dropdown utility-dropdown--language">
                <button className="utility-link utility-link--language" type="button" aria-label={copy.utility.language}>
                  {currentLanguage?.flagImages?.[0] && (
                    <img src={currentLanguage.flagImages[0]} alt="" className="utility-flag" style={{ width: '20px', minHeight: 'auto', height: 'auto', objectFit: 'contain', marginRight: '6px', borderRadius: '2px' }} />
                  )}
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
                      style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                      {item.flagImages?.[0] && (
                        <img src={item.flagImages[0]} alt="" className="utility-flag" style={{ width: '24px', minHeight: 'auto', height: 'auto', objectFit: 'contain', borderRadius: '2px' }} />
                      )}
                      <span className="utility-language-labels" style={{ textAlign: 'left' }}>
                        <span style={{ fontWeight: 500 }}>{item.label}</span>
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

      <main className={`app-main ${isAdminRoute ? 'app-main--admin' : ''} ${(isEventsRoute || isOrganizersRoute || isAboutRoute || isRegulationsRoute || isRankingRoute) ? 'app-main--full' : ''}`}>
        <div className={`container ${isAdminRoute ? 'container--admin' : ''} ${isHomeRoute ? 'container--home' : ''} ${(isEventsRoute || isOrganizersRoute || isAboutRoute || isRegulationsRoute || isRankingRoute) ? 'container--full' : ''}`}>
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
                <Route path="/perfil-publico/:athleteId" element={<PublicProfile />} />
                <Route path="/ranking" element={<Ranking />} />
                <Route path="/ranking-equipes" element={<TeamRanking />} />
                <Route path="/atletas" element={<Athletes />} />
                <Route path="/equipes" element={<Teams />} />
                <Route path="/equipe/:academyId" element={<TeamProfile />} />
                <Route path="/filiacao" element={<Membership />} />
                <Route path="/academia" element={<Membership />} />
                <Route path="/registro-academia" element={<AcademyRegistration />} />
                <Route path="/gerente-treinador" element={<CoachManagerPage />} />
                <Route path="/minha-conta" element={<MyAccount />} />
                <Route path="/configuracoes" element={<SettingsPage />} />
                <Route path="/regulamento" element={<Regulations />} />
                <Route path="/noticias" element={<News />} />
              </Routes>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {isHomeRoute && (
        <div className="genesis-cta-section" style={{ backgroundImage: 'url(/cta_background.png)' }}>
          <div className="genesis-cta-overlay"></div>
          <div className="genesis-cta-content">
            <h2 className="genesis-cta-title">Prepare-se para o Próximo Nível.</h2>
            <p className="genesis-cta-text">A maior plataforma de gestão de lutas do Brasil. Organize, compita e vença.</p>
            <Link to="/eventos" className="genesis-cta-button">COMEÇAR AGORA</Link>
          </div>
        </div>
      )}

      <footer className="genesis-footer">
        <div className="genesis-footer-container">
          <div className="genesis-footer-top">
            <div className="genesis-footer-brand">
              {logoReady ? (
                <img
                  src="/genesis-logo.png"
                  alt="Genesis Esportes"
                  className="genesis-footer-logo"
                  onError={() => setLogoReady(false)}
                />
              ) : (
                <div className="genesis-footer-logo-placeholder">
                  <Trophy size={28} />
                  <span>GENESIS ESPORTES</span>
                </div>
              )}
            </div>

            <div className="genesis-footer-links">
              <div className="genesis-footer-col">
                <h4 className="genesis-footer-title">ATLETAS</h4>
                <Link to="/ranking">Ranking</Link>
                <Link to="/atletas">Atletas</Link>
                <Link to="/filiacao">Filiação</Link>
                <Link to="/regulamento">Regulamento</Link>
              </div>

              <div className="genesis-footer-col">
                <h4 className="genesis-footer-title">ORGANIZADOR</h4>
                <Link to="/organizadores">Torne-se um organizador</Link>
                <Link to="/admin">Plataforma de Federação</Link>
                <a href="mailto:contato@genesisesportes.com.br">Suporte</a>
              </div>

              <div className="genesis-footer-col">
                <h4 className="genesis-footer-title">COMUNIDADE</h4>
                <Link to="/equipes">Academias e Equipes</Link>
                <Link to="/ranking-equipes">Ranking de Equipes</Link>
                <Link to="/institucional">Sobre nós</Link>
              </div>
            </div>
          </div>

          <div className="genesis-footer-bottom">
            <div className="genesis-footer-bottom-left">
              <span>Genesis Esportes, Brasil</span>
              <span className="genesis-footer-separator">|</span>
              <Link to="/regulamento">Contratos</Link>
              <Link to="/institucional">Privacy Policy</Link>
              <Link to="/institucional">Sobre nós</Link>
            </div>
            
            <div className="genesis-footer-bottom-right">
              <a href="https://www.youtube.com/channel/UCg9eEbos83Rw4S6fzT4peVA" target="_blank" rel="noreferrer" aria-label="Youtube">
                <Youtube size={18} />
              </a>
              <a href="https://www.facebook.com/genesis.tatames" target="_blank" rel="noreferrer" aria-label="Facebook">
                <Facebook size={18} />
              </a>
              <a href="https://www.instagram.com/genesis_esportes/" target="_blank" rel="noreferrer" aria-label="Instagram">
                <Instagram size={18} />
              </a>
            </div>
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
              className="modal-card"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              style={{ padding: 0 }}
            >
              <div className="modal-panel" style={{ padding: 0, overflow: 'hidden', width: '100vw', height: '100vh', maxWidth: '100vw', maxHeight: '100vh', borderRadius: 0 }}>

                {/* ── Header com abas ──────────────────────── */}
                <div style={{ background: 'linear-gradient(135deg,#0f172a 0%,#1e293b 100%)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '32px 40px 0 40px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.12em', color: 'var(--brand-primary,#00c2cb)', textTransform: 'uppercase', marginBottom: '8px' }}>Genesis Sports · Admin</div>
                      <div className="modal-title" style={{ fontSize: '28px', margin: 0 }}>{copy.eventModal.title}</div>
                      {eventForm.name && <div style={{ fontSize: '15px', color: '#94a3b8', marginTop: '6px' }}>{eventForm.name}</div>}
                    </div>
                    <button type="button" className="btn btn-ghost" onClick={handleCloseEventModal} style={{ alignSelf: 'flex-start' }}>{copy.eventModal.close}</button>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {[{ id: 'info', label: '📋 Informações Básicas' }, { id: 'registration', label: '💰 Inscrições e Valores' }, { id: 'documents', label: '⚖️ Tabelas e Documentos' }].map(tab => (
                      <button key={tab.id} type="button" onClick={() => setEventModalTab(tab.id)} style={{ padding: '12px 24px', fontSize: '15px', fontWeight: eventModalTab === tab.id ? 700 : 500, color: eventModalTab === tab.id ? 'var(--brand-primary,#00c2cb)' : '#64748b', background: 'transparent', border: 'none', borderBottom: eventModalTab === tab.id ? '3px solid var(--brand-primary,#00c2cb)' : '3px solid transparent', borderRadius: 0, cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap' }}>{tab.label}</button>
                    ))}
                  </div>
                </div>

                {/* ── Erros / Sucesso ──────────────────────── */}
                {eventError && (<div className="login-error" role="alert" style={{ margin: '16px 32px 0 32px', borderRadius: '10px' }}><AlertCircle size={18} /><p>{eventError}</p></div>)}
                {eventSuccess && (<div className="profile-success" role="status" style={{ margin: '16px 32px 0 32px', borderRadius: '10px' }}><p>{eventSuccess}</p></div>)}

                <form onSubmit={handleCreateEvent}>
                  <div style={{ padding: '32px 40px', minHeight: '520px', maxHeight: '65vh', overflowY: 'auto' }}>

                    {/* ── TAB 1 ──────────────────────────────── */}
                    {eventModalTab === 'info' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <div>
                          <label className="table-meta" style={{ fontSize: '14px', fontWeight: 700, marginBottom: '10px', display: 'block', color: '#94a3b8' }}>NOME DO EVENTO *</label>
                          <input className="input" type="text" value={eventForm.name} onChange={e => setEventForm({ ...eventForm, name: e.target.value })} placeholder={copy.eventModal.namePlaceholder} required style={{ fontSize: '18px', padding: '16px 20px', fontWeight: 600 }} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                          <div>
                            <label className="table-meta" style={{ fontSize: '14px', fontWeight: 700, marginBottom: '10px', display: 'block', color: '#94a3b8' }}>DATA DO EVENTO (DIA 1) *</label>
                            <input className="input" type="date" value={eventForm.date} onChange={e => setEventForm({ ...eventForm, date: e.target.value })} required style={{ fontSize: '17px', padding: '14px 18px' }} />
                          </div>
                          <div>
                            <label className="table-meta" style={{ fontSize: '14px', fontWeight: 700, marginBottom: '10px', display: 'block', color: '#94a3b8' }}>DATA DO EVENTO (DIA 2 - opcional)</label>
                            <input className="input" type="date" value={eventForm.endDate} onChange={e => setEventForm({ ...eventForm, endDate: e.target.value })} style={{ fontSize: '17px', padding: '14px 18px' }} />
                          </div>
                        </div>
                        <div>
                          <label className="table-meta" style={{ fontSize: '14px', fontWeight: 700, marginBottom: '10px', display: 'block', color: '#94a3b8' }}>LOCAL / ARENA</label>
                          <input className="input" type="text" value={eventForm.location} onChange={e => setEventForm({ ...eventForm, location: e.target.value })} placeholder={copy.eventModal.locationPlaceholder} style={{ fontSize: '17px', padding: '14px 18px' }} />
                        </div>
                        <div>
                          <label className="table-meta" style={{ fontSize: '14px', fontWeight: 700, marginBottom: '10px', display: 'block', color: '#94a3b8' }}>DESCRIÇÃO COMPLETA DO EVENTO</label>
                          <textarea className="input" rows="4" value={eventForm.eventDescription} onChange={e => setEventForm({ ...eventForm, eventDescription: e.target.value })} placeholder="Ex: Regras da IBJJF, premiações especiais em dinheiro, etc..." style={{ fontSize: '16px', padding: '16px 20px', resize: 'vertical' }}></textarea>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${eventForm.accommodationEnabled ? '#00c2cb44' : 'rgba(255,255,255,0.06)'}`, borderRadius: '14px', padding: '24px', marginTop: '10px', transition: 'all 0.2s' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: eventForm.accommodationEnabled ? '20px' : '0', cursor: 'pointer' }} onClick={() => {
                            const isChecked = !eventForm.accommodationEnabled;
                            const updates = { accommodationEnabled: isChecked };
                            if (isChecked && eventForm.location && (!eventForm.accommodationDescription || eventForm.accommodationDescription.trim() === '')) {
                              const loc = eventForm.location;
                              const encodedLoc = encodeURIComponent(loc);
                              updates.accommodationTitle = `Hospedagem Recomendada`;
                              updates.accommodationDescription = `Ficar perto da arena é essencial para seu descanso e foco na competição!\n\nProcurando onde ficar em ${loc}?\n\n🏡 Airbnb: https://www.airbnb.com.br/s/${encodedLoc}/homes\n🏨 Booking: https://www.booking.com/searchresults.pt-br.html?ss=${encodedLoc}`;
                            }
                            setEventForm({ ...eventForm, ...updates });
                          }}>
                            <div>
                              <div style={{ fontSize: '16px', fontWeight: 700, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '8px' }}>🛌 Opções de Hospedagem</div>
                              <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>Habilita informações de hotel/alojamento na página do evento</div>
                            </div>
                            <div style={{ flexShrink: 0, width: '56px', height: '32px', borderRadius: '16px', background: eventForm.accommodationEnabled ? '#00c2cb' : '#334155', position: 'relative', transition: 'background 0.2s' }}>
                              <div style={{ position: 'absolute', top: '4px', left: eventForm.accommodationEnabled ? '28px' : '4px', width: '24px', height: '24px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
                            </div>
                          </div>
                          {eventForm.accommodationEnabled && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                              <div>
                                <label className="table-meta" style={{ fontSize: '13px', fontWeight: 700, marginBottom: '8px', display: 'block', color: '#94a3b8' }}>Título (Ex: Hotel Oficial)</label>
                                <input className="input" type="text" value={eventForm.accommodationTitle} onChange={e => setEventForm({ ...eventForm, accommodationTitle: e.target.value })} placeholder="Hotel Parceiro" style={{ fontSize: '15px' }} />
                              </div>
                              <div>
                                <label className="table-meta" style={{ fontSize: '13px', fontWeight: 700, marginBottom: '8px', display: 'block', color: '#94a3b8' }}>Descrição / Preço / Contato</label>
                                <textarea className="input" rows="6" value={eventForm.accommodationDescription} onChange={e => setEventForm({ ...eventForm, accommodationDescription: e.target.value })} placeholder="Diárias a partir de R$ 100. Fale com (11) 9999-9999" style={{ fontSize: '15px', resize: 'vertical', lineHeight: '1.5' }}></textarea>
                              </div>
                            </div>
                          )}
                        </div>
                        <div>
                          <label className="table-meta" style={{ fontSize: '14px', fontWeight: 700, marginBottom: '10px', display: 'block', color: '#94a3b8' }}>URL DO CARTAZ (opcional)</label>
                          <input className="input" type="text" value={eventForm.posterUrl} onChange={handleEventPosterUrlChange} placeholder={copy.eventModal.posterUrlPlaceholder} style={{ fontSize: '15px' }} />
                        </div>
                        <div>
                          <label className="table-meta" style={{ fontSize: '14px', fontWeight: 700, marginBottom: '10px', display: 'block', color: '#94a3b8' }}>ENVIAR ARQUIVO DO CARTAZ</label>
                          <input className="input" type="file" accept="image/*" onChange={handleEventPosterFileChange} style={{ fontSize: '15px' }} />
                          <div className="table-meta table-meta--tight" style={{ marginTop: '6px', fontSize: '13px' }}>{copy.eventModal.posterCompressionHint}</div>
                          {eventPosterStoredSizeBytes > 0 && <div className="table-meta table-meta--tight" style={{ fontSize: '13px' }}>{copy.eventModal.posterCompressedSize}: {formatBytes(eventPosterStoredSizeBytes)}</div>}
                        </div>
                        {eventForm.posterUrl && (
                          <div style={{ borderRadius: '14px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', maxHeight: '360px' }}>
                            <img src={eventForm.posterUrl} alt="Poster preview" style={{ width: '100%', maxHeight: '360px', objectFit: 'cover', display: 'block' }} />
                          </div>
                        )}
                      </div>
                    )}

                    {/* ── TAB 2 ──────────────────────────────── */}
                    {eventModalTab === 'registration' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                        {/* Toggle switches */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                          {[
                            { label: 'Inscrições Abertas', desc: 'Permite que atletas se inscrevam neste evento.', key: 'registrationOpen', icon: '🟢', activeColor: '#22c55e' },
                            { label: 'Inscrição pelo Sistema Genesis', desc: 'Usa o fluxo interno de pagamento. Desative para usar link externo.', key: 'internalRegistration', icon: '🔗', activeColor: 'var(--brand-primary,#00c2cb)' },
                          ].map(toggle => (
                            <div key={toggle.key} onClick={() => setEventForm(f => ({ ...f, [toggle.key]: !f[toggle.key] }))} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${eventForm[toggle.key] ? toggle.activeColor + '44' : 'rgba(255,255,255,0.06)'}`, borderRadius: '14px', padding: '24px', cursor: 'pointer', transition: 'all 0.2s' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                                <div>
                                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#e2e8f0', marginBottom: '8px' }}>{toggle.icon} {toggle.label}</div>
                                  <div style={{ fontSize: '14px', color: '#94a3b8', lineHeight: 1.5 }}>{toggle.desc}</div>
                                </div>
                                <div style={{ flexShrink: 0, width: '56px', height: '32px', borderRadius: '16px', background: eventForm[toggle.key] ? toggle.activeColor : '#334155', position: 'relative', transition: 'background 0.2s' }}>
                                  <div style={{ position: 'absolute', top: '4px', left: eventForm[toggle.key] ? '28px' : '4px', width: '24px', height: '24px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        {!eventForm.internalRegistration && (
                          <div>
                            <label className="table-meta" style={{ fontSize: '14px', fontWeight: 700, marginBottom: '10px', display: 'block', color: '#94a3b8' }}>URL DE INSCRIÇÃO EXTERNA</label>
                            <input className="input" type="text" value={eventForm.registrationUrl} onChange={e => setEventForm({ ...eventForm, registrationUrl: e.target.value })} placeholder={copy.eventModal.registrationUrlPlaceholder} style={{ fontSize: '17px', padding: '14px 18px' }} />
                          </div>
                        )}
                        <div>
                          <label className="table-meta" style={{ fontSize: '14px', fontWeight: 700, marginBottom: '10px', display: 'block', color: '#94a3b8' }}>CHAVE PIX (responsável pelo campeonato) *</label>
                          <input className="input" type="text" value={eventForm.pixKey} onChange={e => setEventForm({ ...eventForm, pixKey: e.target.value })} placeholder={copy.eventModal.pixKeyPlaceholder} required style={{ fontSize: '18px', padding: '16px 20px' }} />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '24px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: eventForm.closeOnCapacity ? '20px' : '0' }}>
                              <div>
                                <div style={{ fontSize: '16px', fontWeight: 700, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '8px' }}>🚫 Fechar inscrições automaticamente</div>
                                <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>Encerra as inscrições ao atingir o limite.</div>
                              </div>
                              <div className="ios-toggle-wrapper">
                                <input type="checkbox" id="capacity-toggle" checked={eventForm.closeOnCapacity} onChange={e => setEventForm({ ...eventForm, closeOnCapacity: e.target.checked })} />
                                <label htmlFor="capacity-toggle" className="ios-toggle-label"></label>
                              </div>
                            </div>
                            {eventForm.closeOnCapacity && (
                              <div>
                                <label className="table-meta" style={{ fontSize: '13px', fontWeight: 700, marginBottom: '8px', display: 'block', color: '#94a3b8' }}>Quantidade Máxima de Atletas</label>
                                <input className="input" type="number" value={eventForm.maxAthletes} onChange={e => setEventForm({ ...eventForm, maxAthletes: e.target.value })} placeholder="Ex: 500" style={{ fontSize: '15px' }} />
                              </div>
                            )}
                          </div>

                          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '24px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: eventForm.beltRegistrationEnabled ? '20px' : '0' }}>
                              <div>
                                <div style={{ fontSize: '16px', fontWeight: 700, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '8px' }}>🥊 Cinturão / Super Lutas</div>
                                <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>Venda acesso direto com organizador no Whatsapp.</div>
                              </div>
                              <div className="ios-toggle-wrapper">
                                <input type="checkbox" id="belt-toggle" checked={eventForm.beltRegistrationEnabled} onChange={e => setEventForm({ ...eventForm, beltRegistrationEnabled: e.target.checked })} />
                                <label htmlFor="belt-toggle" className="ios-toggle-label"></label>
                              </div>
                            </div>
                            {eventForm.beltRegistrationEnabled && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div>
                                  <label className="table-meta" style={{ fontSize: '13px', fontWeight: 700, marginBottom: '8px', display: 'block', color: '#94a3b8' }}>Telefone WhatsApp</label>
                                  <input className="input" type="text" value={eventForm.beltRegistrationPhone} onChange={e => setEventForm({ ...eventForm, beltRegistrationPhone: e.target.value })} placeholder="Ex: 11999999999" style={{ fontSize: '15px' }} />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '24px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <div style={{ fontSize: '18px', fontWeight: 700, color: '#e2e8f0', letterSpacing: '0.04em' }}>Lotes de Inscrição</div>
                            <button type="button" className="btn btn-secondary" onClick={handleAddBatch} style={{ padding: '10px 16px', fontSize: '14px' }}>+ Adicionar Lote</button>
                          </div>
                          
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                            {(eventForm.batches || []).map((batch, index) => (
                              <div key={batch.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '24px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#00c2cb' }}>Lote {index + 1}</div>
                                  {index > 0 && (
                                    <button type="button" className="btn btn-ghost" onClick={() => handleRemoveBatch(index)} style={{ color: '#ef4444', padding: '6px 12px', fontSize: '13px' }}>Remover</button>
                                  )}
                                </div>
                                
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                                  <div>
                                    <label className="table-meta" style={{ fontSize: '13px', fontWeight: 700, marginBottom: '8px', display: 'block', color: '#94a3b8' }}>Nome do Lote</label>
                                    <input className="input" type="text" value={batch.name} onChange={e => handleBatchChange(index, 'name', e.target.value)} required style={{ fontSize: '16px', padding: '12px 16px' }} />
                                  </div>
                                  <div>
                                    <label className="table-meta" style={{ fontSize: '13px', fontWeight: 700, marginBottom: '8px', display: 'block', color: '#94a3b8' }}>Data/Hora de Início (opcional)</label>
                                    <input className="input" type="datetime-local" value={batch.startDate} onChange={e => handleBatchChange(index, 'startDate', e.target.value)} style={{ fontSize: '15px', padding: '12px 16px' }} />
                                  </div>
                                  <div>
                                    <label className="table-meta" style={{ fontSize: '13px', fontWeight: 700, marginBottom: '8px', display: 'block', color: '#94a3b8' }}>Data/Hora de Fim (opcional)</label>
                                    <input className="input" type="datetime-local" value={batch.endDate} onChange={e => handleBatchChange(index, 'endDate', e.target.value)} style={{ fontSize: '15px', padding: '12px 16px' }} />
                                  </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '16px' }}>
                                  {[
                                    { label: 'Sub-15 (até 14 anos)', key: 'feeUnder15', emoji: '🧒', color: '#3b82f6' },
                                    { label: 'Adulto (15+ anos)', key: 'feeOver15', emoji: '🥋', color: '#00c2cb' },
                                    { label: 'Combo (Gi + No-Gi)', key: 'feeCombo', emoji: '🎯', color: '#f59e0b' },
                                    { label: 'Absoluto (+valor base)', key: 'feeAbsolute', emoji: '🏆', color: '#a78bfa' },
                                  ].map(fee => (
                                    <div key={fee.key} style={{ background: `${fee.color}11`, border: `1px solid ${fee.color}33`, borderRadius: '16px', padding: '24px' }}>
                                      <div style={{ fontSize: '32px', marginBottom: '12px' }}>{fee.emoji}</div>
                                      <div style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '14px', lineHeight: 1.4, fontWeight: 600 }}>{fee.label}</div>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ color: '#64748b', fontSize: '18px', fontWeight: 700 }}>R$</span>
                                        <input className="input" type="number" min="0" step="0.01" value={batch[fee.key]} onChange={e => handleBatchChange(index, fee.key, e.target.value)} required style={{ fontSize: '32px', fontWeight: 800, color: fee.color, background: 'transparent', border: 'none', borderBottom: `2px solid ${fee.color}55`, borderRadius: 0, padding: '4px 0', width: '100%' }} />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ── TAB 3 ──────────────────────────────── */}
                    {eventModalTab === 'documents' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>

                        {/* ── Info Banner ─── */}
                        <div style={{ background: 'rgba(0,194,203,0.07)', border: '1px solid rgba(0,194,203,0.2)', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                          <span style={{ fontSize: '22px', flexShrink: 0 }}>ℹ️</span>
                          <div>
                            <div style={{ fontSize: '14px', fontWeight: 700, color: '#00c2cb', marginBottom: '4px' }}>Tabelas Predefinidas Ativas</div>
                            <div style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.6 }}>
                              Por padrão, o sistema usa as <strong style={{ color: '#e2e8f0' }}>tabelas oficiais Genesis Sports</strong> com todas as categorias de peso. Se quiser usar uma tabela própria do seu evento, ative a opção abaixo e carregue o arquivo.
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>

                          {/* ── GI ─── */}
                          <div style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${eventForm.useCustomWeightTableGi ? '#00c2cb44' : 'rgba(255,255,255,0.06)'}`, borderRadius: '16px', padding: '28px', transition: 'border-color 0.2s' }}>
                            <div style={{ fontSize: '18px', fontWeight: 700, color: '#e2e8f0', marginBottom: '16px' }}>🥋 Tabela de Peso — GI</div>

                            {/* Predefined Preview */}
                            {!eventForm.useCustomWeightTableGi && (
                              <div style={{ background: 'rgba(0,194,203,0.05)', border: '1px dashed rgba(0,194,203,0.3)', borderRadius: '10px', padding: '16px', marginBottom: '20px' }}>
                                <div style={{ fontSize: '12px', fontWeight: 700, color: '#00c2cb', marginBottom: '10px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>✅ Tabela Padrão Genesis (em uso)</div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                                  {[
                                    ['Galo', 'até 57,5 kg'], ['Pluma', 'até 64 kg'], ['Pena', 'até 70 kg'],
                                    ['Leve', 'até 76 kg'], ['Médio', 'até 82,3 kg'], ['Meio-Pesado', 'até 88,3 kg'],
                                    ['Pesado', 'até 94,3 kg'], ['Super-Pesado', 'até 100,5 kg'], ['Pesadíssimo', 'acima de 100,5 kg'],
                                  ].map(([cat, weight]) => (
                                    <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b', padding: '4px 8px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
                                      <span style={{ color: '#94a3b8', fontWeight: 600 }}>{cat}</span>
                                      <span style={{ color: '#64748b' }}>{weight}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Custom Toggle */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '12px 0', borderTop: '1px solid rgba(255,255,255,0.06)' }} onClick={() => setEventForm(f => ({ ...f, useCustomWeightTableGi: !f.useCustomWeightTableGi }))}>
                              <div>
                                <div style={{ fontSize: '14px', fontWeight: 700, color: eventForm.useCustomWeightTableGi ? '#00c2cb' : '#e2e8f0' }}>Usar tabela personalizada (GI)</div>
                                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>Substitui a tabela padrão pela sua imagem/PDF</div>
                              </div>
                              <div style={{ flexShrink: 0, width: '48px', height: '28px', borderRadius: '14px', background: eventForm.useCustomWeightTableGi ? '#00c2cb' : '#334155', position: 'relative', transition: 'background 0.2s' }}>
                                <div style={{ position: 'absolute', top: '3px', left: eventForm.useCustomWeightTableGi ? '23px' : '3px', width: '22px', height: '22px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
                              </div>
                            </div>

                            {eventForm.useCustomWeightTableGi && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
                                <div>
                                  <label className="table-meta" style={{ fontSize: '13px', marginBottom: '8px', display: 'block', color: '#94a3b8', fontWeight: 700 }}>URL da Tabela (imagem/PDF)</label>
                                  <input className="input" type="text" value={eventForm.weightTableGiUrl} onChange={handleWeightTableGiUrlChange} placeholder={copy.eventModal.weightTableGiUrlPlaceholder} style={{ fontSize: '15px' }} />
                                </div>
                                <div>
                                  <label className="table-meta" style={{ fontSize: '13px', marginBottom: '8px', display: 'block', color: '#94a3b8', fontWeight: 700 }}>Enviar arquivo da tabela GI</label>
                                  <input className="input" type="file" accept="image/*,application/pdf" onChange={handleWeightTableGiFileChange} style={{ fontSize: '15px' }} />
                                  {eventWeightTableGiStoredSizeBytes > 0 && <div className="table-meta table-meta--tight" style={{ fontSize: '13px', marginTop: '6px' }}>{copy.eventModal.assetStoredSize}: {formatBytes(eventWeightTableGiStoredSizeBytes)}</div>}
                                </div>
                                <div>
                                  <label className="table-meta" style={{ fontSize: '13px', marginBottom: '8px', display: 'block', color: '#94a3b8', fontWeight: 700 }}>{copy.eventModal.weightTableGiOptions}</label>
                                  <textarea className="input" value={eventForm.weightTableGiOptions} onChange={e => setEventForm({ ...eventForm, weightTableGiOptions: e.target.value })} placeholder={copy.eventModal.weightTableGiOptionsPlaceholder} rows={5} style={{ fontSize: '15px' }} />
                                </div>
                              </div>
                            )}
                          </div>

                          {/* ── NO-GI ─── */}
                          <div style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${eventForm.useCustomWeightTableNoGi ? '#f59e0b44' : 'rgba(255,255,255,0.06)'}`, borderRadius: '16px', padding: '28px', transition: 'border-color 0.2s' }}>
                            <div style={{ fontSize: '18px', fontWeight: 700, color: '#e2e8f0', marginBottom: '16px' }}>🩳 Tabela de Peso — NO-GI</div>

                            {/* Predefined Preview */}
                            {!eventForm.useCustomWeightTableNoGi && (
                              <div style={{ background: 'rgba(245,158,11,0.05)', border: '1px dashed rgba(245,158,11,0.3)', borderRadius: '10px', padding: '16px', marginBottom: '20px' }}>
                                <div style={{ fontSize: '12px', fontWeight: 700, color: '#f59e0b', marginBottom: '10px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>✅ Tabela Padrão Genesis (em uso)</div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                                  {[
                                    ['Galo', 'até 58,5 kg'], ['Pluma', 'até 65,8 kg'], ['Pena', 'até 73,9 kg'],
                                    ['Leve', 'até 83 kg'], ['Médio', 'até 92,5 kg'], ['Meio-Pesado', 'até 102,3 kg'],
                                    ['Pesado', 'até 112,5 kg'], ['Super-Pesado', 'acima de 112,5 kg'],
                                  ].map(([cat, weight]) => (
                                    <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b', padding: '4px 8px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
                                      <span style={{ color: '#94a3b8', fontWeight: 600 }}>{cat}</span>
                                      <span style={{ color: '#64748b' }}>{weight}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Custom Toggle */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '12px 0', borderTop: '1px solid rgba(255,255,255,0.06)' }} onClick={() => setEventForm(f => ({ ...f, useCustomWeightTableNoGi: !f.useCustomWeightTableNoGi }))}>
                              <div>
                                <div style={{ fontSize: '14px', fontWeight: 700, color: eventForm.useCustomWeightTableNoGi ? '#f59e0b' : '#e2e8f0' }}>Usar tabela personalizada (NO-GI)</div>
                                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>Substitui a tabela padrão pela sua imagem/PDF</div>
                              </div>
                              <div style={{ flexShrink: 0, width: '48px', height: '28px', borderRadius: '14px', background: eventForm.useCustomWeightTableNoGi ? '#f59e0b' : '#334155', position: 'relative', transition: 'background 0.2s' }}>
                                <div style={{ position: 'absolute', top: '3px', left: eventForm.useCustomWeightTableNoGi ? '23px' : '3px', width: '22px', height: '22px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
                              </div>
                            </div>

                            {eventForm.useCustomWeightTableNoGi && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
                                <div>
                                  <label className="table-meta" style={{ fontSize: '13px', marginBottom: '8px', display: 'block', color: '#94a3b8', fontWeight: 700 }}>URL da Tabela (imagem/PDF)</label>
                                  <input className="input" type="text" value={eventForm.weightTableNoGiUrl} onChange={handleWeightTableNoGiUrlChange} placeholder={copy.eventModal.weightTableNoGiUrlPlaceholder} style={{ fontSize: '15px' }} />
                                </div>
                                <div>
                                  <label className="table-meta" style={{ fontSize: '13px', marginBottom: '8px', display: 'block', color: '#94a3b8', fontWeight: 700 }}>Enviar arquivo da tabela NO-GI</label>
                                  <input className="input" type="file" accept="image/*,application/pdf" onChange={handleWeightTableNoGiFileChange} style={{ fontSize: '15px' }} />
                                  {eventWeightTableNoGiStoredSizeBytes > 0 && <div className="table-meta table-meta--tight" style={{ fontSize: '13px', marginTop: '6px' }}>{copy.eventModal.assetStoredSize}: {formatBytes(eventWeightTableNoGiStoredSizeBytes)}</div>}
                                </div>
                                <div>
                                  <label className="table-meta" style={{ fontSize: '13px', marginBottom: '8px', display: 'block', color: '#94a3b8', fontWeight: 700 }}>{copy.eventModal.weightTableNoGiOptions}</label>
                                  <textarea className="input" value={eventForm.weightTableNoGiOptions} onChange={e => setEventForm({ ...eventForm, weightTableNoGiOptions: e.target.value })} placeholder={copy.eventModal.weightTableNoGiOptionsPlaceholder} rows={5} style={{ fontSize: '15px' }} />
                                </div>
                              </div>
                            )}
                          </div>

                        </div>

                        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '28px' }}>
                          <div style={{ fontSize: '18px', fontWeight: 700, color: '#e2e8f0', marginBottom: '20px' }}>📄 Circular / Regulamento</div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div>
                              <label className="table-meta" style={{ fontSize: '13px', marginBottom: '8px', display: 'block', color: '#94a3b8', fontWeight: 700 }}>URL da Circular (PDF)</label>
                              <input className="input" type="text" value={eventForm.circularUrl} onChange={handleCircularUrlChange} placeholder={copy.eventModal.circularUrlPlaceholder} style={{ fontSize: '15px' }} />
                            </div>
                            <div>
                              <label className="table-meta" style={{ fontSize: '13px', marginBottom: '8px', display: 'block', color: '#94a3b8', fontWeight: 700 }}>Enviar arquivo da circular</label>
                              <input className="input" type="file" accept="image/*,application/pdf" onChange={handleCircularFileChange} style={{ fontSize: '15px' }} />
                              {eventCircularStoredSizeBytes > 0 && <div className="table-meta table-meta--tight" style={{ fontSize: '13px', marginTop: '6px' }}>{copy.eventModal.assetStoredSize}: {formatBytes(eventCircularStoredSizeBytes)}</div>}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                  </div>

                  {/* ── Rodapé ────────────────────────────────── */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 40px', borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.2)' }}>
                    <button type="button" className="btn btn-ghost" onClick={handleCloseEventModal} style={{ fontSize: '16px', padding: '12px 20px' }}>{copy.eventModal.cancel}</button>
                    <div style={{ display: 'flex', gap: '16px' }}>
                      {eventModalTab !== 'info' && (
                        <button type="button" className="btn btn-ghost" onClick={() => setEventModalTab(eventModalTab === 'documents' ? 'registration' : 'info')} style={{ fontSize: '16px', padding: '12px 20px' }}>← Anterior</button>
                      )}
                      {eventModalTab !== 'documents' && (
                        <button type="button" className="btn btn-secondary" onClick={() => setEventModalTab(eventModalTab === 'info' ? 'registration' : 'documents')} style={{ fontSize: '16px', padding: '12px 24px' }}>Próxima Aba →</button>
                      )}
                      <button type="submit" className="btn btn-primary" style={{ minWidth: '160px', fontSize: '16px', padding: '12px 24px' }}>{copy.eventModal.save}</button>
                    </div>
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

