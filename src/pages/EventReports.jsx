import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ExternalLink, FileText, Printer } from 'lucide-react';
import { useStore } from '../hooks/useStore';
import { useI18n } from '../hooks/useI18n';
import { publicRegistrationService } from '../services/publicRegistrationService';
import { REGISTRATION_STATUS, normalizeRegistrationStatus } from '../utils/registrationStatus';
import { generateRegistrationListingPDF } from '../services/pdfService';

const normalizeModeToken = (value) => (
  (value || '')
    .toString()
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '')
);

const normalizeMode = (value) => {
  const token = normalizeModeToken(value);
  if (!token) return 'GI';
  if (token.includes('NOGI') || token.includes('NO-GI')) return 'NO-GI';
  return 'GI';
};

const resolveView = (value) => {
  const raw = (value || '').toString().trim().toLowerCase();
  return raw === 'category' ? 'category' : 'academy';
};

const parseNotes = (value) => {
  if (!value || typeof value !== 'string') return null;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
};

const toUpperLabel = (value, locale) => (
  (value || '-')
    .toString()
    .trim()
    .toLocaleUpperCase(locale || 'pt-BR')
);

const buildDivisionLabel = (row, locale) => (
  [
    toUpperLabel(row.gender || '-', locale),
    toUpperLabel(row.belt || '-', locale),
    toUpperLabel(row.category || '-', locale),
    toUpperLabel(row.weight || '-', locale)
  ].join(' / ')
);

const parseTimestamp = (value) => {
  const parsed = new Date(value || '');
  const time = parsed.getTime();
  return Number.isFinite(time) ? time : 0;
};

