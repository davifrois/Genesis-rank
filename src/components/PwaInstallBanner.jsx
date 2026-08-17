import { useEffect, useState, useCallback } from "react";
import "./PwaInstallBanner.css";

const PWA_DISMISSED_KEY = "genesis_pwa_banner_dismissed";

const isIos = () =>
  /iphone|ipad|ipod/i.test(window.navigator.userAgent) &&
  !window.navigator.userAgent.includes("CriOS");

const isInStandaloneMode = () =>
  ("standalone" in window.navigator && window.navigator.standalone) ||
  window.matchMedia("(display-mode: standalone)").matches;

const isDismissed = () => {
  try {
    return !!window.localStorage.getItem(PWA_DISMISSED_KEY);
  } catch {
    return false;
  }
};

const persistDismiss = () => {
  try {
    window.localStorage.setItem(PWA_DISMISSED_KEY, "1");
  } catch {
    // ignore
  }
};

export default function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible] = useState(false);
  const [showIosHint, setShowIosHint] = useState(false);
  const [dismissing, setDismissing] = useState(false);

  useEffect(() => {
    // Already installed or dismissed
    if (isInStandaloneMode() || isDismissed()) return;

    // iOS — show banner with Share icon hint
    if (isIos()) {
      setVisible(true);
      return;
    }

    // Android/Chrome — listen for beforeinstallprompt
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const dismiss = useCallback(() => {
    setDismissing(true);
    persistDismiss();
    setTimeout(() => setVisible(false), 380);
  }, []);

  const install = useCallback(async () => {
    if (isIos()) {
      setShowIosHint((h) => !h);
      return;
    }
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setVisible(false);
    }
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  if (!visible) return null;

  const installLabel = isIos() ? "Como instalar" : "Instalar App";
  const subLabel = isIos()
    ? "Adicione à Tela Inicial pelo Safari"
    : "Abra mais rápido, sem o navegador";

  return (
    <>
      <div className={`pwa-banner${dismissing ? " is-dismissing" : ""}`} role="banner" aria-label="Instalar app Genesis">
        <img
          src="/apple-touch-icon.png"
          alt="Genesis"
          className="pwa-banner__icon"
        />
        <div className="pwa-banner__text">
          <p className="pwa-banner__title">Genesis Esportes</p>
          <p className="pwa-banner__sub">{subLabel}</p>
        </div>
        <button
          type="button"
          className="pwa-banner__btn"
          onClick={install}
          aria-label={installLabel}
        >
          {installLabel}
        </button>
        <button
          type="button"
          className="pwa-banner__dismiss"
          onClick={dismiss}
          aria-label="Fechar banner"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      {showIosHint && (
        <div className="pwa-banner-ios-hint" role="tooltip">
          <p className="pwa-banner-ios-hint__text">
            Toque em{" "}
            <strong>
              <svg style={{display:"inline",verticalAlign:"middle"}} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00c2cb" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
              {" "}Compartilhar
            </strong>{" "}
            no Safari e depois em{" "}
            <strong>Adicionar à Tela Inicial</strong> para instalar o app.
          </p>
        </div>
      )}

      {/* Spacer so content is not clipped under the banner */}
      <div className="pwa-banner-spacer" aria-hidden="true" />
    </>
  );
}

