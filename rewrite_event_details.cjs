const fs = require('fs');
const path = require('path');
const targetPath = path.join(__dirname, 'src', 'pages', 'EventDetails.jsx');

const code = `import React, { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Bell, Heart, BookOpen, Users, Brackets as BracketsIcon, Swords, Clock, BarChart2, ShieldCheck, Printer } from 'lucide-react';
import { useStore } from '../hooks/useStore';
import { useI18n } from '../hooks/useI18n';
import { formatBrlCurrency, normalizeEventFees } from '../utils/eventPricing';

const parseDate = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
};

const formatDate = (value, locale, fallback) => {
  const date = value instanceof Date ? value : parseDate(value);
  if (!date) return fallback;
  return date.toLocaleDateString(locale, {
    day: '2-digit',
    month: 'short'
  });
};

const EventDetails = () => {
  const { eventId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'information';
  const activeSubTab = searchParams.get('subtab') || 'info';
  
  const { events, eventRegistrations } = useStore();
  const { locale, uiVariant } = useI18n();
  
  const event = useMemo(() => events.find((item) => item.id === eventId), [events, eventId]);
  const eventFees = useMemo(() => normalizeEventFees(event || {}), [event]);

  if (!event) {
    return (
      <div className="sc-event-page">
        <div className="sc-content">Evento não encontrado.</div>
      </div>
    );
  }

  const setTab = (tab) => setSearchParams({ tab });
  const setSubTab = (subtab) => setSearchParams({ tab: 'information', subtab });

  const renderInformationTab = () => (
    <>
      <div className="sc-subnav">
        <div className={\`sc-subtab \${activeSubTab === 'info' ? 'active' : ''}\`} onClick={() => setSubTab('info')}>Information</div>
        <div className={\`sc-subtab \${activeSubTab === 'location' ? 'active' : ''}\`} onClick={() => setSubTab('location')}>Location & Accommodation</div>
      </div>
      
      <div className="sc-content">
        {activeSubTab === 'info' && (
          <div className="sc-info-layout">
            <div className="sc-card">
              {event.posterUrl ? (
                <img src={event.posterUrl} alt={event.name} className="sc-event-banner" />
              ) : (
                <div style={{ height: '300px', backgroundColor: '#18181b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{event.name}</div>
              )}
              <div className="sc-card-content sc-info-main">
                <h2>{event.name}</h2>
                <p>
                  GI: KIDS - JUVENIL - ADULTO - MASTER <br/>
                  NO-GI: INFANTO JUVENIL A - INFANTO JUVENIL B - JUVENIL - ADULTO - MASTER
                </p>
                <div style={{ color: '#eab308', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', fontSize: '0.875rem' }}>
                  ⭐ ⭐ ⭐ ⭐ ⭐ PONTUAÇÃO PARA O RANKING 2024
                </div>
                <div style={{ color: '#a1a1aa', fontSize: '0.875rem' }}>🏅 +100pts</div>
              </div>
            </div>

            <div>
              <div className="sc-card" style={{ marginBottom: '24px' }}>
                <div className="sc-card-content">
                  <div className="sc-dates-block">
                    <small>Early bird registrations</small>
                    <span>28 May - 05 Jun <span style={{color: '#71717a', fontWeight: 'normal'}}>23:59</span></span>
                  </div>
                  <div className="sc-dates-block">
                    <small>Normal registration</small>
                    <span>05 Jun - 15 Jul <span style={{color: '#71717a', fontWeight: 'normal'}}>23:59</span></span>
                  </div>
                  <div className="sc-dates-block">
                    <small>Late registration</small>
                    <span>15 Jul - 14 Aug <span style={{color: '#71717a', fontWeight: 'normal'}}>23:59</span></span>
                  </div>
                  <div className="sc-dates-block" style={{ marginTop: '24px' }}>
                    <small>Event dates</small>
                    <span>22 Aug - 23 Aug</span>
                  </div>
                </div>
              </div>

              <div className="sc-card">
                <div className="sc-organizer-header">
                  Organizer & merchant
                </div>
                <div className="sc-organizer-body">
                  <div className="sc-organizer-title">FIJJD ⓘ</div>
                  <div className="sc-organizer-perk">
                    <ShieldCheck size={16} className="sc-organizer-perk-icon" />
                    <span><strong>2 years</strong> on Genesis</span>
                  </div>
                  <div className="sc-organizer-perk">
                    <ShieldCheck size={16} className="sc-organizer-perk-icon" />
                    <span><strong>50+ events completed</strong> on Genesis</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        {activeSubTab === 'location' && (
          <div>
             <h2 className="sc-section-title">Location & Accommodation</h2>
             <p className="sc-placeholder">{event.location || 'Location TBD'}</p>
          </div>
        )}
      </div>
    </>
  );

  const renderAthletesTab = () => {
    // Para simplificar a POC, não faremos o agrupamento real completo, simularemos o visual
    return (
      <div className="sc-content">
        <h2 className="sc-section-title">Athletes</h2>
        
        <div className="sc-filter-bar">
          <input type="text" className="sc-input" placeholder="Search athlete or division..." />
          <select className="sc-select">
            <option>Select country</option>
            <option>Brazil</option>
          </select>
        </div>

        <div className="sc-category-block">
          <div className="sc-category-title">Kids Masculino GI / Cinza / Infanto Juvenil A / -38,0 kg</div>
          <div className="sc-category-meta">Approved registrations: 0</div>
          <a href="#" className="sc-category-link">Show unapproved registrations (1)</a>
        </div>

        <div className="sc-category-block">
          <div className="sc-category-title">Kids Masculino GI / Laranja / Infanto Juvenil A / -50,0 Kg</div>
          <div className="sc-category-meta">Approved registrations: 0</div>
          <a href="#" className="sc-category-link">Show unapproved registrations (2)</a>
        </div>
      </div>
    );
  };

  const renderPlaceholderTab = (title) => (
    <div className="sc-content">
      <h2 className="sc-section-title" style={{ textTransform: 'uppercase' }}>{title}</h2>
      <p className="sc-placeholder">{title} are not published yet</p>
    </div>
  );

  const renderResultsTab = () => (
    <>
      <div className="sc-subnav">
        <div className="sc-subtab active">Results</div>
        <div className="sc-subtab">Top lists</div>
      </div>
      <div className="sc-content">
        <h2 className="sc-section-title">
          RESULTS
          <button className="sc-btn-print"><Printer size={16}/> Print</button>
        </h2>
        
        <div className="sc-card" style={{ padding: '24px' }}>
          <div className="sc-results-grid">
            <input type="text" className="sc-input" placeholder="Athlete name" />
            <input type="text" className="sc-input" placeholder="Academy name" />
            <input type="text" className="sc-input" placeholder="Group Name" />
            <input type="text" className="sc-input" placeholder="Team name" />
            <select className="sc-select">
              <option>All nationalities</option>
            </select>
            <select className="sc-select">
              <option>All categories</option>
            </select>
          </div>
          <button className="sc-btn-search">Search</button>
        </div>

        <div className="sc-medals-panel">
          <div className="sc-medals-title">TOTAL MEDALS</div>
          <div className="sc-medals-grid">
            <div className="sc-medal-box sc-medal-gold">0 GOLD</div>
            <div className="sc-medal-box sc-medal-silver">0 SILVER</div>
            <div className="sc-medal-box sc-medal-bronze">0 BRONZE</div>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div className="sc-event-page">
      <div className="sc-hero">
        <div className="sc-hero-left">
          {event.posterUrl && <img src={event.posterUrl} alt={event.name} className="sc-hero-poster" />}
          <div className="sc-hero-info">
            <h1>{event.name}</h1>
            <p>22 Aug - 23 Aug</p>
          </div>
        </div>
        <div className="sc-hero-actions">
          <button className="sc-btn-icon"><Bell size={18} /></button>
          <button className="sc-btn-icon"><Heart size={18} /></button>
          <button className="sc-btn-primary">Register</button>
        </div>
      </div>

      <div className="sc-tabs-nav">
        <div className={\`sc-tab \${activeTab === 'information' ? 'active' : ''}\`} onClick={() => setTab('information')}>
          <BookOpen size={16} /> Information
        </div>
        <div className={\`sc-tab \${activeTab === 'athletes' ? 'active' : ''}\`} onClick={() => setTab('athletes')}>
          <Users size={16} /> Athletes
        </div>
        <div className={\`sc-tab \${activeTab === 'brackets' ? 'active' : ''}\`} onClick={() => setTab('brackets')}>
          <BracketsIcon size={16} /> Brackets
        </div>
        <div className={\`sc-tab \${activeTab === 'matches' ? 'active' : ''}\`} onClick={() => setTab('matches')}>
          <Swords size={16} /> Matches
        </div>
        <div className={\`sc-tab \${activeTab === 'schedule' ? 'active' : ''}\`} onClick={() => setTab('schedule')}>
          <Clock size={16} /> Schedule
        </div>
        <div className={\`sc-tab \${activeTab === 'results' ? 'active' : ''}\`} onClick={() => setTab('results')}>
          <BarChart2 size={16} /> Results
        </div>
      </div>

      {activeTab === 'information' && renderInformationTab()}
      {activeTab === 'athletes' && renderAthletesTab()}
      {activeTab === 'brackets' && renderPlaceholderTab('Brackets')}
      {activeTab === 'matches' && renderPlaceholderTab('Matches')}
      {activeTab === 'schedule' && renderPlaceholderTab('Schedule')}
      {activeTab === 'results' && renderResultsTab()}

      <div className="sc-footer">
        Copyright © 2026 FIJJD. All rights reserved.
      </div>
    </div>
  );
};

export default EventDetails;
`;

fs.writeFileSync(targetPath, code);
console.log('EventDetails.jsx rewritten successfully.');