const EventReports = () => {
  const { eventId } = useParams();
  const { events } = useStore();
  const { locale, uiVariant } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [registrations, setRegistrations] = useState([]);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportError, setExportError] = useState('');
  const view = resolveView(searchParams.get('view'));
  const mode = normalizeMode(searchParams.get('mode') || 'GI');

  const copyByLanguage = {
    pt: {
      back: 'Voltar para evento',
      titleAcademy: 'Relação de atletas por academia',
      titleCategory: 'Relação de atletas por categoria',
      updatedAt: 'Atualizado em',
      totalAthletes: 'Total de atletas',
      athlete: 'Atleta',
      academy: 'Academia',
      division: 'Divisão',
      noData: 'Nenhuma inscrição encontrada para este evento/modalidade.',
      loading: 'Carregando inscrições...',
      printReport: 'Imprimir',
      exportPdf: 'Exportar PDF',
      exportingPdf: 'Gerando PDF...',
      exportPdfError: 'Falha ao gerar PDF do relatório.',
      openWeightGi: 'Tabela de peso',
      openWeightNoGi: 'Tabela de peso NO-GI',
      openCircular: 'Circular do evento',
      missingResource: 'Arquivo não configurado',
      actions: {
        byAcademyGi: 'Atletas por academia',
        byCategoryGi: 'Atletas por categoria',
        byAcademyNoGi: 'Atletas por academia NO-GI',
        byCategoryNoGi: 'Atletas por categoria NO-GI'
      },
      notPublishedYet: 'Relatórios em preparação. Aguarde a publicação oficial do evento.'
    },
    en: {
      back: 'Back to event',
      titleAcademy: 'Athletes by academy',
      titleCategory: 'Athletes by category',
      updatedAt: 'Updated at',
      totalAthletes: 'Total athletes',
      athlete: 'Athlete',
      academy: 'Academy',
      division: 'Division',
      noData: 'No registrations found for this event/mode.',
      loading: 'Loading registrations...',
      printReport: 'Print',
      exportPdf: 'Export PDF',
      exportingPdf: 'Generating PDF...',
      exportPdfError: 'Failed to generate report PDF.',
      openWeightGi: 'Weight table',
      openWeightNoGi: 'Weight table NO-GI',
      openCircular: 'Event circular',
      missingResource: 'File not configured',
      actions: {
        byAcademyGi: 'Athletes by academy',
        byCategoryGi: 'Athletes by category',
        byAcademyNoGi: 'Athletes by academy NO-GI',
        byCategoryNoGi: 'Athletes by category NO-GI'
      },
      notPublishedYet: 'Reports are in preparation. Wait for official event publishing.'
    },
    es: {
      back: 'Volver al evento',
      titleAcademy: 'Relacion de atletas por academia',
      titleCategory: 'Relacion de atletas por categoria',
      updatedAt: 'Actualizado en',
      totalAthletes: 'Total de atletas',
      athlete: 'Atleta',
      academy: 'Academia',
      division: 'Division',
      noData: 'No se encontraron inscripciones para este evento/modalidad.',
      loading: 'Cargando inscripciones...',
      printReport: 'Imprimir',
      exportPdf: 'Exportar PDF',
      exportingPdf: 'Generando PDF...',
      exportPdfError: 'No fue posible generar el PDF del reporte.',
      openWeightGi: 'Tabla de peso',
      openWeightNoGi: 'Tabla de peso NO-GI',
      openCircular: 'Circular del evento',
      missingResource: 'Archivo no configurado',
      actions: {
        byAcademyGi: 'Atletas por academia',
        byCategoryGi: 'Atletas por categoria',
        byAcademyNoGi: 'Atletas por academia NO-GI',
        byCategoryNoGi: 'Atletas por categoria NO-GI'
      },
      notPublishedYet: 'Los reportes estan en preparacion. Espere la publicacion oficial del evento.'
    },
    fr: {
      back: "Retour a l'evenement",
      titleAcademy: 'Liste des athletes par academie',
      titleCategory: 'Liste des athletes par categorie',
      updatedAt: 'Mis a jour le',
      totalAthletes: "Total d'athletes",
      athlete: 'Athlete',
      academy: 'Academie',
      division: 'Division',
      noData: "Aucune inscription trouvee pour cet evenement/mode.",
      loading: 'Chargement des inscriptions...',
      printReport: 'Imprimer',
      exportPdf: 'Exporter PDF',
      exportingPdf: 'Generation du PDF...',
      exportPdfError: 'Impossible de generer le PDF du rapport.',
      openWeightGi: 'Table de poids',
      openWeightNoGi: 'Table de poids NO-GI',
      openCircular: "Circulaire de l'evenement",
      missingResource: 'Fichier non configure',
      actions: {
        byAcademyGi: 'Athletes par academie',
        byCategoryGi: 'Athletes par categorie',
        byAcademyNoGi: 'Athletes par academie NO-GI',
        byCategoryNoGi: 'Athletes par categorie NO-GI'
      },
      notPublishedYet: 'Les rapports sont en preparation. Attendez la publication officielle de l evenement.'
    }
  };

  const copy = copyByLanguage[uiVariant] || copyByLanguage.pt;

  const event = useMemo(
    () => events.find((item) => item.id === eventId),
    [events, eventId]
  );

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError('');
      try {
        const payload = await publicRegistrationService.listRegistrations(eventId);
        if (cancelled) return;
        setRegistrations(Array.isArray(payload) ? payload : []);
      } catch (err) {
        if (cancelled) return;
        setRegistrations([]);
        setError(err?.message || 'Falha ao carregar inscrições.');
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  const rows = useMemo(() => {
    const expanded = [];

    registrations.forEach((item) => {
      const status = normalizeRegistrationStatus(item?.status);
      if (status === REGISTRATION_STATUS.PAYMENT_ERROR) {
        return;
      }

      const notes = parseNotes(item?.notes);
      const registrationType = normalizeModeToken(notes?.tipoInscricao || item?.modalidade || '');
      const hasNoGi = registrationType.includes('NOGI') || normalizeMode(item?.modalidade) === 'NO-GI';
      const hasGi = registrationType.includes('GI') || !hasNoGi;

      const base = {
        athleteName: (item?.nome || '').toString().trim(),
        academyName: (item?.academia || '').toString().trim() || 'Sem academia',
        gender: (item?.genero || notes?.genero || '').toString().trim() || '-',
        belt: (item?.faixa || notes?.faixa || '').toString().trim() || '-',
        category: (notes?.categoriaFinal || notes?.categoriaConfirmada || item?.categoria || '').toString().trim() || '-',
        createdAt: item?.createdAt || '',
      };

      if (!base.athleteName) {
        return;
      }

      if (hasGi) {
        expanded.push({
          ...base,
          mode: 'GI',
          weight: (notes?.pesoGiSelecionado || item?.peso || '').toString().trim() || '-'
        });
      }

      if (hasNoGi) {
        expanded.push({
          ...base,
          mode: 'NO-GI',
          weight: (notes?.pesoNoGiSelecionado || item?.peso || '').toString().trim() || '-'
        });
      }
    });

    return expanded
      .filter((item) => item.mode === mode)
      .sort((a, b) => a.athleteName.localeCompare(b.athleteName));
  }, [registrations, mode]);

  const updatedAt = useMemo(() => {
    const latest = rows.reduce((acc, row) => Math.max(acc, parseTimestamp(row.createdAt)), 0);
    return latest > 0 ? new Date(latest) : new Date();
  }, [rows]);

  const grouped = useMemo(() => {
    const map = new Map();
    rows.forEach((row) => {
      const key = view === 'category'
        ? buildDivisionLabel(row, locale)
        : row.academyName;
      const current = map.get(key) || [];
      current.push(row);
      map.set(key, current);
    });

    return [...map.entries()]
      .map(([label, entries]) => ({
        label,
        entries: entries.slice().sort((a, b) => a.athleteName.localeCompare(b.athleteName))
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [rows, view, locale]);

  const setViewMode = (nextView, nextMode) => {
    const params = new URLSearchParams(searchParams);
    params.set('view', nextView);
    params.set('mode', nextMode);
    setSearchParams(params, { replace: true });
  };

  const handlePrintReport = () => {
    if (typeof window !== 'undefined' && typeof window.print === 'function') {
      window.print();
    }
  };

  const reportTitle = view === 'category' ? copy.titleCategory : copy.titleAcademy;
  const eventName = event?.name || (registrations[0]?.eventName || 'Evento');
  const eventDate = event?.date || registrations[0]?.eventDate || '';
  const eventLocation = event?.location || registrations[0]?.eventLocation || '';
  const isPublicLocked = Boolean(event && event.registrationOpen === false && event.publicPublished === false);

  const handleExportPdf = async () => {
    if (loading || rows.length === 0 || exportingPdf) return;
    setExportError('');
    setExportingPdf(true);
    try {
      await generateRegistrationListingPDF(rows, {
        eventName,
        eventDate,
        eventLocation,
        mode,
        reportType: view,
        template: 'classic-white',
        updatedAtLabel: copy.updatedAt,
        updatedAtValue: updatedAt.toLocaleString(locale)
      });
    } catch (err) {
      setExportError(err?.message || copy.exportPdfError);
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <div className="public-page">
      {isPublicLocked ? (
        <section className="public-section">
          <div className="content-card">
            <p>{copy.notPublishedYet}</p>
            <Link className="text-link" to={`/eventos/${eventId}`}>{copy.back}</Link>
          </div>
        </section>
      ) : (
      <section className="event-report-shell">
        <header className="event-report-top">
          <div className="event-report-top__head">
            <p>{copy.updatedAt} {updatedAt.toLocaleString(locale)}</p>
            <Link className="text-link" to={`/eventos/${eventId}`}>{copy.back}</Link>
          </div>
          <h1>{eventName}</h1>
          <p className="event-report-top__meta">
            {eventDate || ''}{eventDate && eventLocation ? ' - ' : ''}{eventLocation || ''}
          </p>
        </header>

        <div className="event-report-actions">
          <button
            type="button"
            className="btn btn-secondary btn-event--small event-report-actions__print"
            onClick={handlePrintReport}
          >
            <Printer size={13} />
            {copy.printReport}
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-event--small event-report-actions__print"
            onClick={handleExportPdf}
            disabled={loading || rows.length === 0 || exportingPdf}
          >
            <FileText size={13} />
            {exportingPdf ? copy.exportingPdf : copy.exportPdf}
          </button>
          <button
            type="button"
            className={`btn btn-secondary btn-event--small ${view === 'academy' && mode === 'GI' ? 'is-active' : ''}`}
            onClick={() => setViewMode('academy', 'GI')}
          >
            {copy.actions.byAcademyGi}
          </button>
          <button
            type="button"
            className={`btn btn-secondary btn-event--small ${view === 'category' && mode === 'GI' ? 'is-active' : ''}`}
            onClick={() => setViewMode('category', 'GI')}
          >
            {copy.actions.byCategoryGi}
          </button>
          <button
            type="button"
            className={`btn btn-secondary btn-event--small ${view === 'academy' && mode === 'NO-GI' ? 'is-active' : ''}`}
            onClick={() => setViewMode('academy', 'NO-GI')}
          >
            {copy.actions.byAcademyNoGi}
          </button>
          <button
            type="button"
            className={`btn btn-secondary btn-event--small ${view === 'category' && mode === 'NO-GI' ? 'is-active' : ''}`}
            onClick={() => setViewMode('category', 'NO-GI')}
          >
            {copy.actions.byCategoryNoGi}
          </button>
          {event?.weightTableGiUrl ? (
            <a className="btn btn-secondary btn-event--small" href={event.weightTableGiUrl} target="_blank" rel="noreferrer">
              {copy.openWeightGi} <ExternalLink size={12} />
            </a>
          ) : (
            <span className="tag">{copy.openWeightGi}: {copy.missingResource}</span>
          )}
          {event?.weightTableNoGiUrl ? (
            <a className="btn btn-secondary btn-event--small" href={event.weightTableNoGiUrl} target="_blank" rel="noreferrer">
              {copy.openWeightNoGi} <ExternalLink size={12} />
            </a>
          ) : (
            <span className="tag">{copy.openWeightNoGi}: {copy.missingResource}</span>
          )}
          {event?.circularUrl ? (
            <a className="btn btn-secondary btn-event--small" href={event.circularUrl} target="_blank" rel="noreferrer">
              {copy.openCircular} <ExternalLink size={12} />
            </a>
          ) : (
            <span className="tag">{copy.openCircular}: {copy.missingResource}</span>
          )}
        </div>
        {exportError && <p className="event-report-empty">{exportError}</p>}

        <article className="event-report-document">
          <header className="event-report-document__head">
            <h2>{reportTitle}</h2>
            <span className="tag">{mode}</span>
          </header>

          {loading && <p className="event-report-empty">{copy.loading}</p>}
          {!loading && error && <p className="event-report-empty">{error}</p>}
          {!loading && !error && grouped.length === 0 && (
            <p className="event-report-empty">{copy.noData}</p>
          )}

          {!loading && !error && grouped.length > 0 && (
            <div className="event-report-groups">
              {grouped.map((group) => (
                <section key={group.label} className="event-report-group">
                  <h3>{group.label}</h3>
                  <div className="event-report-group__count">
                    {copy.totalAthletes}: {group.entries.length}
                  </div>
                  <div className="event-report-table">
                    <div className="event-report-table__head">
                      <span>{copy.athlete}</span>
                      <span>{view === 'category' ? copy.academy : copy.division}</span>
                    </div>
                    <div className="event-report-table__body">
                      {group.entries.map((row) => (
                        <div key={`${group.label}-${row.athleteName}-${row.academyName}-${row.weight}`} className="event-report-table__row">
                          <span>{row.athleteName}</span>
                          <span>
                            {view === 'category'
                              ? row.academyName
                              : buildDivisionLabel(row, locale)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              ))}
            </div>
          )}
        </article>
      </section>
      )}
    </div>
  );
};

export default EventReports;
