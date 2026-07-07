const fs = require('fs');

let c = fs.readFileSync('src/App.jsx', 'utf8');

// 1. Fix isCoachUser
c = c.replace(
  "const isCoachUser = currentUserRole === 'coach' || currentUserRole === 'professor' || currentUserRole === 'admin';",
  "const isCoachUser = currentUserRole === 'coach' || currentUserRole === 'professor';"
);

// 2. Fix the layout grid container
c = c.replace(
  `<form onSubmit={handleCreateEvent} className="ajp-modal-content">`,
  `<form onSubmit={handleCreateEvent} className="ajp-modal-content" style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>`
);
c = c.replace(
  `<div className="event-report-grid" style={{ padding: '0 24px 24px' }}>`,
  `<div className="event-report-grid" style={{ padding: '0 24px 24px', flex: 1, overflowY: 'auto' }}>`
);

// 3. Fix the Map Preview
c = c.replace(
  `{eventForm.accommodationEnabled && (
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
                          )}`,
  `{eventForm.accommodationEnabled && (
                            <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '16px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                                <div style={{ width: '40px', height: '40px', background: 'rgba(0, 194, 203, 0.1)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00c2cb' }}>
                                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                                </div>
                                <div>
                                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>Integração Automática</div>
                                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>Mapa e busca de hotéis ativados</div>
                                </div>
                              </div>
                              <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: '1.5', margin: '0 0 16px 0' }}>
                                Na página pública do evento, os atletas verão um <strong>mapa interativo</strong> da região {eventForm.location ? <span>de <strong style={{ color: '#00c2cb' }}>{eventForm.location}</strong></span> : 'do local definido'} e botões de busca automática para <strong>Airbnb</strong> e <strong>Booking.com</strong>.
                              </p>
                              
                              {eventForm.location ? (
                                <div style={{ borderRadius: '8px', overflow: 'hidden', height: '120px', position: 'relative', border: '1px solid rgba(255,255,255,0.1)' }}>
                                  <iframe
                                    title="Preview Mapa"
                                    width="100%"
                                    height="100%"
                                    style={{ border: 0, pointerEvents: 'none' }}
                                    src={\`https://maps.google.com/maps?q=hoteis+perto+de+\${encodeURIComponent(eventForm.location)}&t=m&z=13&output=embed&iwloc=near\`}
                                  />
                                  <div style={{ position: 'absolute', bottom: '8px', right: '8px', display: 'flex', gap: '6px' }}>
                                    <div style={{ background: '#ff385c', color: '#fff', fontSize: '11px', fontWeight: 700, padding: '4px 8px', borderRadius: '4px' }}>Airbnb</div>
                                    <div style={{ background: '#003580', color: '#fff', fontSize: '11px', fontWeight: 700, padding: '4px 8px', borderRadius: '4px' }}>Booking</div>
                                  </div>
                                </div>
                              ) : (
                                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '8px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', color: '#64748b' }}>
                                  Preencha o Local/Arena acima para gerar o mapa
                                </div>
                              )}
                            </div>
                          )}`
);

// 4. Missing div fix in the grid (because we added a wrapper)
c = c.replace(
  `                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ── Rodapé ───────────────────────────`,
  `                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div> {/* Fechamento extra para a área flexível de scroll */}

                  {/* ── Rodapé ───────────────────────────`
);

// 5. Add lucide icons Menu and X
c = c.replace(
  `  User,
  Users,
  Youtube,
} from 'lucide-react';`,
  `  User,
  Users,
  Youtube,
  Menu,
  X,
} from 'lucide-react';`
);

// 6. Add isMobileMenuOpen state
c = c.replace(
  `const [eventSuccess, setEventSuccess] = useState('');
  const [showLogin, setShowLogin] = useState(false);`,
  `const [eventSuccess, setEventSuccess] = useState('');
  const [showLogin, setShowLogin] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);`
);

// 7. Update renderNavItem for mobile menu close
c = c.replace(
  `  const renderNavItem = (item) => {
    const isActive = isActivePath(item.activePaths || []);

    if (item.items) {
      return (
        <div key={item.label} className={\`nav-dropdown \${isActive ? 'is-active' : ''}\`}>
          <button className={\`main-nav-link \${isActive ? 'is-active' : ''}\`} type="button">
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
                <Link key={entry.label} className={\`nav-dropdown__item \${entry.icon ? 'has-icon' : ''}\`} to={entry.path}>
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
        className={\`main-nav-link \${isActive ? 'is-active' : ''}\`}
        aria-current={isActive ? 'page' : undefined}
      >
        {item.label}
      </Link>
    );
  };`,
  `  const renderNavItem = (item, onMenuClick) => {
    const isActive = isActivePath(item.activePaths || []);

    const handleClick = () => {
      if (onMenuClick) onMenuClick();
    };

    if (item.items) {
      return (
        <div key={item.label} className={\`nav-dropdown \${isActive ? 'is-active' : ''}\`}>
          <button className={\`main-nav-link \${isActive ? 'is-active' : ''}\`} type="button">
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
                <Link key={entry.label} className={\`nav-dropdown__item \${entry.icon ? 'has-icon' : ''}\`} to={entry.path} onClick={handleClick}>
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
        className={\`main-nav-link \${isActive ? 'is-active' : ''}\`}
        aria-current={isActive ? 'page' : undefined}
        onClick={handleClick}
      >
        {item.label}
      </Link>
    );
  };`
);

