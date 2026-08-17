import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, ShieldCheck, ArrowRight, Calendar, User, Trophy, CreditCard } from 'lucide-react';
import { motion } from 'framer-motion';

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id') || searchParams.get('payment_id') || searchParams.get('collection_id');
  const externalRef = searchParams.get('external_reference');
  const status = searchParams.get('status') || searchParams.get('collection_status');

  const [registration, setRegistration] = useState(null);
  const [countdown, setCountdown] = useState(6);
  const [autoRedirect, setAutoRedirect] = useState(true);

  useEffect(() => {
    if (externalRef && (status === 'approved' || status === '1' || !status)) {
      // 1. Backend webhook ping
      try {
        const apiUrl = import.meta.env?.VITE_API_URL || 'http://localhost:8080';
        fetch(`${apiUrl}/api/webhooks/payment/confirm-return?registrationIds=${encodeURIComponent(externalRef)}&paymentId=${encodeURIComponent(sessionId || '')}`, {
          method: 'GET',
          headers: { 'ngrok-skip-browser-warning': 'true' }
        }).catch(err => console.error('Erro ao confirmar backend:', err));
      } catch (e) {
        console.error('Falha ao acionar confirm-return:', e);
      }

      // 2. Atualizar localStorage
      try {
        const registrationIds = externalRef.split(',').map(s => s.trim()).filter(Boolean);
        const stored = JSON.parse(localStorage.getItem('genesis_registrations_v1') || '[]');
        let foundReg = null;

        const newStored = stored.map(reg => {
          if (registrationIds.includes(reg.id) || registrationIds.includes(reg.athleteId)) {
            foundReg = { ...reg, status: 'APPROVED', paymentStatus: 'APPROVED', paymentMethod: 'Mercado Pago' };
            return foundReg;
          }
          return reg;
        });

        if (foundReg) {
          setRegistration(foundReg);
          localStorage.setItem('genesis_registrations_v1', JSON.stringify(newStored));
          window.dispatchEvent(new Event('storage'));
        } else if (stored.length > 0) {
          setRegistration(stored[stored.length - 1]);
        }
      } catch (err) {
        console.error('Erro ao auto-aprovar inscrição no retorno:', err);
      }
    }
  }, [externalRef, status, sessionId]);

  // Contagem regressiva para redirecionamento automático
  useEffect(() => {
    if (!autoRedirect) return;
    if (countdown <= 0) {
      navigate('/minha-conta');
      return;
    }
    const timer = setTimeout(() => {
      setCountdown(prev => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [countdown, autoRedirect, navigate]);

  return (
    <div className="public-page payment-result-page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '85vh', padding: '2rem 1rem', background: '#090d16', color: '#fff' }}>
      <motion.div 
        initial={{ scale: 0.7, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }} 
        transition={{ type: 'spring', stiffness: 220, damping: 18 }}
        style={{ width: '100%', maxWidth: '540px', background: '#121824', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '16px', padding: '2.5rem 2rem', textAlign: 'center', boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)' }}
      >
        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(34, 197, 94, 0.12)', border: '2px solid rgba(34, 197, 94, 0.4)', marginBottom: '1.5rem' }}>
          <CheckCircle size={48} color="#22c55e" />
        </div>

        <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem', color: '#fff', letterSpacing: '-0.5px' }}>
          Inscrição Confirmada!
        </h1>
        <p style={{ fontSize: '0.95rem', color: '#a1a1aa', marginBottom: '1.8rem' }}>
          Seu pagamento via <strong style={{ color: '#00c2cb' }}>Mercado Pago</strong> foi aprovado com sucesso.
        </p>

        {/* COMPROVANTE DETALHADO DA INSCRIÇÃO */}
        <div style={{ background: '#1a2232', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '1.25rem', textAlign: 'left', marginBottom: '1.8rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '0.75rem', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#22c55e', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck size={16} /> Aprovado & Garantido
            </span>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
              {new Date().toLocaleDateString('pt-BR')}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.88rem' }}>
            {registration?.athleteName || registration?.fullName ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <User size={15} color="#00c2cb" />
                <span style={{ color: '#cbd5e1' }}>Atleta:</span>
                <strong style={{ color: '#fff', marginLeft: 'auto' }}>{registration.athleteName || registration.fullName}</strong>
              </div>
            ) : null}

            {registration?.eventName || registration?.eventTitle ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Trophy size={15} color="#fbbf24" />
                <span style={{ color: '#cbd5e1' }}>Evento:</span>
                <strong style={{ color: '#fff', marginLeft: 'auto', textAlign: 'right' }}>{registration.eventName || registration.eventTitle}</strong>
              </div>
            ) : null}

            {(registration?.belt || registration?.category) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={15} color="#3b82f6" />
                <span style={{ color: '#cbd5e1' }}>Categoria:</span>
                <strong style={{ color: '#fff', marginLeft: 'auto' }}>{registration.belt ? `${registration.belt} • ` : ''}{registration.category || registration.modalidade || 'Geral'}</strong>
              </div>
            )}

            {sessionId && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', paddingTop: '6px', borderTop: '1px dashed rgba(255, 255, 255, 0.08)', fontSize: '0.78rem' }}>
                <CreditCard size={14} color="#a1a1aa" />
                <span style={{ color: '#64748b' }}>ID Transação MP:</span>
                <span style={{ color: '#94a3b8', fontFamily: 'monospace', marginLeft: 'auto' }}>{sessionId}</span>
              </div>
            )}
          </div>
        </div>

        {/* REDIRECIONAMENTO AUTOMÁTICO */}
        {autoRedirect && (
          <div style={{ marginBottom: '1.5rem', fontSize: '0.85rem', color: '#94a3b8' }}>
            Redirecionando para sua área de inscrições em <strong style={{ color: '#00c2cb' }}>{countdown}s</strong>...{' '}
            <button 
              onClick={() => setAutoRedirect(false)}
              style={{ background: 'none', border: 'none', color: '#64748b', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.8rem', marginLeft: '4px' }}
            >
              Cancelar
            </button>
          </div>
        )}

        {/* BOTÕES DE AÇÃO */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button 
            onClick={() => navigate('/minha-conta')}
            style={{ width: '100%', padding: '0.9rem', background: '#00c2cb', color: '#05070b', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s' }}
          >
            Ver Minha Inscrição
            <ArrowRight size={18} />
          </button>
          
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              onClick={() => navigate('/perfil-publico')}
              style={{ flex: 1, padding: '0.75rem', background: 'rgba(255, 255, 255, 0.05)', color: '#e2e8f0', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '8px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
            >
              Ver Perfil Público
            </button>
            <button 
              onClick={() => navigate('/eventos')}
              style={{ flex: 1, padding: '0.75rem', background: 'transparent', color: '#94a3b8', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '8px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
            >
              Ver Mais Eventos
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default PaymentSuccess;
