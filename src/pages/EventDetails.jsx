import React, { useMemo, useState, useEffect } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  Bell, Heart, BookOpen, Users, Clock, BarChart2, Swords,
  ShieldCheck, Printer, Globe, Mail, MapPin, ChevronRight, Info,
  ChevronDown, ChevronUp, X, Search, Download, ExternalLink, Calendar, CheckCircle2
} from 'lucide-react';
import { useStore } from '../hooks/useStore';
import { useI18n } from '../hooks/useI18n';
import { formatBrlCurrency, normalizeEventFees } from '../utils/eventPricing';
import { REGISTRATION_STATUS, normalizeRegistrationStatus } from '../utils/registrationStatus';
import { buildCategoryDescriptor } from '../services/categoryService';
import { getPublishedEventSchedule, PUBLISHED_EVENT_SCHEDULE_CHANGED } from '../utils/eventSchedule';
import BracketTree, { buildRounds } from '../components/BracketTree';
import { publicRegistrationService } from '../services/publicRegistrationService';
import './EventDetails.css';

const parseDate = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatDateRange = (startDate, endDate, locale) => {
  const s = parseDate(startDate);
  const e = parseDate(endDate);
  if (!s) return '—';
  const opts = { day: '2-digit', month: 'short' };
  const start = s.toLocaleDateString(locale, opts);
  const end = e ? e.toLocaleDateString(locale, opts) : '';
  return end && end !== start ? `${start} – ${end}` : start;
};

const formatFull = (dateStr, locale) => {
  const d = parseDate(dateStr);
  if (!d) return '—';
  return d.toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' });
};

const BATCH_NAMES = [
  'Inscrições Antecipadas',
  'Inscrição Normal',
  'Inscrição Tardia'
];

const ENTRY_LABELS = [
  { key: 'under15Gi', label: 'Kids Masculino GI' },
  { key: 'under15GiFem', label: 'Kids Feminino GI' },
  { key: 'over15Gi', label: 'Juvenil Masculino GI' },
  { key: 'over15GiFem', label: 'Juvenil Feminino GI' },
  { key: 'adultGi', label: 'Masculino GI' },
  { key: 'adultGiFem', label: 'Feminino GI' },
  { key: 'under15NoGi', label: 'Kids Masculino NO-GI' },
  { key: 'under15NoGiFem', label: 'Kids Feminino NO-GI' },
  { key: 'over15NoGi', label: 'Juvenil Masculino NO-GI' },
  { key: 'over15NoGiFem', label: 'Juvenil Feminino NO-GI' },
  { key: 'adultNoGi', label: 'Masculino NO-GI' },
  { key: 'adultNoGiFem', label: 'Feminino NO-GI' },
];

