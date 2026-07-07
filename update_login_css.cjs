const fs = require('fs');
let c = fs.readFileSync('src/index.css', 'utf8');

const regex = /\.login-overlay\s*\{[\s\S]*?\}\s*(?=\.password-strength\s*\{)/;

const newCSS = `.login-overlay {
  position: fixed;
  inset: 0;
  background: rgba(10, 15, 24, 0.7);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  display: grid;
  place-items: center;
  z-index: 200;
  padding: 1.5rem;
}

.login-card {
  width: min(440px, 100%);
  background: rgba(17, 24, 39, 0.75);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05);
  padding: 2.5rem 2.2rem;
  position: relative;
  overflow: hidden;
}

.login-close-float {
  position: absolute;
  top: 1.2rem;
  right: 1.2rem;
  background: rgba(255, 255, 255, 0.05);
  border: none;
  border-radius: 50%;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--muted);
  cursor: pointer;
  transition: all 0.2s ease;
  z-index: 10;
}

.login-close-float:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  transform: rotate(90deg);
}

.login-logo {
  width: 170px;
  margin: 0 auto 1.5rem;
  display: block;
  filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.3));
}

.login-header-text {
  text-align: center;
  margin-bottom: 2rem;
}

.login-header-text h2 {
  font-family: var(--font-display);
  font-size: 1.5rem;
  font-weight: 700;
  color: #fff;
  margin-bottom: 0.4rem;
}

.login-header-text p {
  font-size: 0.8rem;
  letter-spacing: 0.05em;
  color: var(--muted);
}

.login-mode-switch {
  position: relative;
  display: flex;
  background: rgba(0, 0, 0, 0.25);
  border-radius: 9999px;
  padding: 0.3rem;
  margin-bottom: 2rem;
  border: 1px solid rgba(255, 255, 255, 0.03);
}

.login-mode-slider {
  position: absolute;
  top: 0.3rem;
  bottom: 0.3rem;
  left: 0.3rem;
  width: calc(50% - 0.3rem);
  background: linear-gradient(135deg, var(--brand) 0%, var(--brand-strong) 100%);
  border-radius: 9999px;
  transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 1;
  box-shadow: 0 4px 10px rgba(56, 189, 248, 0.3);
}

.login-mode-switch button {
  flex: 1;
  padding: 0.6rem;
  border: none;
  background: transparent;
  color: var(--muted);
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  cursor: pointer;
  z-index: 2;
  position: relative;
  transition: color 0.3s ease;
}

.login-mode-switch button.is-active {
  color: #fff;
}

.login-loading {
  position: absolute;
  inset: 0;
  background: rgba(17, 24, 39, 0.8);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  font-weight: 700;
  color: var(--brand);
  z-index: 50;
}

.login-error {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 12px;
  padding: 0.8rem 1rem;
  display: flex;
  gap: 0.6rem;
  align-items: center;
  font-size: 0.8rem;
  margin-bottom: 1.5rem;
  color: #ef4444;
}

.login-success {
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.3);
  border-radius: 12px;
  padding: 0.8rem 1rem;
  display: flex;
  gap: 0.6rem;
  align-items: center;
  font-size: 0.8rem;
  margin-bottom: 1.5rem;
  color: #22c55e;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  font-weight: 700;
  color: var(--muted);
}

.login-form label {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.login-input {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  padding: 0.8rem 1rem;
  background: rgba(0, 0, 0, 0.2);
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
}

.login-input:focus-within {
  border-color: var(--brand);
  background: rgba(0, 0, 0, 0.3);
  box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.15);
}

.login-input svg {
  color: var(--muted);
  transition: color 0.2s ease;
}

.login-input:focus-within svg {
  color: var(--brand);
}

.login-input input {
  border: none;
  outline: none;
  background: transparent;
  width: 100%;
  font-size: 0.95rem;
  text-transform: none;
  letter-spacing: normal;
  color: #fff;
}

.login-input input::placeholder {
  color: rgba(255, 255, 255, 0.3);
}

.login-submit {
  width: 100%;
  justify-content: center;
  margin-top: 1rem;
  background: linear-gradient(135deg, var(--brand) 0%, var(--brand-strong) 100%);
  border: none;
  box-shadow: 0 4px 15px rgba(56, 189, 248, 0.3);
  color: #fff;
  font-size: 0.85rem;
  padding: 1rem;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  font-weight: 700;
  border-radius: 14px;
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s ease;
}

.login-submit:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(56, 189, 248, 0.45);
}

.login-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  box-shadow: none;
}

.login-helper {
  display: flex;
  justify-content: space-between;
  margin-top: 0.8rem;
  gap: 0.6rem;
  flex-wrap: wrap;
}

.login-link {
  background: none;
  border: none;
  padding: 0.4rem;
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  font-weight: 700;
  color: var(--brand);
  cursor: pointer;
  transition: color 0.2s ease, text-shadow 0.2s ease;
}

.login-link:hover {
  color: #fff;
  text-shadow: 0 0 8px rgba(56, 189, 248, 0.6);
}

`;

c = c.replace(regex, newCSS);

fs.writeFileSync('src/index.css', c);
console.log('Login CSS updated');