// 8. Add mobile menu layout
c = c.replace(
  `        <div className="topbar-main">
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
      </header>`,
  `        <div className="topbar-main">
          <div className="container topbar-main__inner">
            <button className="mobile-menu-toggle" onClick={() => setIsMobileMenuOpen(true)}>
              <Menu size={24} />
            </button>
            <nav className="main-nav">
              <div className="main-nav__group">
                {navLeft.map(item => renderNavItem(item))}
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
                {navRight.map(item => renderNavItem(item))}
              </div>
            </nav>
            <div className="mobile-user-toggle">
              {currentUser ? (
                <Link to="/minha-conta" className="mobile-user-avatar">
                  {finalAvatar ? (
                    <img src={finalAvatar} alt="" />
                  ) : (
                    <span>{(finalName).charAt(0).toUpperCase()}</span>
                  )}
                </Link>
              ) : (
                <button onClick={() => setShowLogin(true)} className="mobile-user-login">
                  <User size={20} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Menu Drawer */}
        <div className={\`mobile-drawer \${isMobileMenuOpen ? 'is-open' : ''}\`}>
          <div className="mobile-drawer__overlay" onClick={() => setIsMobileMenuOpen(false)}></div>
          <div className="mobile-drawer__content">
            <div className="mobile-drawer__header">
              <div className="brand-block">
                <div className="brand-mark">
                  {logoReady ? <img src="/genesis-logo.png" alt="Genesis" className="brand-logo" /> : <Trophy size={24} />}
                </div>
                <div className="brand-title">Genesis</div>
              </div>
              <button className="mobile-drawer__close" onClick={() => setIsMobileMenuOpen(false)}>
                <X size={24} />
              </button>
            </div>
            <div className="mobile-drawer__body">
              <div className="mobile-drawer__main-nav">
                {navLeft.map(item => renderNavItem(item, () => setIsMobileMenuOpen(false)))}
                {navRight.map(item => renderNavItem(item, () => setIsMobileMenuOpen(false)))}
              </div>
              <div className="mobile-drawer__divider"></div>
              <div className="mobile-drawer__utility-nav">
                {utilityLinks.map((link) => (
                  <Link key={link.label} className="mobile-utility-link" to={link.path} onClick={() => setIsMobileMenuOpen(false)}>
                    {link.label}
                  </Link>
                ))}
                
                <div className="mobile-drawer__language">
                  <span className="mobile-drawer__language-label">{copy.utility.language}:</span>
                  <div className="mobile-drawer__language-options">
                    {languages.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={\`mobile-language-btn \${language === item.id ? 'is-active' : ''}\`}
                        onClick={() => { setLanguage(item.id); setIsMobileMenuOpen(false); }}
                      >
                        {item.flagImages?.[0] && <img src={item.flagImages[0]} alt="" />}
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="mobile-drawer__social">
                <a href="https://api.whatsapp.com/send?phone=5531993383014" target="_blank" rel="noreferrer"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.149-.198.297-.767.966-.94 1.164-.173.198-.347.223-.644.075-.297-.149-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.133-.132.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.372-.025-.52-.075-.149-.669-1.612-.916-2.206-.242-.579-.487-.5-.669-.51-.173-.009-.372-.011-.57-.011-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.077 4.487.711.307 1.264.49 1.696.627.713.227 1.362.195 1.875.118.572-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.617h-.004a9.87 9.87 0 0 1-5.031-1.378L3.48 21.65l1.06-3.872a9.86 9.86 0 0 1-1.506-5.26c.001-5.448 4.434-9.88 9.887-9.88 2.64.001 5.122 1.03 6.99 2.899a9.83 9.83 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.883 9.884m8.413-18.297A11.82 11.82 0 0 0 12.06.198C5.555.198.26 5.49.258 11.997A11.8 11.8 0 0 0 1.89 18.3L0 24l5.84-1.53a11.84 11.84 0 0 0 6.215 1.787h.005c6.504 0 11.8-5.292 11.803-11.799a11.8 11.8 0 0 0-3.399-8.756" /></svg></a>
                <a href="https://www.instagram.com/genesis_esportes/" target="_blank" rel="noreferrer"><Instagram size={20} /></a>
                <a href="https://www.facebook.com/genesis.tatames" target="_blank" rel="noreferrer"><Facebook size={20} /></a>
                <a href="https://www.youtube.com/channel/UCg9eEbos83Rw4S6fzT4peVA" target="_blank" rel="noreferrer"><Youtube size={20} /></a>
              </div>
            </div>
          </div>
        </div>
      </header>`
);

// 9. Ensure MobileHeader.css is imported
if (!c.includes("import './components/MobileHeader.css';")) {
  c = c.replace(
    "import './components/Footer.css';",
    "import './components/Footer.css';\nimport './components/MobileHeader.css';"
  );
}

fs.writeFileSync('src/App.jsx', c);
console.log('Restored all App.jsx fixes and applied mobile header!');
