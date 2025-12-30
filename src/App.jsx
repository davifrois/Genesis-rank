import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import {
  Activity,
  AlertCircle,
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
  Youtube,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import Dashboard from './pages/Dashboard';
import Ranking from './pages/Ranking';
import TeamRanking from './pages/TeamRanking';
import { useStore } from './hooks/useStore';
import LoginOverlay from './components/LoginOverlay';
import './index.css';

const AppLayout = () => {
  const {
    currentUser,
    eventModalOpen,
    openEventModal,
    closeEventModal,
    addEvent,
    logout
  } = useStore();
  const location = useLocation();
  const [logoReady, setLogoReady] = useState(true);
  const [eventForm, setEventForm] = useState({ name: '', date: '', location: '' });
  const [eventError, setEventError] = useState('');
  const [showLogin, setShowLogin] = useState(false);
  const isAdmin = currentUser?.role === 'admin';
  const canAccessAdmin = isAdmin;

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
            {canAccessAdmin && (
              <Link
                to="/"
                className={`nav-link ${location.pathname === '/' ? 'is-active' : ''}`}
                aria-current={location.pathname === '/' ? 'page' : undefined}
              >
                Painel Admin
              </Link>
            )}
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
            {isAdmin && (
              <>
                <button className="btn btn-secondary" type="button" onClick={handleOpenEventModal}>
                  Criar Evento
                </button>
                <Link className="btn btn-primary" to="/">
                  Minha Conta
                  <User size={14} />
                </Link>
              </>
            )}
            {currentUser ? (
              <button className="btn btn-ghost" type="button" onClick={logout}>
                Sair
                <LogOut size={14} />
              </button>
            ) : (
              <button className="btn btn-secondary" type="button" onClick={() => setShowLogin(true)}>
                Entrar
                <LogIn size={14} />
              </button>
            )}
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
                <Route
                  path="/"
                  element={canAccessAdmin ? <Dashboard /> : <Navigate to="/ranking" replace />}
                />
                <Route path="/ranking" element={<Ranking />} />
                <Route path="/ranking-equipes" element={<TeamRanking />} />
              </Routes>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <footer className="app-footer">
        <div className="container footer-grid">
          <div className="footer-column footer-brand">
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
              A Genesis Esportes organiza eventos de Jiu-Jitsu e monitora rankings com transparencia e excelencia
              operacional. Fundada em 2017, com sede em Belo Horizonte.
            </p>
            <div className="footer-social">
              <span className="footer-title footer-title--small">Siga-nos</span>
              <div className="footer-social__links">
                <a className="footer-social__link" href="https://instagram.com" target="_blank" rel="noreferrer">
                  <Instagram size={16} />
                </a>
                <a className="footer-social__link" href="https://facebook.com" target="_blank" rel="noreferrer">
                  <Facebook size={16} />
                </a>
                <a className="footer-social__link" href="https://youtube.com" target="_blank" rel="noreferrer">
                  <Youtube size={16} />
                </a>
              </div>
            </div>
          </div>

          <div className="footer-column">
            <div className="footer-title">Contato</div>
            <div className="footer-contact">
              <div className="footer-contact__item">
                <span className="footer-contact__icon"><Phone size={16} /></span>
                <div>
                  <span className="footer-contact__label">Telefone / WhatsApp</span>
                  <a className="footer-link" href="tel:+5531993383014">(31) 99338-3014</a>
                </div>
              </div>
              <div className="footer-contact__item">
                <span className="footer-contact__icon"><Mail size={16} /></span>
                <div>
                  <span className="footer-contact__label">Email</span>
                  <a className="footer-link" href="mailto:contato@genesisesportes.com.br">
                    contato@genesisesportes.com.br
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="footer-column">
            <div className="footer-title">Localizacao</div>
            <div className="footer-map">
              <div className="footer-map__frame">
                <MapPin size={18} />
                <div>
                  <strong>Parque Turista - Contagem / MG</strong>
                  <span>Rua Pains, 139</span>
                </div>
              </div>
              <a
                className="footer-link footer-link--map"
                href="https://www.google.com/maps?q=Rua+Pains+139+Contagem+MG"
                target="_blank"
                rel="noreferrer"
              >
                Ver no mapa <ExternalLink size={12} />
              </a>
            </div>
          </div>

          <div className="footer-column">
            <div className="footer-title">Menu do site</div>
            <nav className="footer-menu">
              <Link to="/">Painel Admin</Link>
              <Link to="/ranking">Ranking Oficial</Link>
              <Link to="/ranking-equipes">Ranking Equipes</Link>
            </nav>
          </div>
        </div>

        <div className="footer-bottom">
          <div className="container footer-bottom__inner">
            <span>&copy; 2025 Genesis Esportes. Todos os direitos reservados.</span>
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
