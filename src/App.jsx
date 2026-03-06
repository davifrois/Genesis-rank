import React, { useMemo, useState } from 'react';
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
  Trophy,
  User,
  Users,
  Youtube,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import About from './pages/About';
import Athletes from './pages/Athletes';
import Dashboard from './pages/Dashboard';
import Events from './pages/Events';
import EventDetails from './pages/EventDetails';
import Home from './pages/Home';
import Membership from './pages/Membership';
import MyAccount from './pages/MyAccount';
import News from './pages/News';
import Regulations from './pages/Regulations';
import Ranking from './pages/Ranking';
import TeamRanking from './pages/TeamRanking';
import EventRegistration from './pages/EventRegistration';
import { useStore } from './hooks/useStore';
import { useI18n } from './hooks/useI18n';
import LoginOverlay from './components/LoginOverlay';
import { DEFAULT_EVENT_FEES, DEFAULT_EVENT_PIX_KEY } from './utils/eventPricing';
import './index.css';

const MAX_EVENT_POSTER_UPLOAD_BYTES = 8_000_000;
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
  pixKey: DEFAULT_EVENT_PIX_KEY,
  feeUnder15: DEFAULT_EVENT_FEES.under15,
  feeOver15: DEFAULT_EVENT_FEES.over15,
  feeCombo: DEFAULT_EVENT_FEES.combo,
  feeAbsolute: DEFAULT_EVENT_FEES.absolute,
  registrationOpen: true,
  internalRegistration: true
});

const isDataImageUrl = (value) => /^data:image\//i.test((value || '').toString().trim());

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