const EventDetails = () => {
  const { eventId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'information';
  const activeSubTab = searchParams.get('subtab') || 'info';

  const [schedule, setSchedule] = useState(null);

  // Expande a página para ocupar 100% da tela burlando os constraints do container
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    const timer = setTimeout(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }, 100);
    document.body.classList.add('event-details-active');
    return () => {
      clearTimeout(timer);
      document.body.classList.remove('event-details-active');
    };
  }, []);

  useEffect(() => {
    setSchedule(getPublishedEventSchedule(eventId));
    const handleScheduleChange = (e) => {
      if (e.detail?.eventId === eventId) {
        setSchedule(getPublishedEventSchedule(eventId));
      }
    };
    window.addEventListener(PUBLISHED_EVENT_SCHEDULE_CHANGED, handleScheduleChange);
    return () => window.removeEventListener(PUBLISHED_EVENT_SCHEDULE_CHANGED, handleScheduleChange);
  }, [eventId]);

  const { events, athletes, brackets, memberProfiles = [] } = useStore();
  const [resultsData, setResultsData] = useState(null);
  const [teamRankingData, setTeamRankingData] = useState(null);
  const [resultsSubTab, setResultsSubTab] = useState('resultados');

  useEffect(() => {
    if (activeTab === 'results') {
      fetch(`/api/ranking?eventId=${eventId}`)
        .then(r => r.json())
        .then(setResultsData)
        .catch(console.error);

      fetch(`/api/ranking/teams?eventId=${eventId}`)
        .then(r => r.json())
        .then(setTeamRankingData)
        .catch(console.error);
    }
  }, [activeTab, eventId]);
  const { locale, uiLanguage } = useI18n();
  const isEnglish = uiLanguage === 'en-US';
  const isSpanish = uiLanguage === 'es-ES';
  const copy = {
    infoTab: isEnglish ? 'Information' : isSpanish ? 'Información' : 'Informações',
    athletesTab: isEnglish ? 'Athletes' : isSpanish ? 'Atletas' : 'Atletas',
    bracketsTab: isEnglish ? 'Brackets' : isSpanish ? 'Llaves' : 'Chaves',
    matchesTab: isEnglish ? 'Matches' : isSpanish ? 'Luchas' : 'Lutas',
    scheduleTab: isEnglish ? 'Schedule' : isSpanish ? 'Cronograma' : 'Cronograma',
    resultsTab: isEnglish ? 'Results' : isSpanish ? 'Resultados' : 'Resultados',
    subInfo: isEnglish ? 'Information' : isSpanish ? 'Información' : 'Informações',
    subLocation: isEnglish ? 'Location & Accommodation' : isSpanish ? 'Ubicación & Alojamiento' : 'Local & Hospedagem',
    subParents: isEnglish ? 'Parents & Guardians' : isSpanish ? 'Padres & Tutores' : 'Pais & Responsáveis',
  };

  const event = useMemo(() => events.find((item) => String(item.id) === String(eventId)), [events, eventId]);
  const eventFees = useMemo(() => normalizeEventFees(event || {}), [event]);
  const batches = useMemo(() => (event?.batches || []).slice(0, 3), [event]);

  const [publicRegistrations, setPublicRegistrations] = useState([]);

  useEffect(() => {
    if (activeTab === 'athletes') {
      publicRegistrationService.listRegistrations(eventId)
        .then(res => setPublicRegistrations(res))
        .catch(console.error);
    }
  }, [activeTab, eventId]);

  const eventAthletes = useMemo(() => {
    const storeAthletes = (athletes || []).filter(a => String(a.eventId) === String(eventId));
    
    const pendingAthletes = publicRegistrations.map(r => {
      const p = r.payload || r;
      return {
        id: r.id,
        eventId: p.eventId,
        nome: p.nome,
        memberProfileId: p.profileId,
        profileId: p.profileId,
        academia: p.academia,
        faixa: p.faixa,
        peso: p.peso,
        categoria: p.categoria,
        modalidade: p.modalidade,
        genero: p.genero,
        status: p.status || 'pending_sync'
      };
    }).filter(a => String(a.eventId) === String(eventId));

    const storeIds = new Set(storeAthletes.map(a => String(a.id)));
    const uniquePending = pendingAthletes.filter(a => !storeIds.has(String(a.id)));

    return [...storeAthletes, ...uniquePending];
  }, [athletes, eventId, publicRegistrations]);

  const eventBrackets = useMemo(() => (brackets || []).filter(b => String(b.eventId) === String(eventId)), [brackets, eventId]);

  const groupedAthletes = useMemo(() => {
    const groups = {};
    eventAthletes.forEach(athlete => {
      const descriptor = buildCategoryDescriptor(athlete);
      const label = descriptor.label.replace(/ - /g, ' / ');
      if (!groups[label]) groups[label] = [];
      groups[label].push(athlete);
    });
    return groups;
  }, [eventAthletes]);

  const athleteMap = useMemo(() => {
    return new Map(eventAthletes.map(a => [a.id, a]));
  }, [eventAthletes]);

  const [expandedCategories, setExpandedCategories] = useState({});
  const [expandedUnapproved, setExpandedUnapproved] = useState({});
  const [selectedBracket, setSelectedBracket] = useState(null);
  const [showFullBracket, setShowFullBracket] = useState(false);
  const [bracketSearch, setBracketSearch] = useState('');
  
  const [showSuperFightApplication, setShowSuperFightApplication] = useState(false);
  const [superFightForm, setSuperFightForm] = useState({ name: '', belt: 'Branca', weight: '', academy: '', instagram: '', titles: '' });

  const toggleCategory = (catLabel) => {
    setExpandedCategories(prev => ({
      ...prev,
      [catLabel]: !prev[catLabel]
    }));
  };

  const toggleUnapproved = (catLabel, e) => {
    e.stopPropagation();
    setExpandedUnapproved(prev => ({
      ...prev,
      [catLabel]: !prev[catLabel]
    }));
  };

  if (!event) {
    return (
      <div className="sc-event-page">
        <div className="sc-content">Evento não encontrado.</div>
      </div>
    );
  }

  const setTab = (tab) => setSearchParams({ tab });
  const setSubTab = (subtab) => setSearchParams({ tab: 'information', subtab });

  const eventStartDate = parseDate(event.date);
  const eventEndDate = parseDate(event.endDate || event.date);
  const eventDateLabel = formatDateRange(event.date, event.endDate || event.date, locale);

  // Sidebar blocks
  const sidebarBlocks = (
    <div className="sc-sidebar">
      {/* Vagas (Capacity) */}
      {event.maxAthletes && Number(event.maxAthletes) > 0 && (
        <div className="sc-sidebar-card">
          <div className="sc-sidebar-card__header">Vagas do Evento</div>
          <div className="sc-sidebar-card__body">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px', fontWeight: 600, color: '#e2e8f0' }}>
              <span>Preenchidas: {Math.min(athletes.length, Number(event.maxAthletes))}</span>
              <span>Total: {event.maxAthletes}</span>
            </div>
            <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ width: `${Math.min(100, (athletes.length / Number(event.maxAthletes)) * 100)}%`, height: '100%', background: athletes.length >= Number(event.maxAthletes) ? '#ef4444' : '#00c2cb', transition: 'width 0.5s ease' }}></div>
            </div>
            {athletes.length >= Number(event.maxAthletes) && (
              <div style={{ marginTop: '10px', fontSize: '12px', color: '#ef4444', fontWeight: 700, textAlign: 'center' }}>
                LOTAÇÃO MÁXIMA ATINGIDA
              </div>
            )}
          </div>
        </div>
      )}

      {/* Organizer & merchant */}
      <div className="sc-sidebar-card">
        <div className="sc-sidebar-card__header">Organizer &amp; merchant</div>
        <div className="sc-sidebar-card__body">
          <div className="sc-organizer-name">
            {event.organizerLogoUrl && (
              <img src={event.organizerLogoUrl} alt={event.organizerName} className="sc-organizer-logo" />
            )}
            {event.organizerName || 'Organizador'} <Info size={14} style={{ color: '#71717a', cursor: 'pointer' }} />
          </div>
          <div className="sc-organizer-perk">
            <ShieldCheck size={16} style={{ color: '#22c55e' }} />
            <span><strong>2 anos</strong> na plataforma</span>
          </div>
          <div className="sc-organizer-perk">
            <ShieldCheck size={16} style={{ color: '#22c55e' }} />
            <span><strong>Eventos verificados</strong></span>
          </div>
        </div>
      </div>

      {/* Contato */}
      <div className="sc-sidebar-card">
        <div className="sc-sidebar-card__header">Contato</div>
        <div className="sc-sidebar-card__body sc-sidebar-card__body--links">
          {event.eventSocialWebsite && (
            <a href={event.eventSocialWebsite} target="_blank" rel="noreferrer" className="sc-contact-link">
              <Globe size={16} />
              <span>Event website</span>
              <ChevronRight size={14} style={{ marginLeft: 'auto', color: '#71717a' }} />
            </a>
          )}
          {event.eventSocialWhatsapp && (
            <a href={`https://wa.me/${event.eventSocialWhatsapp}`} target="_blank" rel="noreferrer" className="sc-contact-link">
              <Mail size={16} />
              <span>WhatsApp</span>
              <ChevronRight size={14} style={{ marginLeft: 'auto', color: '#71717a' }} />
            </a>
          )}
          {event.eventSocialInstagram && (
            <a href={`https://instagram.com/${event.eventSocialInstagram.replace('@', '')}`} target="_blank" rel="noreferrer" className="sc-contact-link">
              <Globe size={16} />
              <span>Instagram</span>
              <ChevronRight size={14} style={{ marginLeft: 'auto', color: '#71717a' }} />
            </a>
          )}
          {!event.eventSocialWebsite && !event.eventSocialWhatsapp && !event.eventSocialInstagram && (
            <span style={{ color: '#71717a', fontSize: '0.875rem' }}>Sem contato cadastrado</span>
          )}
        </div>
      </div>

      {/* Localização */}
      <div className="sc-sidebar-card">
        <div className="sc-sidebar-card__header">Localização</div>
        <div className="sc-sidebar-card__body sc-sidebar-card__body--links">
          <a
            href={event.location ? `https://maps.google.com/?q=${encodeURIComponent(event.location)}` : '#'}
            target={event.location ? "_blank" : undefined}
            rel="noreferrer"
            className="sc-contact-link"
            style={{ alignItems: 'flex-start' }}
          >
            <MapPin size={16} style={{ color: '#71717a', marginTop: '2px', flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 600 }}>{event.location || 'Local a definir'}</div>
              <div style={{ color: '#71717a', fontSize: '0.8rem', marginTop: '4px', fontWeight: 'normal' }}>
                Fuso horário &nbsp; America/Sao_Paulo
              </div>
            </div>
            <ChevronRight size={14} style={{ marginLeft: 'auto', color: '#71717a', flexShrink: 0, marginTop: '2px' }} />
          </a>
        </div>
      </div>

      {/* Entradas */}
      <div className="sc-sidebar-card">
        <div className="sc-sidebar-card__header">Entradas</div>
        <div className="sc-sidebar-card__body sc-sidebar-card__body--entries">
          {[
            { label: 'Kids / Infanto GI', value: eventFees.under15 },
            { label: 'Juvenil / Adulto GI', value: eventFees.over15 },
            { label: 'Kids / Infanto NO-GI', value: eventFees.under15 },
            { label: 'Juvenil / Adulto NO-GI', value: eventFees.over15 },
            { label: 'Combo GI + NO-GI', value: eventFees.combo },
            { label: 'Absoluto', value: eventFees.absolute },
          ].filter(e => e.value > 0).map((entry) => (
            <div key={entry.label} className="sc-entry-row">
              <span>{entry.label}</span>
              <span>{formatBrlCurrency(entry.value, locale)}</span>
            </div>
          ))}
          {!eventFees.under15 && !eventFees.over15 && (
            <span style={{ color: '#71717a', fontSize: '0.875rem' }}>Sem valores cadastrados</span>
          )}
        </div>
      </div>

      {/* Política de Cancelamento */}
      <div className="sc-sidebar-card">
        <div className="sc-sidebar-card__header sc-sidebar-card__header--blue">Política de Cancelamento/Reembolso</div>
        <div className="sc-sidebar-card__body">
          {batches[batches.length - 1] && (
            <>
              <div className="sc-cancel-row">
                <span className="sc-cancel-label">Último dia para cancelar</span>
                <span className="sc-cancel-date">{formatFull(batches[batches.length - 1].endDate, locale)}</span>
              </div>
            </>
          )}
          <div className="sc-cancel-row" style={{ marginTop: '8px' }}>
            <span className="sc-cancel-label">Reembolso após encerramento</span>
            <span style={{ color: '#ef4444', fontSize: '0.8rem' }}>0%</span>
          </div>
        </div>
      </div>
    </div>
  );

  // ---- Information Tab ----
  const renderInformationTab = () => (
    <>
      <div className="sc-subnav">
        <div className={`sc-subtab ${activeSubTab === 'info' ? 'active' : ''}`} onClick={() => setSubTab('info')}>{copy.subInfo}</div>
        <div className={`sc-subtab ${activeSubTab === 'location' ? 'active' : ''}`} onClick={() => setSubTab('location')}>{copy.subLocation}</div>
        <div className={`sc-subtab ${activeSubTab === 'parents' ? 'active' : ''}`} onClick={() => setSubTab('parents')}>{copy.subParents}</div>
      </div>

      <div className="sc-content sc-info-page">
        {activeSubTab === 'info' && (
          <>
            {/* HERO CARD: imagem esquerda + datas direita */}
            <div className="sc-hero-card">
              <div className="sc-hero-card__banner">
                {event.posterUrl ? (
                  <img src={event.posterUrl} alt={event.name} className="sc-hero-card__img" />
                ) : (
                  <div className="sc-hero-card__img-fallback">
                    <span style={{ color: '#fff', fontWeight: 700, fontSize: '1.2rem', textAlign: 'center', padding: '1rem' }}>{event.name}</span>
                  </div>
                )}
              </div>
              <div className="sc-hero-card__dates">
                {batches.length > 0 ? batches.map((batch, i) => (
                  <div key={batch.id || i} className="sc-hero-card__date-row">
                    <span className="sc-hero-card__date-label">{BATCH_NAMES[i] || batch.name}</span>
                    <span className="sc-hero-card__date-value">
                      {formatDateRange(batch.startDate, batch.endDate, locale)}
                      {batch.endDate && <span className="sc-hero-card__date-time"> 11:59 pm</span>}
                    </span>
                  </div>
                )) : (
                  <div className="sc-hero-card__date-row">
                    <span className="sc-hero-card__date-label" style={{ color: '#71717a' }}>Sem lotes cadastrados</span>
                  </div>
                )}
                <div className="sc-hero-card__date-row sc-hero-card__date-row--event">
                  <span className="sc-hero-card__date-label">Evento começa</span>
                  <span className="sc-hero-card__date-value">
                    {eventStartDate ? eventStartDate.toLocaleDateString(locale, { day: 'numeric', month: 'short' }) : '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Wrapper: content + sidebar */}
            <div className="sc-info-body">
              <div className="sc-info-main-col">
                <h1 className="sc-info-main-title">{event.name}</h1>
                {event.eventDescription && (
                  <div className="sc-info-block">
                    <div className="sc-event-description" style={{ whiteSpace: 'pre-wrap', color: '#e2e8f0', lineHeight: '1.6' }}>
                      {event.eventDescription}
                    </div>
                  </div>
                )}
                {event.prizesDescription && (
                  <div className="sc-info-block">
                    <div className="sc-info-block-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f59e0b' }}>
                      <span style={{ fontSize: '1.2rem' }}>🏆</span> Premiação do Evento
                    </div>
                    <div className="sc-event-description" style={{ whiteSpace: 'pre-wrap', color: '#e2e8f0', lineHeight: '1.6' }}>
                      {event.prizesDescription}
                    </div>
                  </div>
                )}
                {(event.weightTableGiUrl || event.weightTableNoGiUrl || event.circularUrl) && (
                  <div className="sc-info-block sc-info-links">
                    <div className="sc-info-block-title">Documentos</div>
                    {event.circularUrl && (
                      <a href={event.circularUrl} target="_blank" rel="noreferrer" className="sc-doc-link"><Globe size={14} /> Circular do Evento</a>
                    )}
                    {event.weightTableGiUrl && (
                      <a href={event.weightTableGiUrl} target="_blank" rel="noreferrer" className="sc-doc-link"><Globe size={14} /> Tabela de Peso GI</a>
                    )}
                    {event.weightTableNoGiUrl && (
                      <a href={event.weightTableNoGiUrl} target="_blank" rel="noreferrer" className="sc-doc-link"><Globe size={14} /> Tabela de Peso NO-GI</a>
                    )}
                  </div>
                )}
              </div>
              {sidebarBlocks}
            </div>
          </>
        )}


        {activeSubTab === 'location' && (
          <div className="sc-location-tab">
            {/* Mapa */}
            <div className="sc-location-map-wrap">
              <iframe
                title="Mapa de Hotéis"
                width="100%"
                height="100%"
                style={{ border: 0, display: 'block' }}
                loading="lazy"
                allowFullScreen
                src={event.mapIframeUrl
                  ? event.mapIframeUrl
                  : (event.location
                    ? `https://maps.google.com/maps?q=hoteis+perto+de+${encodeURIComponent(event.location)}&t=m&z=13&output=embed&iwloc=near`
                    : 'https://maps.google.com/maps?q=hoteis+no+Brasil&t=m&z=4&output=embed')}
              />
              <div className="sc-location-map-badge">
                <MapPin size={13} />
                {event.location || 'Local do evento'}
              </div>
            </div>

            {/* Plataformas */}
            <div className="sc-location-platforms">
              <h3 className="sc-location-platforms__title">Onde se hospedar</h3>
              <div className="sc-accom-grid">
                <a
                  href={event.location ? `https://www.airbnb.com.br/s/${encodeURIComponent(event.location)}/homes` : '#'}
                  target="_blank" rel="noreferrer"
                  className="sc-accom-card"
                >
                  <div className="sc-accom-card__logo sc-accom-card__logo--airbnb">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 4c1.034 0 1.875.84 1.875 1.875S13.034 7.75 12 7.75s-1.875-.84-1.875-1.875S10.966 4 12 4zm4.5 13.5c-.375 1.5-2.25 2.5-4.5 2.5s-4.125-1-4.5-2.5c-.094-.375 0-.75.375-.938L9.75 15c.5-.25 1-.375 1.5-.375H12h.75c.5 0 1 .125 1.5.375l1.875 1.063c.375.187.469.562.375.937z" /></svg>
                  </div>
                  <div className="sc-accom-card__info">
                    <div className="sc-accom-card__name">Airbnb</div>
                    <div className="sc-accom-card__desc">Quartos e casas perto do evento</div>
                  </div>
                  <div className="sc-accom-card__arrow">→</div>
                </a>

                <a
                  href={event.location ? `https://www.booking.com/searchresults.pt-br.html?ss=${encodeURIComponent(event.location)}` : '#'}
                  target="_blank" rel="noreferrer"
                  className="sc-accom-card"
                >
                  <div className="sc-accom-card__logo sc-accom-card__logo--booking">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M3 4h18v16H3V4zm2 2v12h14V6H5zm2 2h10v2H7V8zm0 4h6v2H7v-2z" /></svg>
                  </div>
                  <div className="sc-accom-card__info">
                    <div className="sc-accom-card__name">Booking.com</div>
                    <div className="sc-accom-card__desc">Hotéis com cancelamento grátis</div>
                  </div>
                  <div className="sc-accom-card__arrow">→</div>
                </a>

                <a
                  href={event.location ? `https://www.hotels.com/search.do?q-destination=${encodeURIComponent(event.location)}` : '#'}
                  target="_blank" rel="noreferrer"
                  className="sc-accom-card"
                >
                  <div className="sc-accom-card__logo sc-accom-card__logo--hotels">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M3 3h18v18H3V3zm2 2v14h14V5H5zm2 2h4v4H7V7zm6 0h4v4h-4V7zm-6 6h4v4H7v-4zm6 0h4v4h-4v-4z" /></svg>
                  </div>
                  <div className="sc-accom-card__info">
                    <div className="sc-accom-card__name">Hotels.com</div>
                    <div className="sc-accom-card__desc">Comparar preços de hotéis</div>
                  </div>
                  <div className="sc-accom-card__arrow">→</div>
                </a>

                <a
                  href={event.location ? `https://maps.google.com/?q=hoteis+perto+de+${encodeURIComponent(event.location)}` : '#'}
                  target="_blank" rel="noreferrer"
                  className="sc-accom-card"
                >
                  <div className="sc-accom-card__logo sc-accom-card__logo--maps">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" /></svg>
                  </div>
                  <div className="sc-accom-card__info">
                    <div className="sc-accom-card__name">Google Maps</div>
                    <div className="sc-accom-card__desc">Ver hotéis e localizações</div>
                  </div>
                  <div className="sc-accom-card__arrow">→</div>
                </a>
              </div>
            </div>
          </div>
        )}


        {activeSubTab === 'parents' && (
          <div className="sc-content sc-info-page">
            <div style={{ maxWidth: '800px' }}>
              <h2 className="sc-section-title">Pais &amp; Responsáveis</h2>
              <p style={{ color: '#a1a1aa', marginBottom: '32px', lineHeight: 1.6 }}>
                Guia completo para pais e responsáveis que acompanham atletas nas categorias Kids e Juvenil.
              </p>

              <div className="sc-info-block" style={{ marginBottom: '24px' }}>
                <div style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>&#9878;&#65039; Como funciona a pesagem</div>
                <p style={{ color: '#a1a1aa', lineHeight: 1.6, marginBottom: '12px' }}>
                  A pesagem é obrigatória e ocorre no dia do evento antes das lutas. O atleta deve estar com o kimono (GI) ou rash guard (NO-GI) durante a pesagem. A tolerância é de 0,1 kg.
                </p>
                <div style={{ background: '#1f1f22', borderRadius: '6px', padding: '16px', borderLeft: '4px solid #3b82f6' }}>
                  <strong style={{ color: '#3b82f6' }}>&#9888;&#65039; Importante:</strong>
                  <span style={{ color: '#a1a1aa', marginLeft: '8px', fontSize: '0.875rem' }}>Se o atleta não passar na pesagem, terá até 30 minutos para regularizar antes de ser desclassificado.</span>
                </div>
              </div>

              <div className="sc-info-block" style={{ marginBottom: '24px' }}>
                <div style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '16px' }}>&#129323; Categorias por Idade &amp; Peso</div>
                <div style={{ overflowX: 'auto' }}>
                  <table className="sc-weight-table">
                    <thead>
                      <tr><th>Categoria</th><th>Faixa Etária</th><th>Pesos Masculino</th><th>Pesos Feminino</th></tr>
                    </thead>
                    <tbody>
                      <tr><td>Infantil A</td><td>4-5 anos</td><td>-18 / -22 / -26 kg</td><td>-18 / -22 / -26 kg</td></tr>
                      <tr><td>Infantil B</td><td>6-7 anos</td><td>-22 / -27 / -32 kg</td><td>-22 / -27 / -32 kg</td></tr>
                      <tr><td>Infantil C</td><td>8-9 anos</td><td>-27 / -32 / -37 kg</td><td>-27 / -32 / -37 kg</td></tr>
                      <tr><td>Infantil D</td><td>10-11 anos</td><td>-32 / -37 / -42 / -47 kg</td><td>-32 / -37 / -42 kg</td></tr>
                      <tr><td>Infantil E</td><td>12-13 anos</td><td>-37 / -42 / -47 / -53 kg</td><td>-37 / -42 / -47 kg</td></tr>
                      <tr><td>Juvenil</td><td>14-15 anos</td><td>-49 / -55 / -62 / -69 kg</td><td>-44 / -49 / -55 kg</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="sc-info-block" style={{ marginBottom: '24px' }}>
                <div style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '16px' }}>&#128203; Dicas para o dia do evento</div>
                <ul style={{ color: '#a1a1aa', lineHeight: 1.8, paddingLeft: '20px' }}>
                  <li>Chegue com pelo menos <strong style={{ color: '#e4e4e7' }}>1 hora de antecedência</strong> para pesagem e aquecimento.</li>
                  <li>Leve a <strong style={{ color: '#e4e4e7' }}>documentação do atleta</strong> (RG ou certidão de nascimento).</li>
                  <li>Kimono (GI) deve estar limpo e sem rasgos com <strong style={{ color: '#e4e4e7' }}>patch da faixa visível</strong>.</li>
                  <li>Prefira lanches leves e <strong style={{ color: '#e4e4e7' }}>muita hidratação</strong> — evite refeições pesadas antes das lutas.</li>
                  <li>Confira o <strong style={{ color: '#e4e4e7' }}>cronograma de lutas</strong> com antecedência na aba Schedule.</li>
                  <li>Pais e responsáveis devem permanecer <strong style={{ color: '#e4e4e7' }}>fora do tatame</strong> durante as lutas.</li>
                </ul>
              </div>

              <div style={{ background: '#1f1f22', borderRadius: '8px', padding: '20px', borderLeft: '4px solid #22c55e' }}>
                <div style={{ fontWeight: 700, marginBottom: '8px' }}>&#128657; Em caso de emergência</div>
                <p style={{ color: '#a1a1aa', fontSize: '0.875rem', margin: 0, lineHeight: 1.6 }}>
                  O evento conta com equipe de primeiros socorros no local. Procure imediatamente a organização ou qualquer membro da arbitragem.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );

  // ---- Athletes Tab ----
  const renderAthleteRow = (athlete, isUnapproved = false) => {
    const realProfileId = athlete.memberProfileId || athlete.profileId;
    let fullProfile = null;
    if (realProfileId) {
       fullProfile = memberProfiles.find(p => String(p.id) === String(realProfileId));
    }
    if (!fullProfile) {
       fullProfile = memberProfiles.find(p => p.fullName?.trim().toLowerCase() === (athlete.nome || '').trim().toLowerCase());
    }

    const photoUrl = fullProfile?.photoUrl || fullProfile?.avatarUrl || athlete.photoUrl;
    const age = fullProfile?.age || athlete.idade;
    const birthYear = fullProfile?.birthDate ? new Date(fullProfile.birthDate).getFullYear() : (age ? new Date().getFullYear() - age : '2014');
    const ageText = age ? `${age} years` : '11 years';

    return (
      <tr key={athlete.id} style={{ borderBottom: '1px solid #27272a' }}>
        <td style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '4px', overflow: 'hidden', background: '#3f3f46', flexShrink: 0 }}>
            {photoUrl ? (
              <Link to={`/perfil-publico/${athlete.id}`}>
                <img src={photoUrl} alt={athlete.nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </Link>
            ) : (
              <Link to={`/perfil-publico/${athlete.id}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
                <Users size={20} style={{ color: '#a1a1aa' }} />
              </Link>
            )}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Link to={`/perfil-publico/${athlete.id}`} style={{ 
                fontWeight: 500, 
                fontSize: '1rem',
                color: '#3b82f6', 
                textDecoration: 'none'
              }}>
                {athlete.nome}
              </Link>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#a1a1aa', marginTop: '4px' }}>
              <img src="https://flagcdn.com/w20/br.png" alt="Brazil" style={{ width: '14px', borderRadius: '2px' }} />
              <span>{fullProfile?.country || athlete.country || 'Brazil'}</span>
            </div>
            {isUnapproved && (
              <div style={{ fontSize: '0.85rem', color: '#a1a1aa', marginTop: '6px', fontStyle: 'italic' }}>
                Não aprovado
              </div>
            )}
          </div>
        </td>
        <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ color: '#f4f4f5', fontWeight: 500, fontSize: '0.9rem' }}>{birthYear}</span>
            <span style={{ color: '#a1a1aa', fontSize: '0.8rem' }}>{ageText}</span>
          </div>
        </td>
        <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
          <span style={{ color: '#3b82f6', fontWeight: 500, fontSize: '0.85rem', textTransform: 'uppercase' }}>{fullProfile?.academyName || athlete.academia}</span>
        </td>
      <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
        <span style={{ color: '#f4f4f5', fontSize: '0.85rem' }}>{athlete.faixa}</span>
      </td>
      <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
        <span style={{ color: '#a1a1aa', fontSize: '0.85rem' }}>{athlete.categoria}</span>
      </td>
      <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{ color: '#f4f4f5', fontSize: '0.85rem', fontWeight: 500 }}>{athlete.peso || ''}</span>
          {athlete.pesoAtual && (
            <span style={{ color: '#22c55e', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '6px', height: '6px', background: '#22c55e', borderRadius: '50%', display: 'inline-block' }}></span>
              {athlete.pesoAtual}
            </span>
          )}
        </div>
      </td>
      <td style={{ padding: '12px 16px', verticalAlign: 'middle', textAlign: 'right' }}>
        <a href="#" onClick={(e) => e.preventDefault()} style={{ color: '#3b82f6', fontSize: '0.85rem', textDecoration: 'none' }}>Public event card</a>
      </td>
    </tr>
  );
};

  const renderAthletesTab = () => {
    const categories = Object.keys(groupedAthletes).sort();

    return (
      <div className="sc-content" style={{ maxWidth: '1100px', margin: '0 auto', padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <h2 className="sc-section-title" style={{ margin: 0, fontSize: '2.4rem', fontWeight: 900, letterSpacing: '-0.5px' }}>Athletes</h2>
          <button 
            style={{ background: '#27272a', color: '#e4e4e7', border: '1px solid #3f3f46', padding: '10px 20px', borderRadius: '24px', fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseOver={(e) => e.target.style.background = '#3f3f46'}
            onMouseOut={(e) => e.target.style.background = '#27272a'}
          >
            See brackets and schedule
          </button>
        </div>
        <div className="sc-filter-bar" style={{ background: '#1a1a1a', padding: '16px', borderRadius: '8px', marginBottom: '40px', display: 'flex', gap: '16px', border: '1px solid #27272a' }}>
          <input type="text" className="sc-input" placeholder="Search athlete or division..." style={{ flex: 2, background: '#27272a', border: 'none', padding: '12px 16px', borderRadius: '6px', color: '#fff', fontSize: '1rem', outline: 'none' }} />
          <select className="sc-select" style={{ flex: 1, background: '#27272a', border: 'none', padding: '12px 16px', borderRadius: '6px', color: '#fff', fontSize: '1rem', outline: 'none', appearance: 'none' }}>
            <option>Select country</option>
            <option>Brazil</option>
          </select>
        </div>
        
        {categories.length === 0 && (
          <p className="sc-placeholder" style={{ marginTop: '20px' }}>Nenhum atleta inscrito ainda.</p>
        )}

        {categories.map(catLabel => {
          const athletesInCat = groupedAthletes[catLabel];
          
          const approvedAthletes = athletesInCat.filter(a => !a.status || normalizeRegistrationStatus(a.status) === REGISTRATION_STATUS.PAYMENT_CONFIRMED);
            const isRegistrationOpen = event?.registrationOpen !== false;
            const unapprovedAthletes = isRegistrationOpen 
                ? athletesInCat.filter(a => a.status && normalizeRegistrationStatus(a.status) !== REGISTRATION_STATUS.PAYMENT_CONFIRMED)
                : [];
          
          const isUnapprovedExpanded = expandedUnapproved[catLabel];

          return (
            <div key={catLabel} className="sc-category-block" style={{ marginBottom: '40px' }}>
              <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <h3 style={{ fontSize: '1.6rem', color: '#fff', margin: 0, fontWeight: 900, letterSpacing: '-0.5px' }}>{catLabel}</h3>
                <span style={{ background: '#3b82f6', color: '#fff', fontSize: '0.85rem', fontWeight: 800, padding: '4px 14px', borderRadius: '20px' }}>Bracket</span>
              </div>
              
              <div style={{ overflowX: 'auto', marginBottom: '16px', borderRadius: '8px', border: '1px solid #27272a' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', color: '#e4e4e7', fontSize: '0.95rem', background: '#1c1c1e' }}>
                  {approvedAthletes.length > 0 && (
                    <>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #27272a', textAlign: 'left', color: '#71717a', fontSize: '0.8rem', textTransform: 'capitalize' }}>
                          <th style={{ padding: '12px 16px', fontWeight: 'normal' }}>Athlete</th>
                          <th style={{ padding: '12px 16px', fontWeight: 'normal' }}>Birth</th>
                          <th style={{ padding: '12px 16px', fontWeight: 'normal' }}>Academy & Affiliation</th>
                          <th style={{ padding: '12px 16px', fontWeight: 'normal' }}>Registration</th>
                          <th></th>
                          <th></th>
                          <th style={{ padding: '12px 16px', fontWeight: 'normal', textAlign: 'right' }}>Download</th>
                        </tr>
                      </thead>
                      <tbody>
                        {approvedAthletes.map(athlete => renderAthleteRow(athlete, false))}
                      </tbody>
                    </>
                  )}
                </table>
              </div>

              <div style={{ fontSize: '0.85rem', color: '#71717a', marginBottom: '8px' }}>
                Approved registrations: {approvedAthletes.length}
              </div>

              {unapprovedAthletes.length > 0 && (
                <div>
                  <button 
                    onClick={(e) => toggleUnapproved(catLabel, e)}
                    style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: '0.85rem', cursor: 'pointer', padding: 0 }}
                  >
                    Show unapproved registrations ({unapprovedAthletes.length})
                  </button>
                  
                  {isUnapprovedExpanded && (
                    <div style={{ marginTop: '16px', overflowX: 'auto', borderRadius: '8px', border: '1px solid #27272a' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', color: '#e4e4e7', fontSize: '0.95rem', background: '#1c1c1e' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid #27272a', textAlign: 'left', color: '#71717a', fontSize: '0.8rem', textTransform: 'capitalize' }}>
                            <th style={{ padding: '12px 16px', fontWeight: 'normal' }}>Athlete</th>
                            <th style={{ padding: '12px 16px', fontWeight: 'normal' }}>Birth</th>
                            <th style={{ padding: '12px 16px', fontWeight: 'normal' }}>Academy & Affiliation</th>
                            <th style={{ padding: '12px 16px', fontWeight: 'normal' }}>Registration</th>
                            <th></th>
                            <th></th>
                            <th style={{ padding: '12px 16px', fontWeight: 'normal', textAlign: 'right' }}>Download</th>
                          </tr>
                        </thead>
                        <tbody>
                          {unapprovedAthletes.map(athlete => renderAthleteRow(athlete, true))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // ---- Brackets Tab ----
  const renderBracketsTab = () => (
    <div className="sc-content" style={{ maxWidth: '1100px', margin: '0 auto', padding: '20px' }}>
      <h2 className="sc-section-title" style={{ margin: 0, fontSize: '2.4rem', fontWeight: 900, letterSpacing: '-0.5px', marginBottom: '32px' }}>Brackets</h2>
      <div className="sc-filter-bar" style={{ background: '#1a1a1a', padding: '16px', borderRadius: '8px', marginBottom: '40px', display: 'flex', border: '1px solid #27272a' }}>
        <input type="text" className="sc-input" placeholder="Search bracket..." style={{ flex: 1, background: '#27272a', border: 'none', padding: '12px 16px', borderRadius: '6px', color: '#fff', fontSize: '1rem', outline: 'none' }} />
      </div>

      {eventBrackets.length === 0 ? (
        <p className="sc-placeholder" style={{ color: '#a1a1aa' }}>As chaves ainda não foram publicadas</p>
      ) : (
        <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #27272a' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', color: '#e4e4e7', fontSize: '0.95rem', background: '#1c1c1e' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #27272a', textAlign: 'left', color: '#71717a', fontSize: '0.8rem' }}>
                <th style={{ padding: '16px 20px', fontWeight: 'normal' }}>Group</th>
                <th style={{ padding: '16px 20px', fontWeight: 'normal', width: '120px' }}>Est. start?</th>
                <th style={{ padding: '16px 20px', fontWeight: 'normal', width: '150px' }}>Where</th>
                <th style={{ padding: '16px 20px', fontWeight: 'normal', width: '50px' }}></th>
              </tr>
            </thead>
            <tbody>
              {eventBrackets.map(bracket => (
                <tr 
                  key={bracket.id} 
                  style={{ borderBottom: '1px solid #27272a', cursor: 'pointer', transition: 'background 0.2s' }}
                  onClick={() => setSelectedBracket(bracket)}
                  onMouseOver={(e) => e.currentTarget.style.background = '#27272a'}
                  onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ fontWeight: 500, fontSize: '0.95rem', color: '#f4f4f5' }}>{bracket.label}</div>
                    <div style={{ color: '#a1a1aa', fontSize: '0.85rem', marginTop: '4px' }}>{bracket.seedIds?.filter(id => id && !id.startsWith('placeholder-') && id.toUpperCase() !== 'BYE').length || 0} participants</div>
                  </td>
                  <td style={{ padding: '16px 20px', fontWeight: 500, color: '#e4e4e7', fontSize: '0.9rem' }}>
                    {bracket.liveMatches?.[0]?.scheduledAt || 'A definir'}
                  </td>
                  <td style={{ padding: '16px 20px', color: '#e4e4e7', fontSize: '0.9rem' }}>
                    {bracket.liveMatches?.[0]?.area || 'A definir'}
                  </td>
                  <td style={{ padding: '16px 20px', textAlign: 'right', color: '#71717a' }}>
                    <ChevronRight size={18} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {/* ── SUPER FIGHT APPLICATION MODAL ───────────────────────── */}
      {showSuperFightApplication && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }} onClick={() => setShowSuperFightApplication(false)} />
          <div style={{ position: 'relative', background: '#1e293b', width: '100%', maxWidth: '500px', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.6)', border: '1px solid rgba(245,158,11,0.3)' }}>
            <div style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', padding: '24px', textAlign: 'center' }}>
              <h2 style={{ margin: 0, color: '#fff', fontSize: '1.4rem', fontWeight: 800 }}>Candidatura para Super Luta</h2>
              <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', margin: '8px 0 0 0' }}>Preencha seus dados para avaliação da organização.</p>
            </div>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              alert('Candidatura enviada com sucesso! A organização analisará seu perfil.');
              setShowSuperFightApplication(false);
              setSuperFightForm({ name: '', belt: 'Branca', weight: '', academy: '', instagram: '', titles: '' });
            }} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px', fontWeight: 700 }}>Nome Completo *</label>
                <input required type="text" value={superFightForm.name} onChange={e => setSuperFightForm({...superFightForm, name: e.target.value})} style={{ width: '100%', padding: '12px 16px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '15px' }} placeholder="Seu nome" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px', fontWeight: 700 }}>Faixa *</label>
                  <select required value={superFightForm.belt} onChange={e => setSuperFightForm({...superFightForm, belt: e.target.value})} style={{ width: '100%', padding: '12px 16px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '15px' }}>
                    {['Branca', 'Cinza', 'Amarela', 'Laranja', 'Verde', 'Azul', 'Roxa', 'Marrom', 'Preta'].map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px', fontWeight: 700 }}>Peso (kg) *</label>
                  <input required type="number" step="0.1" value={superFightForm.weight} onChange={e => setSuperFightForm({...superFightForm, weight: e.target.value})} style={{ width: '100%', padding: '12px 16px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '15px' }} placeholder="Ex: 75.5" />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px', fontWeight: 700 }}>Equipe / Academia *</label>
                <input required type="text" value={superFightForm.academy} onChange={e => setSuperFightForm({...superFightForm, academy: e.target.value})} style={{ width: '100%', padding: '12px 16px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '15px' }} placeholder="Sua equipe" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px', fontWeight: 700 }}>Instagram (Link ou @) *</label>
                <input required type="text" value={superFightForm.instagram} onChange={e => setSuperFightForm({...superFightForm, instagram: e.target.value})} style={{ width: '100%', padding: '12px 16px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '15px' }} placeholder="@seu.perfil" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px', fontWeight: 700 }}>Principais Títulos (Resumo)</label>
                <textarea rows="3" value={superFightForm.titles} onChange={e => setSuperFightForm({...superFightForm, titles: e.target.value})} style={{ width: '100%', padding: '12px 16px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '15px', resize: 'vertical' }} placeholder="Ex: Campeão Mundial, Bi-campeão Brasileiro..." />
              </div>
              
              <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                <button type="button" onClick={() => setShowSuperFightApplication(false)} style={{ flex: 1, padding: '14px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '1rem', cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" style={{ flex: 2, padding: '14px', background: '#f59e0b', color: '#000', border: 'none', borderRadius: '8px', fontWeight: 800, fontSize: '1rem', cursor: 'pointer' }}>Enviar Candidatura</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  const renderPlaceholderTab = (title) => (
    <div className="sc-content" style={{ maxWidth: '1100px', margin: '0 auto', padding: '20px' }}>
      <h2 className="sc-section-title" style={{ margin: 0, fontSize: '2.4rem', fontWeight: 900, letterSpacing: '-0.5px', marginBottom: '32px', textTransform: 'uppercase' }}>{title}</h2>
      <p className="sc-placeholder" style={{ color: '#a1a1aa' }}>As informações para {title} ainda não foram publicadas</p>
    </div>
  );

  const renderMatchesTab = () => {
    const superFightsList = (event.superFights || []).filter(f => f.published);
    
    if (superFightsList.length === 0 || !event.superFightsPublished) {
      return (
        <div style={{ padding: '40px 20px', textAlign: 'center' }}>
          <Swords size={48} style={{ color: '#3f3f46', marginBottom: '16px' }} />
          <h3 style={{ color: '#e4e4e7', fontSize: '1.125rem', marginBottom: '8px' }}>Lutas Casadas</h3>
          <p style={{ color: '#a1a1aa', fontSize: '0.95rem', marginBottom: '32px' }}>As lutas deste campeonato ainda não foram publicadas.</p>
          
          {event.beltRegistrationEnabled && (
            <div style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.1) 0%, rgba(217,119,6,0.05) 100%)', border: '1px solid rgba(245,158,11,0.2)', padding: '24px', borderRadius: '16px', maxWidth: '400px', margin: '0 auto', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: '12px' }}>🏆</div>
              <h4 style={{ color: '#fcd34d', fontSize: '1.1rem', marginBottom: '8px', fontWeight: 800 }}>Quer lutar no evento principal?</h4>
              <p style={{ color: '#d4d4d8', fontSize: '0.9rem', marginBottom: '20px', lineHeight: 1.5 }}>
                Estamos selecionando os melhores atletas para o card de Super Lutas deste evento.
              </p>
              <button 
                onClick={() => setShowSuperFightApplication(true)}
                style={{ width: '100%', padding: '14px', background: 'linear-gradient(to right, #f59e0b, #d97706)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '1rem', cursor: 'pointer', boxShadow: '0 4px 14px rgba(245,158,11,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}
              >
                Candidatar-se Agora
              </button>
            </div>
          )}
        </div>
      );
    }

    return (
      <div style={{ padding: '20px' }}>
        <h3 style={{ color: '#e4e4e7', fontSize: '1.25rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Swords size={20} style={{ color: '#22c55e' }} />
          Lutas Casadas (Disputa de Cinturão)
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {superFightsList.map((sf, index) => (
            <div key={sf.id} style={{ backgroundColor: '#27272a', borderRadius: '12px', padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)', border: '1px solid #3f3f46' }}>
              
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '16px' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: '#e4e4e7', fontWeight: 'bold', fontSize: '1.1rem' }}>{sf.fighter1?.name || sf.athlete1Name || 'Lutador 1'}</div>
                  <div style={{ color: '#a1a1aa', fontSize: '0.875rem', marginTop: '4px' }}>{sf.fighter1?.belt || sf.athlete1Belt || 'Branca'} • {sf.fighter1?.academy || sf.athlete1Academy || 'Sem academia'}</div>
                </div>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#3f3f46', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', color: '#e4e4e7', fontWeight: 'bold', fontSize: '1.2rem', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                  {sf.fighter1?.photo ? <img src={sf.fighter1.photo} alt="Lutador 1" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (sf.fighter1?.name || sf.athlete1Name || '?').charAt(0).toUpperCase()}
                </div>
              </div>

              <div style={{ padding: '0 24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ color: '#22c55e', fontWeight: '900', fontSize: '1.5rem', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>VS</div>
                <div style={{ backgroundColor: '#18181b', color: '#e4e4e7', padding: '4px 12px', borderRadius: '16px', fontSize: '0.75rem', fontWeight: 'bold', marginTop: '8px', border: '1px solid #3f3f46' }}>
                  {sf.scheduledTime || '--:--'}
                </div>
                {sf.category && (
                  <div style={{ color: '#a1a1aa', fontSize: '0.75rem', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {sf.category}
                  </div>
                )}
              </div>

              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '16px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#3f3f46', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', color: '#e4e4e7', fontWeight: 'bold', fontSize: '1.2rem', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                  {sf.fighter2?.photo ? <img src={sf.fighter2.photo} alt="Lutador 2" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (sf.fighter2?.name || sf.athlete2Name || '?').charAt(0).toUpperCase()}
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ color: '#e4e4e7', fontWeight: 'bold', fontSize: '1.1rem' }}>{sf.fighter2?.name || sf.athlete2Name || 'Lutador 2'}</div>
                  <div style={{ color: '#a1a1aa', fontSize: '0.875rem', marginTop: '4px' }}>{sf.fighter2?.belt || sf.athlete2Belt || 'Branca'} • {sf.fighter2?.academy || sf.athlete2Academy || 'Sem academia'}</div>
                </div>
              </div>

            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderScheduleTab = () => {
    if (!schedule || !schedule.rows || schedule.rows.length === 0) {
      return renderPlaceholderTab('Cronograma');
    }
    return (
      <div className="sc-content" style={{ maxWidth: '1100px', margin: '0 auto', padding: '20px' }}>
        <h2 className="sc-section-title" style={{ margin: 0, fontSize: '2.4rem', fontWeight: 900, letterSpacing: '-0.5px', marginBottom: '32px', textTransform: 'uppercase' }}>Cronograma</h2>
        <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #27272a' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', color: '#e4e4e7', fontSize: '0.95rem', background: '#1c1c1e' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #27272a', textAlign: 'left', color: '#71717a', fontSize: '0.8rem' }}>
                <th style={{ padding: '16px 20px', fontWeight: 'normal', width: '150px' }}>Horário</th>
                <th style={{ padding: '16px 20px', fontWeight: 'normal' }}>Descrição</th>
                <th style={{ padding: '16px 20px', fontWeight: 'normal', textAlign: 'right', width: '120px' }}>Local</th>
              </tr>
            </thead>
            <tbody>
              {schedule.rows.map(row => (
                <tr 
                  key={row.id} 
                  style={{ borderBottom: '1px solid #27272a', transition: 'background 0.2s' }}
                  onMouseOver={(e) => e.currentTarget.style.background = '#27272a'}
                  onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '16px 20px', whiteSpace: 'nowrap', fontWeight: 600, fontSize: '0.95rem', color: '#e4e4e7' }}>
                    {row.startLabel} {row.endLabel && row.endLabel !== row.startLabel ? `- ${row.endLabel}` : ''}
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ fontWeight: 500, fontSize: '0.95rem', color: '#3b82f6', letterSpacing: '-0.01em' }}>{row.title}</div>
                    {row.notes && <div style={{ color: '#a1a1aa', fontSize: '0.85rem', marginTop: '4px' }}>{row.notes}</div>}
                  </td>
                  <td style={{ padding: '16px 20px', color: '#a1a1aa', textAlign: 'right' }}>{row.area || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // ---- Results Tab ----
  const renderResultsTab = () => {
    const eventBrackets = (brackets || []).filter(b => String(b.eventId) === String(eventId));
    const bracketsWithPodium = eventBrackets.filter(b => b.podium && (b.podium.goldId || b.podium.silverId || b.podium.bronzeId));
    
    const totalGold = bracketsWithPodium.filter(b => b.podium.goldId).length;
    const totalSilver = bracketsWithPodium.filter(b => b.podium.silverId).length;
    const totalBronze = bracketsWithPodium.filter(b => b.podium.bronzeId).length;

    const getAthleteData = (id) => eventAthletes.find(a => String(a.id) === String(id)) || {};

    return (
    <>
      <div style={{ display: 'flex', borderBottom: '1px solid #27272a', padding: '0 20px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', width: '100%', display: 'flex', gap: '32px' }}>
          <div style={{ padding: '16px 0', borderBottom: '2px solid #3b82f6', color: '#e4e4e7', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' }}>Resultados</div>
          <div style={{ padding: '16px 0', color: '#a1a1aa', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem', transition: 'color 0.2s' }} onMouseOver={e => e.currentTarget.style.color = '#e4e4e7'} onMouseOut={e => e.currentTarget.style.color = '#a1a1aa'}>Top listas</div>
        </div>
      </div>
      <div className="sc-content" style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <h2 className="sc-section-title" style={{ margin: 0, fontSize: '2.4rem', fontWeight: 900, letterSpacing: '-0.5px', textTransform: 'uppercase' }}>Resultados</h2>
          <button style={{ background: 'transparent', color: '#a1a1aa', border: '1px solid #3f3f46', padding: '8px 16px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s' }} onMouseOver={e => {e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#71717a';}} onMouseOut={e => {e.currentTarget.style.color = '#a1a1aa'; e.currentTarget.style.borderColor = '#3f3f46';}}>
            <Printer size={16} /> Imprimir
          </button>
        </div>
        
        <div style={{ background: '#1a1a1a', padding: '24px', borderRadius: '8px', marginBottom: '32px', border: '1px solid #27272a' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '16px' }}>
            <input type="text" placeholder="Nome do atleta" style={{ width: '100%', background: '#27272a', border: 'none', padding: '12px 16px', borderRadius: '6px', color: '#fff', fontSize: '0.95rem', outline: 'none' }} />
            <input type="text" placeholder="Academia" style={{ width: '100%', background: '#27272a', border: 'none', padding: '12px 16px', borderRadius: '6px', color: '#fff', fontSize: '0.95rem', outline: 'none' }} />
            <input type="text" placeholder="Categoria" style={{ width: '100%', background: '#27272a', border: 'none', padding: '12px 16px', borderRadius: '6px', color: '#fff', fontSize: '0.95rem', outline: 'none' }} />
            <input type="text" placeholder="Equipe" style={{ width: '100%', background: '#27272a', border: 'none', padding: '12px 16px', borderRadius: '6px', color: '#fff', fontSize: '0.95rem', outline: 'none' }} />
            <select style={{ width: '100%', background: '#27272a', border: 'none', padding: '12px 16px', borderRadius: '6px', color: '#a1a1aa', fontSize: '0.95rem', outline: 'none', appearance: 'none' }}><option>Todas nacionalidades</option></select>
            <select style={{ width: '100%', background: '#27272a', border: 'none', padding: '12px 16px', borderRadius: '6px', color: '#a1a1aa', fontSize: '0.95rem', outline: 'none', appearance: 'none' }}><option>Todas categorias</option></select>
          </div>
          <button style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: '6px', fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.background = '#2563eb'} onMouseOut={e => e.currentTarget.style.background = '#3b82f6'}>Buscar</button>
        </div>

        <div style={{ background: '#1a1a1a', padding: '24px', borderRadius: '8px', marginBottom: '32px', border: '1px solid #27272a' }}>
          <div style={{ textAlign: 'center', color: '#e4e4e7', fontSize: '0.9rem', fontWeight: 800, marginBottom: '16px', letterSpacing: '0.5px' }}>TOTAL DE MEDALHAS</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div style={{ background: '#eab308', color: '#fff', padding: '16px', borderRadius: '6px', textAlign: 'center', fontWeight: 800, fontSize: '1.1rem', textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>{totalGold} OURO</div>
            <div style={{ background: '#9ca3af', color: '#1f2937', padding: '16px', borderRadius: '6px', textAlign: 'center', fontWeight: 900, fontSize: '1.1rem' }}>{totalSilver} PRATA</div>
            <div style={{ background: '#b45309', color: '#fff', padding: '16px', borderRadius: '6px', textAlign: 'center', fontWeight: 800, fontSize: '1.1rem', textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>{totalBronze} BRONZE</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {bracketsWithPodium.map(bracket => {
            const goldAthlete = getAthleteData(bracket.podium.goldId);
            const silverAthlete = getAthleteData(bracket.podium.silverId);
            const bronzeAthlete = getAthleteData(bracket.podium.bronzeId);
            
            return (
              <div key={bracket.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid #27272a' }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#e4e4e7', textTransform: 'uppercase' }}>{bracket.label}</div>
                  <button 
                    onClick={() => setSelectedBracket(bracket)}
                    style={{ background: '#3f3f46', color: '#fff', border: 'none', padding: '4px 12px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>
                    Bracket
                  </button>
                </div>
                
                <div style={{ background: '#1a1a1a', borderRadius: '8px', overflow: 'hidden', border: '1px solid #27272a' }}>
                  {bracket.podium.goldId && (
                    <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #27272a' }}>
                      <div style={{ background: '#eab308', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, marginRight: '16px' }}>1</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {goldAthlete.nome || 'Atleta não encontrado'}
                          <span style={{ fontSize: '0.75rem', color: '#71717a' }}>🇧🇷 BRAZIL</span>
                        </div>
                        <div style={{ color: '#a1a1aa', fontSize: '0.8rem' }}>{goldAthlete.academia || 'Sem equipe'}</div>
                      </div>
                    </div>
                  )}
                  
                  {bracket.podium.silverId && (
                    <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #27272a' }}>
                      <div style={{ background: '#9ca3af', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1f2937', fontWeight: 800, marginRight: '16px' }}>2</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {silverAthlete.nome || 'Atleta não encontrado'}
                          <span style={{ fontSize: '0.75rem', color: '#71717a' }}>🇧🇷 BRAZIL</span>
                        </div>
                        <div style={{ color: '#a1a1aa', fontSize: '0.8rem' }}>{silverAthlete.academia || 'Sem equipe'}</div>
                      </div>
                    </div>
                  )}

                  {bracket.podium.bronzeId && (
                    <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px' }}>
                      <div style={{ background: '#b45309', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, marginRight: '16px' }}>3</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {bronzeAthlete.nome || 'Atleta não encontrado'}
                          <span style={{ fontSize: '0.75rem', color: '#71717a' }}>🇧🇷 BRAZIL</span>
                        </div>
                        <div style={{ color: '#a1a1aa', fontSize: '0.8rem' }}>{bronzeAthlete.academia || 'Sem equipe'}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          
          {bracketsWithPodium.length === 0 && (
            <div style={{ textAlign: 'center', color: '#71717a', padding: '40px', background: '#1a1a1a', borderRadius: '8px', border: '1px dashed #27272a' }}>
              Nenhum resultado de categoria finalizado ainda.
            </div>
          )}
        </div>
      </div>
    </>
    );
  };

  const renderBracketModal = () => {
    if (!selectedBracket) return null;

    const rounds = buildRounds({
      seedIds: selectedBracket.seedIds,
      size: selectedBracket.size,
      liveMatches: selectedBracket.liveMatches,
      athleteMap,
      seedInfoMap: null
    });

    let displayMatches = rounds.flat().filter(m => m.slotAId || m.slotBId);

    if (bracketSearch) {
      const query = bracketSearch.toLowerCase();
      displayMatches = displayMatches.filter(m => {
        const aName = (m.slotALabel || '').toLowerCase();
        const bName = (m.slotBLabel || '').toLowerCase();
        return aName.includes(query) || bName.includes(query);
      });
    }

    return (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
        <div style={{ backgroundColor: '#09090b', borderRadius: '16px', width: '100%', maxWidth: showFullBracket ? '1200px' : '450px', border: '1px solid #27272a', boxShadow: '0 0 40px rgba(59, 130, 246, 0.1), 0 0 0 1px rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', maxHeight: '90vh', transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)', overflow: 'hidden' }}>
          
          <div style={{ padding: '24px', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'linear-gradient(180deg, rgba(39,39,42,0.4) 0%, rgba(9,9,11,0) 100%)', position: 'relative' }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '1.25rem', paddingRight: '24px', color: '#fff', fontWeight: 700, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#3b82f6', boxShadow: '0 0 12px #3b82f6' }}></div>
              {selectedBracket.label}
            </h3>
            <button onClick={() => { setSelectedBracket(null); setShowFullBracket(false); setBracketSearch(''); }} style={{ position: 'absolute', top: '24px', right: '24px', background: 'rgba(255,255,255,0.05)', border: 'none', color: '#a1a1aa', cursor: 'pointer', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#fff'; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#a1a1aa'; }}>
              <X size={18} />
            </button>
            
            <button 
              onClick={() => setShowFullBracket(!showFullBracket)}
              style={{ width: '100%', background: showFullBracket ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)', color: 'white', border: showFullBracket ? '1px solid rgba(255,255,255,0.1)' : 'none', padding: '12px', borderRadius: '10px', fontWeight: 600, cursor: 'pointer', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s', boxShadow: showFullBracket ? 'none' : '0 4px 12px rgba(37, 99, 235, 0.3)' }}
              onMouseEnter={(e) => { if(!showFullBracket) e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={(e) => { if(!showFullBracket) e.currentTarget.style.transform = 'none'; }}
            >
              <Swords size={18} />
              {showFullBracket ? 'Ver lista de lutas' : 'Ver chave completa (Gráfico)'}
            </button>
            
            {!showFullBracket && (
              <div style={{ position: 'relative' }}>
                <Search size={16} color="#71717a" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                <input 
                  type="text" 
                  value={bracketSearch}
                  onChange={(e) => setBracketSearch(e.target.value)}
                  placeholder="Buscar atleta nesta categoria..." 
                  style={{ width: '100%', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '12px 12px 12px 40px', color: '#fff', fontSize: '0.9rem', outline: 'none', transition: 'all 0.2s' }} 
                  onFocus={(e) => { e.target.style.borderColor = '#3b82f6'; e.target.style.backgroundColor = 'rgba(59, 130, 246, 0.05)'; }}
                  onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.backgroundColor = 'rgba(255,255,255,0.03)'; }}
                />
              </div>
            )}
          </div>
          
          <div style={{ padding: '24px', overflowY: 'auto', flex: 1, backgroundColor: showFullBracket ? '#09090b' : 'transparent' }}>
            {showFullBracket ? (
              <div style={{ width: '100%', overflowX: 'auto', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', padding: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <BracketTree 
                  bracket={selectedBracket} 
                  athleteMap={athleteMap} 
                  liveMatches={selectedBracket.liveMatches} 
                />
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 0 16px 0' }}>
                  <h4 style={{ margin: 0, fontSize: '0.875rem', color: '#a1a1aa', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cronograma de Lutas</h4>
                  <span style={{ fontSize: '0.75rem', backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', padding: '4px 8px', borderRadius: '12px', fontWeight: 600 }}>{displayMatches.length} lutas</span>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {displayMatches.map((match, idx) => {
                    const aId = match.slotAId;
                    const bId = match.slotBId;
                    const aName = match.slotALabel || 'Aguardando';
                    const bName = match.slotBLabel || 'Aguardando';

                    return (
                      <div key={idx} style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.2s', cursor: 'default' }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'; }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, position: 'relative' }}>
                          <div style={{ position: 'absolute', left: '15px', top: '22px', bottom: '22px', width: '2px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '2px' }}></div>
                          
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', zIndex: 1 }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: '#60a5fa', fontWeight: 700, boxShadow: 'inset 0 0 10px rgba(59,130,246,0.1)' }}>A</div>
                            {aId ? <Link to={`/perfil-publico/${aId}`} style={{ color: '#fff', textDecoration: 'none', fontWeight: 600, fontSize: '0.95rem', transition: 'color 0.2s' }} onMouseEnter={(e) => e.target.style.color = '#60a5fa'} onMouseLeave={(e) => e.target.style.color = '#fff'}>{aName}</Link> : <span style={{ color: '#71717a', fontSize: '0.95rem', fontStyle: 'italic' }}>{aName}</span>}
                          </div>
                          
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', zIndex: 1 }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: '#f87171', fontWeight: 700, boxShadow: 'inset 0 0 10px rgba(239,68,68,0.1)' }}>B</div>
                            {bId ? <Link to={`/perfil-publico/${bId}`} style={{ color: '#fff', textDecoration: 'none', fontWeight: 600, fontSize: '0.95rem', transition: 'color 0.2s' }} onMouseEnter={(e) => e.target.style.color = '#f87171'} onMouseLeave={(e) => e.target.style.color = '#fff'}>{bName}</Link> : <span style={{ color: '#71717a', fontSize: '0.95rem', fontStyle: 'italic' }}>{bName}</span>}
                          </div>
                        </div>
                        
                        {match.scheduledAt && (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', paddingLeft: '16px', borderLeft: '1px solid rgba(255,255,255,0.05)' }}>
                            <span style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 600, backgroundColor: 'rgba(255,255,255,0.1)', padding: '4px 8px', borderRadius: '6px' }}>{match.scheduledAt}</span>
                            <span style={{ fontSize: '0.75rem', color: '#a1a1aa', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <MapPin size={10} />
                              {match.area}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                
                {displayMatches.length === 0 && (
                  <div style={{ color: '#71717a', fontSize: '0.9rem', textAlign: 'center', padding: '40px 20px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                    {bracketSearch ? 'Nenhum atleta encontrado na busca.' : 'As lutas ainda não foram geradas.'}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="sc-event-page">
      {/* HERO HEADER */}
      <div className="sc-hero">
        <div className="sc-hero-left">
          {event.posterUrl && (
            <img src={event.posterUrl} alt={event.name} className="sc-hero-poster" />
          )}
          <div className="sc-hero-info">
            <h1>{event.name}</h1>
            <p>{eventDateLabel}</p>
          </div>
        </div>
        <div className="sc-hero-actions">
          <button className="sc-btn-icon"><Bell size={18} /></button>
          <button className="sc-btn-icon"><Heart size={18} /></button>
          <Link to={`/eventos/${eventId}/inscricao`} className="sc-btn-primary" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Inscrever-se</Link>
        </div>
      </div>

      {/* TABS NAV */}
      <div className="sc-tabs-nav">
        {[
          { key: 'information', label: copy.infoTab, icon: <BookOpen size={16} /> },
          { key: 'athletes', label: copy.athletesTab, icon: <Users size={16} /> },
          { key: 'brackets', label: copy.bracketsTab, icon: <Swords size={16} /> },
          { key: 'matches', label: copy.matchesTab, icon: <Swords size={16} /> },
          { key: 'schedule', label: copy.scheduleTab, icon: <Clock size={16} /> },
          { key: 'results', label: copy.resultsTab, icon: <BarChart2 size={16} /> },
        ].map(({ key, label, icon }) => (
          <div
            key={key}
            className={`sc-tab ${activeTab === key ? 'active' : ''}`}
            onClick={() => setTab(key)}
          >
            {icon} {label}
          </div>
        ))}
      </div>

      {activeTab === 'information' && renderInformationTab()}
      {activeTab === 'athletes' && renderAthletesTab()}
      {activeTab === 'brackets' && renderBracketsTab()}
      {activeTab === 'matches' && renderMatchesTab()}
      {activeTab === 'schedule' && renderScheduleTab()}
      {activeTab === 'results' && renderResultsTab()}

      {renderBracketModal()}

      <div className="sc-footer">
        Copyright © 2026 Genesis Esportes. All rights reserved.
      </div>
    </div>
  );
};

export default EventDetails;
