import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Trophy, User, Activity, Settings, AlertCircle } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import Dashboard from './pages/Dashboard';
import Ranking from './pages/Ranking';
import TeamRanking from './pages/TeamRanking';
import { useStore } from './hooks/useStore';
import './index.css';

const AppLayout = () => {
  const {
    currentUser,
    eventModalOpen,
    openEventModal,
    closeEventModal,
    addEvent
  } = useStore();
  const location = useLocation();
  const [logoReady, setLogoReady] = useState(true);
  const [eventForm, setEventForm] = useState({ name: '', date: '', location: '' });
  const [eventError, setEventError] = useState('');

  const handleOpenEventModal = () => {
    setEventError('');
    openEventModal();
  };

  const handleCloseEventModal = () => {
    setEventError('');
    setEventForm({ name: '', date: '', location: '' });
    closeEventModal();
  };

  const handleCreateEvent = (event) => {
    event.preventDefault();
    setEventError('');

    try {
      addEvent(eventForm);
      setEventForm({ name: '', date: '', location: '' });
      closeEventModal();
    } catch (err) {
      setEventError(err?.message || 'Falha ao criar evento.');
    }
  };

  return (
    <div className="app-shell">
      <header className="app-topbar">
        <div className="container app-topbar__inner">
          <div className="brand-block">
            <div className="brand-mark">
              {logoReady ? (
                <img
                  src="/genesis-logo.png"
                  alt="Genesis Esportes"
                  className="brand-logo"
                  onError={() => setLogoReady(false)}
                />
              ) : (
                <Trophy size={20} />
              )}
            </div>
            <div>
              <div className="brand-title">Genesis Ranking</div>
              <div className="brand-subtitle">Painel de Administracao</div>
            </div>
          </div>

          <nav className="topbar-nav">
            <Link
              to="/"
              className={`nav-link ${location.pathname === '/' ? 'is-active' : ''}`}
              aria-current={location.pathname === '/' ? 'page' : undefined}
            >
              Painel Admin
            </Link>
            <Link
              to="/ranking"
              className={`nav-link ${location.pathname === '/ranking' ? 'is-active' : ''}`}
              aria-current={location.pathname === '/ranking' ? 'page' : undefined}
            >
              Ranking Oficial
            </Link>
            <Link
              to="/ranking-equipes"
              className={`nav-link ${location.pathname === '/ranking-equipes' ? 'is-active' : ''}`}
              aria-current={location.pathname === '/ranking-equipes' ? 'page' : undefined}
            >
              Ranking Equipes
            </Link>
          </nav>

          <div className="topbar-actions">
            <span className="status-pill">
              <Activity size={12} />
              Ao vivo
            </span>
            <button className="btn btn-secondary" type="button" onClick={handleOpenEventModal}>
              Criar Evento
            </button>
            <Link className="btn btn-primary" to="/">
              Minha Conta
              <User size={14} />
            </Link>
            {currentUser && <span className="user-greeting">Ola, {currentUser.name}</span>}
          </div>
        </div>
      </header>

      <main className="app-main">
        <div className="container">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              <Routes location={location}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/ranking" element={<Ranking />} />
                <Route path="/ranking-equipes" element={<TeamRanking />} />
              </Routes>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <footer className="app-footer">
        <div className="container footer-inner">
          <img
            src="https://ranking.ilutas.com.br/assets/logos/ilutas_logo_branca.png"
            alt="iLutas"
            className="footer-logo"
            onError={(e) => e.target.style.display = 'none'}
          />
          <div className="footer-actions">
            <Trophy size={20} />
            <Settings size={20} />
          </div>
          <span>&copy; 2025 Genesis Esportes & iLutas - Sistema de Ranking Nacional</span>
        </div>
      </footer>

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
                  <div className="modal-title">Criar evento</div>
                  <button type="button" className="btn btn-ghost" onClick={handleCloseEventModal}>
                    Fechar
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
                      <label className="table-meta">Nome do evento</label>
                      <input
                        className="input"
                        type="text"
                        value={eventForm.name}
                        onChange={(event) => setEventForm({ ...eventForm, name: event.target.value })}
                        placeholder="Ex: Etapa 1 - Regional"
                        required
                      />
                    </div>
                    <div className="form-grid">
                      <div>
                        <label className="table-meta">Data</label>
                        <input
                          className="input"
                          type="date"
                          value={eventForm.date}
                          onChange={(event) => setEventForm({ ...eventForm, date: event.target.value })}
                        />
                      </div>
                      <div>
                        <label className="table-meta">Local</label>
                        <input
                          className="input"
                          type="text"
                          value={eventForm.location}
                          onChange={(event) => setEventForm({ ...eventForm, location: event.target.value })}
                          placeholder="Ex: Arena Central"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="form-actions">
                    <button type="button" className="btn btn-ghost" onClick={handleCloseEventModal}>
                      Cancelar
                    </button>
                    <button type="submit" className="btn btn-primary">
                      Salvar evento
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
