import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { XCircle, AlertTriangle, ArrowRight, RefreshCw, CreditCard, ShieldAlert } from 'lucide-react';
import { motion } from 'framer-motion';
import { publicRegistrationService } from '../services/publicRegistrationService';

const PaymentCancel = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const externalRef = searchParams.get('external_reference') || searchParams.get('externalReference');
  const [isRetrying, setIsRetrying] = useState(false);
  const [registration, setRegistration] = useState(null);

  useEffect(() => {
    const targetIds = externalRef 
      ? externalRef.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
      : [];

    try {
      const rawStored = localStorage.getItem('genesis_registrations_v1');
      if (rawStored) {
        const storedList = JSON.parse(rawStored);
        if (Array.isArray(storedList)) {
          const item = storedList.find(reg => {
            const regId = (reg.id || reg.athleteId || reg.clientRequestId || '').toLowerCase();
            return targetIds.some(t => regId.includes(t) || t.includes(regId));
          });
          if (item) setRegistration(item);
        }
      }
    } catch (_) {}
  }, [externalRef]);

  const handleRetryPayment = async () => {
    setIsRetrying(true);
    try {
      const checkoutRes = await publicRegistrationService.createCheckoutSession({
        registrationIds: externalRef || registration?.id || '',
        athleteName: registration?.athleteName || registration?.nome || registration?.fullName || 'Atleta',
        athleteEmail: registration?.email || registration?.athleteEmail || '',
        amount: Number(registration?.amount || registration?.price || 0)
      });

      if (checkoutRes && checkoutRes.url) {
        window.location.href = checkoutRes.url;
      } else {
        navigate('/minha-conta');
      }
    } catch (err) {
      alert(`Não foi possível reiniciar o pagamento: ${err.message}`);
      setIsRetrying(false);
    }
  };

  return (
    <div className="public-page payment-result-page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '85vh', padding: '2rem 1rem', background: '#090d16', color: '#fff' }}>
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }} 
        transition={{ type: 'spring', stiffness: 220, damping: 22 }}
        style={{ 
          width: '100%', 
          maxWidth: '540px', 
          background: 'linear-gradient(180deg, #181216 0%, #0f0d14 100%)', 
          border: '1px solid rgba(239, 68, 68, 0.3)', 
          borderRadius: '20px', 
          padding: '2.5rem 2rem', 
          textAlign: 'center', 
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7), 0 0 30px rgba(239, 68, 68, 0.08)' 
        }}
      >
        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '84px', height: '84px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.12)', border: '2px solid rgba(239, 68, 68, 0.45)', marginBottom: '1.5rem', boxShadow: '0 0 24px rgba(239, 68, 68, 0.2)' }}>
          <XCircle size={48} color="#ef4444" />
        </div>

        <h1 style={{ fontSize: '2.1rem', fontWeight: 800, marginBottom: '0.4rem', color: '#ffffff', letterSpacing: '-0.5px' }}>
          Erro no Pagamento
        </h1>
        
        <p style={{ fontSize: '0.95rem', color: '#94a3b8', marginBottom: '1.6rem', lineHeight: '1.5' }}>
          A transação no Mercado Pago foi <strong style={{ color: '#ef4444' }}>recusada</strong> pela operadora ou foi cancelada. Sua vaga não foi confirmada.
        </p>

        <div style={{ background: '#1c151c', border: '1px solid rgba(239, 68, 68, 0.18)', borderRadius: '12px', padding: '1.2rem', textAlign: 'left', marginBottom: '1.8rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f87171', fontSize: '0.88rem', fontWeight: 700, marginBottom: '0.4rem' }}>
            <ShieldAlert size={17} />
            Dicas para concluir sua inscrição:
          </div>
          <ul style={{ fontSize: '0.84rem', color: '#cbd5e1', margin: 0, paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <li>Verifique se o cartão possui limite disponível e autenticação ativa.</li>
            <li>Você também pode pagar via <strong>PIX instantâneo</strong> no Mercado Pago.</li>
            <li>Sua inscrição permanece salva na aba <strong>Minha Conta</strong>.</li>
          </ul>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button 
            onClick={handleRetryPayment}
            disabled={isRetrying}
            style={{ 
              width: '100%', 
              padding: '1rem', 
              background: 'linear-gradient(135deg, #00c2cb 0%, #009ca4 100%)', 
              color: '#05070b', 
              border: 'none', 
              borderRadius: '12px', 
              fontWeight: 800, 
              fontSize: '1rem', 
              cursor: isRetrying ? 'not-allowed' : 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '8px', 
              boxShadow: '0 4px 15px rgba(0, 194, 203, 0.35)',
              opacity: isRetrying ? 0.7 : 1
            }}
          >
            <RefreshCw size={18} className={isRetrying ? 'animate-spin' : ''} />
            {isRetrying ? 'Reiniciando...' : 'Tentar Pagamento Novamente'}
          </button>
          
          <button 
            onClick={() => navigate('/minha-conta')}
            style={{ 
              width: '100%', 
              padding: '0.85rem', 
              background: 'rgba(255, 255, 255, 0.05)', 
              color: '#cbd5e1', 
              border: '1px solid rgba(255, 255, 255, 0.1)', 
              borderRadius: '10px', 
              fontWeight: 600, 
              fontSize: '0.9rem', 
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            Ir para Minha Conta
            <ArrowRight size={17} />
          </button>

          <button 
            onClick={() => navigate('/eventos')}
            style={{ 
              width: '100%', 
              padding: '0.8rem', 
              background: 'transparent', 
              color: '#64748b', 
              border: '1px solid rgba(255, 255, 255, 0.06)', 
              borderRadius: '10px', 
              fontWeight: 600, 
              fontSize: '0.88rem', 
              cursor: 'pointer' 
            }}
          >
            Voltar aos Campeonatos
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default PaymentCancel;
