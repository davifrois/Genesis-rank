import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CheckCircle, Copy, RefreshCw, X, Clock, Loader2, ShieldCheck } from 'lucide-react';
import { publicRegistrationService } from '../services/publicRegistrationService';
import QRCode from 'qrcode';
import { useNavigate } from 'react-router-dom';

const POLL_INTERVAL_MS = 3000; // Verifica status a cada 3 segundos
const MAX_POLL_ATTEMPTS = 100; // ~5 minutos

const PixPaymentModal = ({
  registrationIds,
  athleteName,
  athleteEmail,
  amount,
  eventName,
  onSuccess,
  onClose
}) => {
  const navigate = useNavigate();
  const [stage, setStage] = useState('loading'); // loading | ready | polling | approved | error
  const [pixData, setPixData] = useState(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [secondsWaiting, setSecondsWaiting] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const pollAttempts = useRef(0);
  const pollTimer = useRef(null);
  const secondsTimer = useRef(null);

  const stopPolling = useCallback(() => {
    if (pollTimer.current) clearInterval(pollTimer.current);
    if (secondsTimer.current) clearInterval(secondsTimer.current);
  }, []);

  const handleApproved = useCallback(() => {
    stopPolling();
    setStage('approved');

    // Atualiza inscrição no localStorage como APROVADA
    try {
      const ids = (registrationIds || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
      const key = 'genesis_public_registration_pending_v1';
      const raw = localStorage.getItem(key);
      if (raw) {
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          const updated = list.map(reg => {
            const regId = (reg.id || reg.clientRequestId || '').toLowerCase();
            if (ids.length === 0 || ids.some(t => regId.includes(t) || t.includes(regId))) {
              return { ...reg, status: 'APPROVED', paymentStatus: 'APPROVED', paymentMethod: 'Mercado Pago PIX' };
            }
            return reg;
          });
          localStorage.setItem(key, JSON.stringify(updated));
        }
      }
    } catch (_) {}

    // Redireciona para sucesso após 3 segundos
    setTimeout(() => {
      if (onSuccess) onSuccess();
      navigate('/sucesso?status=approved&external_reference=' + encodeURIComponent(registrationIds || ''));
    }, 3000);
  }, [registrationIds, stopPolling, onSuccess, navigate]);

  const startPolling = useCallback((paymentId) => {
    setStage('polling');
    pollAttempts.current = 0;

    secondsTimer.current = setInterval(() => {
      setSecondsWaiting(s => s + 1);
    }, 1000);

    pollTimer.current = setInterval(async () => {
      pollAttempts.current += 1;
      if (pollAttempts.current > MAX_POLL_ATTEMPTS) {
        stopPolling();
        return;
      }

      try {
        const result = await publicRegistrationService.checkPaymentStatus(paymentId);
        if (result?.approved || result?.status === 'approved') {
          handleApproved();
        }
      } catch (_) {}
    }, POLL_INTERVAL_MS);
  }, [stopPolling, handleApproved]);

  const generatePix = useCallback(async () => {
    setStage('loading');
    setErrorMsg('');
    pollAttempts.current = 0;
    stopPolling();

    try {
      const data = await publicRegistrationService.createDirectPix({
        registrationIds,
        athleteName,
        email: athleteEmail || 'atleta@genesisesportes.com.br',
        amount
      });

      setPixData(data);

      // Gerar QR Code visual
      if (data.qrCode) {
        const canvas = await QRCode.toDataURL(data.qrCode, {
          width: 260,
          margin: 1,
          color: { dark: '#05070b', light: '#ffffff' }
        });
        setQrCodeDataUrl(canvas);
      } else if (data.qrCodeBase64) {
        setQrCodeDataUrl(`data:image/png;base64,${data.qrCodeBase64}`);
      }

      setStage('ready');

      if (data.paymentId) {
        startPolling(data.paymentId);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Erro ao gerar PIX. Tente novamente.');
      setStage('error');
    }
  }, [registrationIds, athleteName, athleteEmail, amount, stopPolling, startPolling]);

  useEffect(() => {
    generatePix();
    return () => stopPolling();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(pixData?.qrCode || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (_) {
      // fallback
      const el = document.createElement('textarea');
      el.value = pixData?.qrCode || '';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const overlay = {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 99999, padding: '1rem'
  };

  const card = {
    background: 'linear-gradient(180deg, #0e1824 0%, #090d16 100%)',
    border: '1px solid rgba(0,194,203,0.2)',
    borderRadius: '20px',
    padding: '2rem',
    width: '100%',
    maxWidth: '440px',
    textAlign: 'center',
    color: '#fff',
    position: 'relative',
    boxShadow: '0 30px 70px rgba(0,0,0,0.7)'
  };

  if (stage === 'approved') {
    return (
      <div style={overlay}>
        <div style={{ ...card, border: '1px solid rgba(34,197,94,0.4)' }}>
          <div style={{
            width: 90, height: 90, borderRadius: '50%',
            background: 'rgba(34,197,94,0.12)', border: '2px solid rgba(34,197,94,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1.5rem'
          }}>
            <CheckCircle size={52} color="#22c55e" />
          </div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '0.5rem', color: '#fff' }}>
            Pagamento Aprovado! ✅
          </h2>
          <p style={{ color: '#94a3b8', marginBottom: '1.5rem', lineHeight: 1.6 }}>
            Seu PIX foi confirmado! A inscrição de <strong style={{ color: '#00c2cb' }}>{athleteName}</strong> em <strong style={{ color: '#fbbf24' }}>{eventName}</strong> está garantida.
          </p>
          <div style={{
            background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)',
            borderRadius: '12px', padding: '1rem', fontSize: '0.9rem', color: '#86efac',
            display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center'
          }}>
            <ShieldCheck size={18} />
            Redirecionando para sua confirmação...
          </div>
        </div>
      </div>
    );
  }

  if (stage === 'loading') {
    return (
      <div style={overlay}>
        <div style={card}>
          <div style={{ marginBottom: '1.5rem' }}>
            <Loader2 size={48} color="#00c2cb" style={{ animation: 'spin 1s linear infinite' }} />
          </div>
          <h3 style={{ fontSize: '1.2rem', color: '#e2e8f0', marginBottom: '0.5rem' }}>Gerando seu PIX...</h3>
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Aguarde um instante</p>
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  if (stage === 'error') {
    return (
      <div style={overlay}>
        <div style={{ ...card, border: '1px solid rgba(239,68,68,0.3)' }}>
          {onClose && (
            <button onClick={onClose} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>
              <X size={20} />
            </button>
          )}
          <h3 style={{ color: '#f87171', marginBottom: '1rem', fontSize: '1.2rem', fontWeight: 700 }}>Falha ao gerar PIX</h3>
          <p style={{ color: '#94a3b8', marginBottom: '1.5rem', fontSize: '0.9rem' }}>{errorMsg}</p>
          <button
            onClick={generatePix}
            style={{
              width: '100%', padding: '0.875rem',
              background: 'linear-gradient(135deg, #00c2cb, #009ca4)',
              color: '#05070b', border: 'none', borderRadius: '10px',
              fontWeight: 700, fontSize: '1rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
            }}
          >
            <RefreshCw size={16} /> Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={overlay}>
      <div style={card}>
        {onClose && (
          <button
            onClick={() => { stopPolling(); onClose(); }}
            style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        )}

        <div style={{ marginBottom: '1rem' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            background: 'rgba(0,194,203,0.1)', border: '1px solid rgba(0,194,203,0.25)',
            borderRadius: '20px', padding: '5px 14px', fontSize: '0.78rem', color: '#00c2cb', fontWeight: 700,
            marginBottom: '0.75rem'
          }}>
            {stage === 'polling' ? (
              <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Aguardando pagamento ({secondsWaiting}s)</>
            ) : (
              <><Clock size={13} /> Escaneie e pague</>
            )}
          </div>

          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', marginBottom: '0.25rem' }}>
            Pague via PIX
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.5 }}>
            Valor: <strong style={{ color: '#22c55e', fontSize: '1.05rem' }}>R$ {Number(amount).toFixed(2).replace('.', ',')}</strong>
          </p>
        </div>

        {/* QR CODE */}
        {qrCodeDataUrl && (
          <div style={{
            background: '#fff', padding: '12px', borderRadius: '14px',
            display: 'inline-block', marginBottom: '1.25rem',
            border: '3px solid rgba(0,194,203,0.4)', boxShadow: '0 0 30px rgba(0,194,203,0.15)'
          }}>
            <img src={qrCodeDataUrl} alt="QR Code PIX" style={{ width: '230px', height: '230px', display: 'block' }} />
          </div>
        )}

        {/* CÓDIGO PIX COPIA E COLA */}
        {pixData?.qrCode && (
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '6px', fontWeight: 600, textTransform: 'uppercase' }}>
              Código PIX Copia e Cola
            </div>
            <div style={{
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '10px', padding: '10px 14px',
              fontFamily: 'monospace', fontSize: '0.72rem', color: '#94a3b8',
              wordBreak: 'break-all', textAlign: 'left', lineHeight: 1.5,
              maxHeight: '72px', overflow: 'hidden'
            }}>
              {pixData.qrCode}
            </div>
            <button
              onClick={copyCode}
              style={{
                marginTop: '8px', width: '100%', padding: '0.7rem',
                background: copied ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.06)',
                border: `1px solid ${copied ? 'rgba(34,197,94,0.4)' : 'rgba(255,255,255,0.12)'}`,
                borderRadius: '10px', color: copied ? '#22c55e' : '#e2e8f0',
                fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                transition: 'all 0.2s'
              }}
            >
              {copied ? <><CheckCircle size={15} /> Copiado!</> : <><Copy size={15} /> Copiar código PIX</>}
            </button>
          </div>
        )}

        {/* STATUS */}
        <div style={{
          background: stage === 'polling' ? 'rgba(0,194,203,0.06)' : 'rgba(251,191,36,0.06)',
          border: `1px solid ${stage === 'polling' ? 'rgba(0,194,203,0.2)' : 'rgba(251,191,36,0.2)'}`,
          borderRadius: '10px', padding: '10px 14px',
          fontSize: '0.82rem', color: stage === 'polling' ? '#00c2cb' : '#fbbf24',
          display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center'
        }}>
          {stage === 'polling' ? (
            <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }} />
              Verificando pagamento automaticamente a cada 3s...</>
          ) : (
            '⏳ Aguardando o pagamento...'
          )}
        </div>

        <p style={{ fontSize: '0.75rem', color: '#475569', marginTop: '1rem', lineHeight: 1.5 }}>
          Assim que o PIX for confirmado, você será redirecionado automaticamente. <strong>Não feche esta janela.</strong>
        </p>

        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
};

export default PixPaymentModal;
