const fs = require('fs');
let c = fs.readFileSync('src/components/LoginOverlay.jsx', 'utf8');

const regex = /<img\s+src="\/genesis-logo\.png".*?\{error && \(/s;

const newJSX = `<img
                    src="/genesis-logo.png"
                    alt="Genesis Esportes"
                    className="login-logo"
                    onError={(event) => {
                        event.currentTarget.style.display = 'none';
                    }}
                />

                {canClose && (
                    <button type="button" className="login-close-float" onClick={onClose} aria-label={copy.close}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                )}

                <div className="login-header-text">
                    <h2>{copy.title}</h2>
                    <p>{copy.subtitle}</p>
                </div>

                {supportsLocalReset && !resetMode && (
                    <div className="login-mode-switch" aria-label="Account access mode">
                        <div className="login-mode-slider" style={{ transform: registerMode ? 'translateX(100%)' : 'translateX(0)' }}></div>
                        <button
                            type="button"
                            className={!registerMode ? 'is-active' : ''}
                            onClick={() => {
                                handleCloseRegister();
                            }}
                        >
                            {copy.loginTab}
                        </button>
                        <button
                            type="button"
                            className={registerMode ? 'is-active' : ''}
                            onClick={handleOpenRegister}
                        >
                            {copy.form.create}
                        </button>
                    </div>
                )}

                {error && (`;

c = c.replace(regex, newJSX);

fs.writeFileSync('src/components/LoginOverlay.jsx', c);
console.log('LoginOverlay JSX updated');