const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
  reader.onerror = () => reject(new Error('Falha ao ler o arquivo.'));
  reader.readAsDataURL(file);
});

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
    eventModalOpen,
    closeEventModal,
    addEvent,
    logout
  } = useStore();
  const location = useLocation();
  const [logoReady, setLogoReady] = useState(true);
  const [eventForm, setEventForm] = useState(createEventFormState);
  const [eventError, setEventError] = useState('');
  const [showLogin, setShowLogin] = useState(false);
  const currentUserRole = (currentUser?.role || '').toString().trim().toLowerCase();
  const canAccessAdmin = currentUserRole === 'admin';
  const canAccessDashboard = canAccessAdmin || currentUserRole === 'mesario';
  const isAdminRoute = location.pathname === '/admin';
  const isHomeRoute = location.pathname === '/';
  const { language, setLanguage, currentLanguage, languages } = useI18n();
  const isEnglish = language === 'en-US';
  const [eventPosterStoredSizeBytes, setEventPosterStoredSizeBytes] = useState(0);

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
            membership: 'Membership',
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
            registerAcademy: 'Academy Area'
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
            menu: 'Site menu',
            home: 'Home',
            institutional: 'About',
            events: 'Events',
            ranking: 'Ranking',
            rankingTeams: 'Team Ranking',
            athletes: 'Athletes',
            membership: 'Membership',
            regulations: 'Regulations',
            news: 'News',
            adminPanel: 'Admin panel',
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
            membership: 'Filiação',
            news: 'Notícias',
            regulations: 'Regulamento'
          },
          eventsMenu: {
            upcoming: 'Próximos eventos',
            calendar: 'Calendário de eventos 2026',
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
            member: 'Área do membro',
            registerAcademy: 'Área da academia'
          },
          newsMenu: {
            blog: 'Blog e notícias',
            videos: 'Biblioteca de vídeos',
            magazine: 'Revista Jiu-Jitsu World',
            social: 'Mídias sociais'
          },
          regulationsMenu: {
            rankingRules: 'Regras do ranking',
            pointsSystem: 'Sistema de pontos',
            eventLevels: 'Níveis de evento'
          },
          accountMenu: {
            myAccount: 'Minha conta',
            settings: 'Configurações',
            manageProfiles: 'Gerenciar perfis',
            logout: 'Sair',
            login: 'Entrar',
            register: 'Cadastrar'
          },
          footer: {
            description:
              'A Genesis Esportes organiza eventos de Jiu-Jitsu e monitora rankings com transparência e excelência operacional. Fundada em 2017, com sede em Belo Horizonte.',
            followUs: 'Siga-nos',
            contact: 'Contato',
            phone: 'Telefone / WhatsApp',
            email: 'E-mail',
            location: 'Localização',
            mapLabel: 'Parque Turista - Contagem / MG',
            mapAddress: 'Rua Pains, 139',
            viewMap: 'Ver no mapa',
            menu: 'Menu do site',
            home: 'Início',
            institutional: 'Institucional',
            events: 'Eventos',
            ranking: 'Ranking',
            rankingTeams: 'Ranking Equipes',
            athletes: 'Atletas',
            membership: 'Filiação',
            regulations: 'Regulamento',
            news: 'Notícias',
            adminPanel: 'Painel administrativo',
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
            posterCompressionHint: 'O cartaz enviado é comprimido automaticamente.',
            posterCompressedSize: 'Tamanho comprimido',
            posterTypeInvalid: 'Selecione um arquivo de imagem válido para o cartaz.',
            posterUploadTooLarge: 'Arquivo do cartaz muito grande. Tamanho máximo de envio: 8 MB.',
            posterTooLargeAfterCompression: 'O cartaz permaneceu grande após a compressão. Escolha um arquivo menor.',
            posterReadFail: 'Falha ao processar a imagem do cartaz.',
            registrationUrl: 'URL de inscrição (opcional)',
            registrationUrlPlaceholder: 'https://...',
            pixKey: 'Chave Pix (responsável pelo campeonato)',
            pixKeyPlaceholder: 'CPF / CNPJ / e-mail / telefone / chave aleatória',
            feeUnder15: 'Valor até 15 anos (GI/NO-GI)',
            feeOver15: 'Valor acima de 15 anos (GI/NO-GI)',
            feeCombo: 'Valor Combo GI + NO-GI',
            feeAbsolute: 'Valor Absoluto GI / NO-GI',
            registrationOpen: 'Inscrições abertas no momento',
            internalRegistration: 'Inscrição dentro da nossa plataforma',
            cancel: 'Cancelar',
            save: 'Salvar evento',
            error: 'Falha ao criar evento.'
          }
        }
  ), [isEnglish]);

  const utilityLinks = useMemo(() => ([
    { label: copy.utilityLinks.about, path: '/institucional' },
    { label: copy.utilityLinks.organizers, path: '/eventos' }
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
      label: copy.nav.membership,
      activePaths: ['/filiacao'],
      items: [
        { label: copy.membershipMenu.member, path: '/filiacao?tab=member', icon: User },
        { label: copy.membershipMenu.registerAcademy, path: '/filiacao?tab=academy', icon: Users }
      ]
    },
    {
      label: copy.nav.news,
      activePaths: ['/noticias'],
      items: [
        { label: copy.newsMenu.blog, path: '/noticias' },
        { label: copy.newsMenu.videos, path: '/noticias' },
        { label: copy.newsMenu.magazine, path: '/noticias' },
        { label: copy.newsMenu.social, path: '/noticias#midias-sociais' }
      ]
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
    setEventForm(createEventFormState());
    setEventPosterStoredSizeBytes(0);
    closeEventModal();
  };

  const handleCreateEvent = (event) => {
    event.preventDefault();
    setEventError('');

    try {
      addEvent(eventForm);
      setEventForm(createEventFormState());
      setEventPosterStoredSizeBytes(0);
      closeEventModal();
    } catch (err) {
      setEventError(err?.message || copy.eventModal.error);
    }
  };

  const handleEventPosterUrlChange = (event) => {
    const value = event.target.value;
    setEventForm((prev) => ({ ...prev, posterUrl: value }));
    setEventPosterStoredSizeBytes(isDataImageUrl(value) ? estimateDataUrlBytes(value) : 0);
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

  const accountItems = currentUser
    ? [
        { label: copy.accountMenu.myAccount, path: '/minha-conta', icon: User },
        ...(canAccessDashboard
          ? [{ label: copy.accountMenu.manageProfiles, path: '/admin', icon: Users }]
          : []),
        { label: copy.accountMenu.logout, onClick: logout, icon: LogOut }
      ]
    : [
        { label: copy.accountMenu.login, onClick: () => setShowLogin(true), icon: LogIn },
        { label: copy.accountMenu.register, path: '/filiacao?tab=member', icon: User }
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
                <div className="utility-dropdown__panel">
                  {accountItems.map(renderAccountItem)}
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
                      <span>{item.label}</span>
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

      <main className={`app-main ${isAdminRoute ? 'app-main--admin' : ''}`}>
        <div className={`container ${isAdminRoute ? 'container--admin' : ''} ${isHomeRoute ? 'container--home' : ''}`}>
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
                  path="/admin"
                  element={canAccessDashboard ? <Dashboard /> : <Navigate to="/ranking" replace />}
                />
                <Route path="/institucional" element={<About />} />
                <Route path="/eventos" element={<Events />} />
                <Route path="/eventos/:eventId" element={<EventDetails />} />
                <Route path="/eventos/:eventId/inscricao" element={<EventRegistration />} />
                <Route path="/ranking" element={<Ranking />} />
                <Route path="/ranking-equipes" element={<TeamRanking />} />
                <Route path="/atletas" element={<Athletes />} />
                <Route path="/filiacao" element={<Membership />} />
                <Route path="/minha-conta" element={<MyAccount />} />
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

          <div className="footer-column footer-column--menu">
            <div className="footer-title">{copy.footer.menu}</div>
            <nav className="footer-menu footer-menu--distributed">
              <Link to="/">{copy.footer.home}</Link>
              <Link to="/institucional">{copy.footer.institutional}</Link>
              <Link to="/eventos">{copy.footer.events}</Link>
              <Link to="/ranking">{copy.footer.ranking}</Link>
              <Link to="/ranking-equipes">{copy.footer.rankingTeams}</Link>
              <Link to="/atletas">{copy.footer.athletes}</Link>
              <Link to="/filiacao">{copy.footer.membership}</Link>
              <Link to="/regulamento">{copy.footer.regulations}</Link>
              <Link to="/noticias">{copy.footer.news}</Link>
              {canAccessDashboard && <Link to="/admin">{copy.footer.adminPanel}</Link>}
            </nav>
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
              className="modal-card"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
            >
              <div className="modal-panel">
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
