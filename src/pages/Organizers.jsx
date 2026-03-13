import React, { useMemo, useState } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Mail,
  MessageCircle,
  ShieldCheck,
  Trophy,
  Users
} from 'lucide-react';
import { useI18n } from '../hooks/useI18n';

const CONTACT_PHONE = '5531993383014';
const CONTACT_EMAIL = 'contato@genesisesportes.com.br';

const INITIAL_FORM_STATE = {
  organizerName: '',
  organization: '',
  email: '',
  phone: '',
  city: '',
  eventName: '',
  eventDate: '',
  expectedAthletes: '',
  notes: '',
  services: {
    planning: true,
    registration: true,
    brackets: true,
    ranking: true,
    operation: false
  }
};

const SERVICE_KEYS = ['planning', 'registration', 'brackets', 'ranking', 'operation'];

const Organizers = () => {
  const { uiVariant } = useI18n();
  const [form, setForm] = useState(INITIAL_FORM_STATE);
  const [messageReady, setMessageReady] = useState('');
  const [feedback, setFeedback] = useState('');

  const copyByLanguage = {
    pt: {
      kicker: 'Organizadores',
      title: 'Contrate a Genesis para organizar o seu campeonato',
      subtitle:
        'Operacao completa para eventos de Jiu-Jitsu: inscricoes, validacao de pagamento, categoria, chaveamento, cronograma e ranking final.',
      quickWhatsapp: 'Falar no WhatsApp',
      quickEmail: 'Enviar e-mail',
      serviceCards: {
        planning: {
          title: 'Planejamento tecnico',
          description: 'Definicao de formato, categorias, regras e cronograma oficial.'
        },
        registration: {
          title: 'Inscricao e pagamento',
          description: 'Fluxo digital com comprovante, conferencia e aprovacao administrativa.'
        },
        brackets: {
          title: 'Chaveamento inteligente',
          description: 'Geracao de chaves com organizacao por categoria e modo GI / NO-GI.'
        },
        ranking: {
          title: 'Ranking e relatorios',
          description: 'Resultados por academia e categoria com exportacao profissional em PDF.'
        }
      },
      processTitle: 'Como funciona a contratacao',
      processSteps: [
        {
          title: '1. Envio da solicitacao',
          description: 'Voce informa dados do evento e necessidades operacionais.'
        },
        {
          title: '2. Proposta personalizada',
          description: 'Enviamos escopo, prazo e modelo de execucao para aprovacao.'
        },
        {
          title: '3. Operacao completa',
          description: 'Nossa equipe entrega o evento ponta a ponta com suporte dedicado.'
        }
      ],
      formTitle: 'Solicitar proposta para campeonato',
      formSubtitle: 'Preencha os dados abaixo para receber atendimento comercial.',
      fields: {
        organizerName: 'Nome do responsavel *',
        organization: 'Academia ou organizacao',
        email: 'E-mail *',
        phone: 'Telefone / WhatsApp *',
        city: 'Cidade / Estado',
        eventName: 'Nome do campeonato',
        eventDate: 'Data prevista',
        expectedAthletes: 'Estimativa de atletas',
        services: 'Servicos desejados',
        notes: 'Observacoes'
      },
      placeholders: {
        organizerName: 'Ex: Joao Silva',
        organization: 'Ex: Team Exemplo',
        email: 'Ex: contato@academia.com',
        phone: 'Ex: (31) 99999-0000',
        city: 'Ex: Belo Horizonte - MG',
        eventName: 'Ex: Open Regional 2026',
        expectedAthletes: 'Ex: 350',
        notes: 'Detalhe formatos, niveis, necessidades de equipe e prazo.'
      },
      services: {
        planning: 'Planejamento do evento',
        registration: 'Sistema de inscricao e pagamento',
        brackets: 'Chaveamento e cronograma',
        ranking: 'Ranking e relatorios',
        operation: 'Operacao presencial no dia do evento'
      },
      validationError: 'Informe nome, e-mail e telefone para continuar.',
      success:
        'Solicitacao pronta. Agora escolha o canal abaixo para enviar seu briefing para a equipe Genesis.',
      submit: 'Gerar solicitacao',
      sendWhatsapp: 'Enviar briefing no WhatsApp',
      sendEmail: 'Enviar briefing por e-mail',
      asideTitle: 'Escopo que podemos assumir no seu campeonato',
      asideItems: [
        'Cadastro completo de evento com tabelas de peso GI e NO-GI.',
        'Inscricao online com comprovante e validacao por administradores.',
        'Pipeline automatico: inscrito, aprovado, categoria e chave.',
        'Gerador de chave com organizacao por academia e categoria.',
        'Relatorios oficiais e PDFs padronizados com identidade Genesis.'
      ],
      leadHeader: 'Solicitacao comercial - Organizacao de campeonato'
    },
    en: {
      kicker: 'Organizers',
      title: 'Hire Genesis to run your championship',
      subtitle:
        'Complete operation for Jiu-Jitsu events: registration, payment validation, category flow, brackets, schedule and final ranking.',
      quickWhatsapp: 'Talk on WhatsApp',
      quickEmail: 'Send e-mail',
      serviceCards: {
        planning: {
          title: 'Technical planning',
          description: 'Event format, divisions, rules and official schedule definition.'
        },
        registration: {
          title: 'Registration and payment',
          description: 'Digital flow with receipt upload, review and administrative approval.'
        },
        brackets: {
          title: 'Smart bracketing',
          description: 'Automatic brackets organized by division and GI / NO-GI mode.'
        },
        ranking: {
          title: 'Ranking and reports',
          description: 'Results by academy and division with professional PDF exports.'
        }
      },
      processTitle: 'How hiring works',
      processSteps: [
        {
          title: '1. Submit request',
          description: 'You provide event data and operational requirements.'
        },
        {
          title: '2. Custom proposal',
          description: 'We send scope, timeline and execution model for approval.'
        },
        {
          title: '3. Full delivery',
          description: 'Our team executes the event end to end with dedicated support.'
        }
      ],
      formTitle: 'Request a championship proposal',
      formSubtitle: 'Fill out the form below to receive commercial support.',
      fields: {
        organizerName: 'Responsible person *',
        organization: 'Academy or organization',
        email: 'E-mail *',
        phone: 'Phone / WhatsApp *',
        city: 'City / State',
        eventName: 'Championship name',
        eventDate: 'Expected date',
        expectedAthletes: 'Expected athletes',
        services: 'Requested services',
        notes: 'Notes'
      },
      placeholders: {
        organizerName: 'Ex: John Smith',
        organization: 'Ex: Team Example',
        email: 'Ex: contact@academy.com',
        phone: 'Ex: +55 31 99999-0000',
        city: 'Ex: Belo Horizonte - MG',
        eventName: 'Ex: Regional Open 2026',
        expectedAthletes: 'Ex: 350',
        notes: 'Describe format, divisions, staffing needs and target timeline.'
      },
      services: {
        planning: 'Event planning',
        registration: 'Registration and payment system',
        brackets: 'Brackets and schedule',
        ranking: 'Ranking and reports',
        operation: 'On-site operation on event day'
      },
      validationError: 'Please provide name, e-mail and phone.',
      success: 'Request is ready. Choose a channel below to send your briefing to Genesis.',
      submit: 'Generate request',
      sendWhatsapp: 'Send briefing on WhatsApp',
      sendEmail: 'Send briefing by e-mail',
      asideTitle: 'Scope we can deliver for your championship',
      asideItems: [
        'Event setup with dedicated GI and NO-GI weight tables.',
        'Online registration with payment proof and admin review.',
        'Automatic pipeline: registered, approved, in category and in bracket.',
        'Bracket generator organized by academy and division.',
        'Official reports and standardized Genesis-branded PDFs.'
      ],
      leadHeader: 'Commercial request - Championship organization'
    },
    es: {
      kicker: 'Organizadores',
      title: 'Contrate a Genesis para organizar su campeonato',
      subtitle:
        'Operacion completa para eventos de Jiu-Jitsu: inscripcion, validacion de pago, categoria, llaves, cronograma y ranking final.',
      quickWhatsapp: 'Hablar por WhatsApp',
      quickEmail: 'Enviar correo',
      serviceCards: {
        planning: {
          title: 'Planificacion tecnica',
          description: 'Definicion de formato, categorias, reglas y cronograma oficial.'
        },
        registration: {
          title: 'Inscripcion y pago',
          description: 'Flujo digital con comprobante, revision y aprobacion administrativa.'
        },
        brackets: {
          title: 'Llaves inteligentes',
          description: 'Generacion automatica por categoria y modo GI / NO-GI.'
        },
        ranking: {
          title: 'Ranking e informes',
          description: 'Resultados por academia y categoria con exportacion profesional en PDF.'
        }
      },
      processTitle: 'Como funciona la contratacion',
      processSteps: [
        {
          title: '1. Envio de solicitud',
          description: 'Usted informa datos del evento y necesidades operativas.'
        },
        {
          title: '2. Propuesta personalizada',
          description: 'Enviamos alcance, plazo y modelo de ejecucion para aprobacion.'
        },
        {
          title: '3. Operacion completa',
          description: 'Nuestro equipo entrega el evento de punta a punta.'
        }
      ],
      formTitle: 'Solicitar propuesta para campeonato',
      formSubtitle: 'Complete los datos para recibir atencion comercial.',
      fields: {
        organizerName: 'Nombre del responsable *',
        organization: 'Academia u organizacion',
        email: 'Correo *',
        phone: 'Telefono / WhatsApp *',
        city: 'Ciudad / Estado',
        eventName: 'Nombre del campeonato',
        eventDate: 'Fecha prevista',
        expectedAthletes: 'Estimacion de atletas',
        services: 'Servicios requeridos',
        notes: 'Observaciones'
      },
      placeholders: {
        organizerName: 'Ej: Juan Silva',
        organization: 'Ej: Team Ejemplo',
        email: 'Ej: contacto@academia.com',
        phone: 'Ej: +55 31 99999-0000',
        city: 'Ej: Belo Horizonte - MG',
        eventName: 'Ej: Open Regional 2026',
        expectedAthletes: 'Ej: 350',
        notes: 'Detalle formato, categorias, equipo necesario y plazo.'
      },
      services: {
        planning: 'Planificacion del evento',
        registration: 'Sistema de inscripcion y pago',
        brackets: 'Llaves y cronograma',
        ranking: 'Ranking e informes',
        operation: 'Operacion presencial el dia del evento'
      },
      validationError: 'Informe nombre, correo y telefono.',
      success: 'Solicitud lista. Elija un canal para enviar su briefing a Genesis.',
      submit: 'Generar solicitud',
      sendWhatsapp: 'Enviar briefing por WhatsApp',
      sendEmail: 'Enviar briefing por correo',
      asideTitle: 'Alcance que podemos asumir en su campeonato',
      asideItems: [
        'Configuracion completa del evento con tablas GI y NO-GI.',
        'Inscripcion en linea con comprobante y revision administrativa.',
        'Pipeline automatico: inscrito, aprobado, en categoria y en llave.',
        'Generador de llaves por academia y categoria.',
        'Informes oficiales y PDFs estandarizados con identidad Genesis.'
      ],
      leadHeader: 'Solicitud comercial - Organizacion de campeonato'
    },
    fr: {
      kicker: 'Organisateurs',
      title: 'Confiez votre championnat a Genesis',
      subtitle:
        'Operation complete pour les evenements de Jiu-Jitsu: inscription, validation de paiement, categories, tableaux, planning et classement final.',
      quickWhatsapp: 'Parler sur WhatsApp',
      quickEmail: 'Envoyer un e-mail',
      serviceCards: {
        planning: {
          title: 'Planification technique',
          description: 'Definition du format, des categories, des regles et du planning officiel.'
        },
        registration: {
          title: 'Inscriptions et paiement',
          description: 'Flux numerique avec recu, verification et validation administrative.'
        },
        brackets: {
          title: 'Tableaux intelligents',
          description: 'Generation automatique par categorie et mode GI / NO-GI.'
        },
        ranking: {
          title: 'Classement et rapports',
          description: 'Resultats par academie et categorie avec export PDF professionnel.'
        }
      },
      processTitle: 'Comment fonctionne la demande',
      processSteps: [
        {
          title: '1. Envoi de la demande',
          description: 'Vous renseignez les donnees de votre evenement.'
        },
        {
          title: '2. Proposition personnalisee',
          description: 'Nous envoyons le perimetre, le delai et le mode operationnel.'
        },
        {
          title: '3. Livraison complete',
          description: 'Notre equipe execute le championnat de bout en bout.'
        }
      ],
      formTitle: 'Demander une proposition',
      formSubtitle: 'Remplissez le formulaire pour un contact commercial.',
      fields: {
        organizerName: 'Nom du responsable *',
        organization: 'Academie ou organisation',
        email: 'E-mail *',
        phone: 'Telephone / WhatsApp *',
        city: 'Ville / Region',
        eventName: "Nom du championnat",
        eventDate: 'Date prevue',
        expectedAthletes: 'Nombre estime dathletes',
        services: 'Services souhaites',
        notes: 'Observations'
      },
      placeholders: {
        organizerName: 'Ex: Jean Silva',
        organization: 'Ex: Team Exemple',
        email: 'Ex: contact@academie.com',
        phone: 'Ex: +55 31 99999-0000',
        city: 'Ex: Belo Horizonte - MG',
        eventName: 'Ex: Open Regional 2026',
        expectedAthletes: 'Ex: 350',
        notes: 'Detaillez format, categories, equipe et delai.'
      },
      services: {
        planning: "Planification de l'evenement",
        registration: "Systeme d'inscription et paiement",
        brackets: 'Tableaux et planning',
        ranking: 'Classement et rapports',
        operation: "Operation sur site le jour de l'evenement"
      },
      validationError: 'Veuillez renseigner nom, e-mail et telephone.',
      success: 'Demande prete. Choisissez un canal ci-dessous pour envoyer votre briefing.',
      submit: 'Generer la demande',
      sendWhatsapp: 'Envoyer sur WhatsApp',
      sendEmail: 'Envoyer par e-mail',
      asideTitle: 'Perimetre que nous pouvons livrer',
      asideItems: [
        'Configuration complete avec tableaux de poids GI et NO-GI.',
        'Inscriptions en ligne avec justificatif et validation admin.',
        'Pipeline automatique: inscrit, approuve, en categorie, en tableau.',
        'Generation des tableaux par academie et categorie.',
        'Rapports officiels et PDFs standardises a la marque Genesis.'
      ],
      leadHeader: 'Demande commerciale - Organisation de championnat'
    }
  };
  const copy = copyByLanguage[uiVariant] || copyByLanguage.pt;

  const serviceCards = useMemo(
    () => [
      { key: 'planning', icon: ClipboardList },
      { key: 'registration', icon: ShieldCheck },
      { key: 'brackets', icon: Trophy },
      { key: 'ranking', icon: Users }
    ],
    []
  );

  const whatsappDirectLink = `https://api.whatsapp.com/send?phone=${CONTACT_PHONE}`;
  const emailDirectLink = `mailto:${CONTACT_EMAIL}`;

  const handleInputChange = (field) => (event) => {
    const value = event.target.value;
    setForm((previous) => ({ ...previous, [field]: value }));
  };

  const handleServiceToggle = (serviceKey) => (event) => {
    const checked = event.target.checked;
    setForm((previous) => ({
      ...previous,
      services: {
        ...previous.services,
        [serviceKey]: checked
      }
    }));
  };

  const buildLeadMessage = () => {
    const selectedServices = SERVICE_KEYS
      .filter((key) => form.services[key])
      .map((key) => copy.services[key]);

    const lines = [
      copy.leadHeader,
      '',
      `${copy.fields.organizerName.replace(' *', '')}: ${form.organizerName || '-'}`,
      `${copy.fields.organization}: ${form.organization || '-'}`,
      `${copy.fields.email.replace(' *', '')}: ${form.email || '-'}`,
      `${copy.fields.phone.replace(' *', '')}: ${form.phone || '-'}`,
      `${copy.fields.city}: ${form.city || '-'}`,
      `${copy.fields.eventName}: ${form.eventName || '-'}`,
      `${copy.fields.eventDate}: ${form.eventDate || '-'}`,
      `${copy.fields.expectedAthletes}: ${form.expectedAthletes || '-'}`,
      `${copy.fields.services}: ${selectedServices.length ? selectedServices.join(', ') : '-'}`,
      `${copy.fields.notes}: ${form.notes || '-'}`
    ];

    return lines.join('\n');
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const name = form.organizerName.trim();
    const email = form.email.trim();
    const phone = form.phone.trim();

    if (!name || !email || !phone) {
      setFeedback(copy.validationError);
      setMessageReady('');
      return;
    }

    const message = buildLeadMessage();
    setMessageReady(message);
    setFeedback(copy.success);
  };

  const whatsappLeadLink = messageReady
    ? `https://api.whatsapp.com/send?phone=${CONTACT_PHONE}&text=${encodeURIComponent(messageReady)}`
    : whatsappDirectLink;
  const emailLeadLink = messageReady
    ? `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(copy.leadHeader)}&body=${encodeURIComponent(messageReady)}`
    : emailDirectLink;

  return (
    <div className="public-page organizers-page">
      <section className="public-header organizers-header">
        <div>
          <span className="section-kicker">{copy.kicker}</span>
          <h1>{copy.title}</h1>
          <p>{copy.subtitle}</p>
        </div>
        <div className="organizers-header__actions">
          <a className="btn btn-primary" href={whatsappDirectLink} target="_blank" rel="noreferrer">
            <MessageCircle size={16} /> {copy.quickWhatsapp}
          </a>
          <a className="btn btn-secondary" href={emailDirectLink}>
            <Mail size={16} /> {copy.quickEmail}
          </a>
        </div>
      </section>

      <section className="public-section">
        <div className="organizers-services-grid">
          {serviceCards.map((card) => {
            const Icon = card.icon;
            const content = copy.serviceCards[card.key];
            return (
              <article className="content-card organizers-service-card" key={card.key}>
                <div className="feature-icon">
                  <Icon size={18} />
                </div>
                <h3>{content.title}</h3>
                <p>{content.description}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="public-section">
        <article className="content-card organizers-process-card">
          <h3>{copy.processTitle}</h3>
          <div className="organizers-process-grid">
            {copy.processSteps.map((step) => (
              <div className="organizers-process-step" key={step.title}>
                <CalendarDays size={18} />
                <strong>{step.title}</strong>
                <p>{step.description}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="public-section">
        <div className="organizers-form-layout">
          <form className="content-card organizers-form-card" onSubmit={handleSubmit}>
            <h3>{copy.formTitle}</h3>
            <p className="organizers-form-card__subtitle">{copy.formSubtitle}</p>

            <div className="organizers-fields-grid">
              <label className="organizers-field">
                <span>{copy.fields.organizerName}</span>
                <input
                  type="text"
                  className="input"
                  value={form.organizerName}
                  onChange={handleInputChange('organizerName')}
                  placeholder={copy.placeholders.organizerName}
                />
              </label>

              <label className="organizers-field">
                <span>{copy.fields.organization}</span>
                <input
                  type="text"
                  className="input"
                  value={form.organization}
                  onChange={handleInputChange('organization')}
                  placeholder={copy.placeholders.organization}
                />
              </label>

              <label className="organizers-field">
                <span>{copy.fields.email}</span>
                <input
                  type="email"
                  className="input"
                  value={form.email}
                  onChange={handleInputChange('email')}
                  placeholder={copy.placeholders.email}
                />
              </label>

              <label className="organizers-field">
                <span>{copy.fields.phone}</span>
                <input
                  type="text"
                  className="input"
                  value={form.phone}
                  onChange={handleInputChange('phone')}
                  placeholder={copy.placeholders.phone}
                />
              </label>

              <label className="organizers-field">
                <span>{copy.fields.city}</span>
                <input
                  type="text"
                  className="input"
                  value={form.city}
                  onChange={handleInputChange('city')}
                  placeholder={copy.placeholders.city}
                />
              </label>

              <label className="organizers-field">
                <span>{copy.fields.eventName}</span>
                <input
                  type="text"
                  className="input"
                  value={form.eventName}
                  onChange={handleInputChange('eventName')}
                  placeholder={copy.placeholders.eventName}
                />
              </label>

              <label className="organizers-field">
                <span>{copy.fields.eventDate}</span>
                <input
                  type="date"
                  className="input"
                  value={form.eventDate}
                  onChange={handleInputChange('eventDate')}
                />
              </label>

              <label className="organizers-field">
                <span>{copy.fields.expectedAthletes}</span>
                <input
                  type="number"
                  className="input"
                  min="1"
                  step="1"
                  value={form.expectedAthletes}
                  onChange={handleInputChange('expectedAthletes')}
                  placeholder={copy.placeholders.expectedAthletes}
                />
              </label>

              <div className="organizers-field organizers-field--full">
                <span>{copy.fields.services}</span>
                <div className="organizers-services-chips">
                  {SERVICE_KEYS.map((key) => (
                    <label className="organizers-service-chip" key={key}>
                      <input
                        type="checkbox"
                        checked={Boolean(form.services[key])}
                        onChange={handleServiceToggle(key)}
                      />
                      <span>{copy.services[key]}</span>
                    </label>
                  ))}
                </div>
              </div>

              <label className="organizers-field organizers-field--full">
                <span>{copy.fields.notes}</span>
                <textarea
                  className="input organizers-textarea"
                  rows={4}
                  value={form.notes}
                  onChange={handleInputChange('notes')}
                  placeholder={copy.placeholders.notes}
                />
              </label>
            </div>

            <div className="organizers-form-actions">
              <button type="submit" className="btn btn-primary">
                {copy.submit}
              </button>
            </div>

            {feedback && (
              <p className={`organizers-feedback ${messageReady ? 'is-success' : 'is-error'}`}>
                {feedback}
              </p>
            )}

            {messageReady && (
              <div className="organizers-submit-links">
                <a className="btn btn-primary" href={whatsappLeadLink} target="_blank" rel="noreferrer">
                  <MessageCircle size={16} /> {copy.sendWhatsapp}
                </a>
                <a className="btn btn-secondary" href={emailLeadLink}>
                  <Mail size={16} /> {copy.sendEmail}
                </a>
              </div>
            )}
          </form>

          <aside className="content-card organizers-aside-card">
            <h3>{copy.asideTitle}</h3>
            <ul className="text-list">
              {copy.asideItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <div className="organizers-aside-card__badge">
              <CheckCircle2 size={16} />
              <span>Genesis Esportes</span>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
};

export default Organizers;
