import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Clock, AlertCircle, ArrowRight, RefreshCw, Trophy, User, Calendar, CreditCard, ChevronRight, HelpCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { publicRegistrationService } from '../services/publicRegistrationService';

const PaymentPending = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const sessionId = 
    searchParams.get('payment_id') || 
    searchParams.get('collection_id') || 
    searchParams.get('session_id') || 
    searchParams.get('id');

  const externalRef = 
    searchParams.get('external_reference') || 
    searchParams.get('externalReference');

  const [registration, setRegistration] = useState(null);
  const [isRetryingPayment, setIsRetryingPayment] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  // Carregar informações da inscrição pendente
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

      if (!registration) {
        const rawPending = localStorage.getItem('genesis_public_registration_pending_v1');
        if (rawPending) {
          const pendingList = JSON.parse(rawPending);
          if (Array.isArray(pendingList)) {
            const item = pendingList.find(reg => {
              const regId = (reg.id || reg.clientRequestId || '').toLowerCase();
              return targetIds.some(t => regId.includes(t) || t.includes(regId));
            });
            if (item) setRegistration(item);
          }
        }
      }
    } catch (_) {}
  }, [externalRef]);

  // Verificar se o pagamento já foi aprovado enquanto o usuário estava fora
  const handleCheckStatus = async () => {
    if (!sessionId || sessionId === 'null') {
      setStatusMessage('Nenhum identificador de transação encontrado para consulta.');
      return;
    }

    setIsCheckingStatus(true);
    setStatusMessage('');

    try {
      const res = await publicRegistrationService.checkPaymentStatus(sessionId);
      if (res && res.approved) {
        // Redireciona para sucesso
        navigate(`/sucesso?payment_id=${encodeURIComponent(sessionId)}&status=approved&external_reference=${encodeURIComponent(externalRef || '')}`);
      } else {
        setStatusMessage('Pagamento ainda não foi compensado. Se você pagou via PIX, aguarde alguns segundos.');
      }
    } catch (err) {
      setStatusMessage('Não foi possível verificar no momento. Tente novamente em instantes.');
    } finally {
      setIsCheckingStatus(false);
    }
  };

  // Reabrir o checkout para o usuário concluir o pagamento
  const handleResumePayment = async () => {
    setIsRetryingPayment(true);
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
      alert(`Não foi possível iniciar o checkout: ${err.message}`);
      setIsRetryingPayment(false);
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
          maxWidth: '560px', 
          background: 'linear-gradient(180deg, #182030 0%, #101622 100%)', 
          border: '1px solid rgba(245, 158, 11, 0.3)', 
          borderRadius: '20px', 
          padding: '2.5rem 2rem', 
          textAlign: 'center', 
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7), 0 0 30px rgba(245, 158, 11, 0.08)' 
        }}
      >
        {/* ÍCONE DE STATUS PENDENTE */}
        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '84px', height: '84px', borderRadius: '50%', background: 'rgba(245, 158, 11, 0.12)', border: '2px solid rgba(245, 158, 11, 0.45)', marginBottom: '1.5rem', boxShadow: '0 0 24px rgba(245, 158, 11, 0.2)' }}>
          <Clock size={48} color="#f59e0b" />
        </div>

        <h1 style={{ fontSize: '2.1rem', fontWeight: 800, marginBottom: '0.4rem', color: '#ffffff', letterSpacing: '-0.5px' }}>
          Pagamento Pendente
        </h1>

        <p style={{ fontSize: '0.95rem', color: '#94a3b8', marginBottom: '1.6rem', lineHeight: '1.5' }}>
          Sua inscrição foi registrada com sucesso, mas o pagamento no <strong style={{ color: '#00c2cb' }}>Mercado Pago</strong> ainda <strong style={{ color: '#f59e0b' }}>não foi concluído</strong>.
        </p>

        {/* INFORMAÇÃO DA VAGA PRÉ-RESERVADA */}
        <div style={{ background: '#1c2638', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: '14px', padding: '1.25rem', textAlign: 'left', marginBottom: '1.6rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f59e0b', fontSize: '0.88rem', fontWeight: 700, marginBottom: '0.4rem' }}>
            <AlertCircle size={17} />
            Sua vaga está pré-reservada
          </div>
          <p style={{ fontSize: '0.84rem', color: '#cbd5e1', margin: 0, lineHeight: '1.5' }}>
            Se você já efetuou o pagamento via <strong>PIX</strong> ou <strong>Boleto</strong>, a confirmação ocorre automaticamente assim que a operadora compensar a transação.
          </p>

          {/* DADOS DA INSCRIÇÃO SE DISPONÍVEIS */}
          {registration && (
            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed rgba(255, 255, 255, 0.08)', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94a3b8' }}>Atleta:</span>
                <strong style={{ color: '#ffffff' }}>{registration.athleteName || registration.nome || registration.fullName || 'Atleta'}</strong>
              </div>
              {registration.eventName && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#94a3b8' }}>Campeonato:</span>
                  <strong style={{ color: '#ffffff' }}>{registration.eventName}</strong>
                </div>
              )}
            </div>
          )}
        </div>

        {statusMessage && (
          <div style={{ padding: '10px 14px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.25)', color: '#fbbf24', fontSize: '0.85rem', marginBottom: '1.4rem' }}>
            {statusMessage}
          </div>
        )}

        {/* AÇÕES */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* BOTÃO PRINCIPAL: CONCLUIR PAGAMENTO */}
          <button 
            onClick={handleResumePayment}
            disabled={isRetryingPayment}
            style={{ 
              width: '100%', 
              padding: '1rem', 
              background: 'linear-gradient(135deg, #00c2cb 0%, #009ca4 100%)', 
              color: '#05070b', 
              border: 'none', 
              borderRadius: '12px', 
              fontWeight: 800, 
              fontSize: '1rem', 
              cursor: isRetryingPayment ? 'not-allowed' : 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '8px', 
              boxShadow: '0 4px 15px rgba(0, 194, 203, 0.35)',
              opacity: isRetryingPayment ? 0.7 : 1
            }}
          >
            <CreditCard size={18} />
            {isRetryingPayment ? 'Abrindo Checkout...' : 'Concluir Pagamento Agora'}
          </button>

          {/* BOTÃO: VERIFICAR SE JÁ PAGOU */}
          {sessionId && sessionId !== 'null' && (
            <button 
              onClick={handleCheckStatus}
              disabled={isCheckingStatus}
              style={{ 
                width: '100%', 
                padding: '0.85rem', 
                background: 'rgba(255, 255, 255, 0.06)', 
                color: '#e2e8f0', 
                border: '1px solid rgba(255, 255, 255, 0.12)', 
                borderRadius: '10px', 
                fontWeight: 600, 
                fontSize: '0.88rem', 
                cursor: isCheckingStatus ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <RefreshCw size={15} className={isCheckingStatus ? 'animate-spin' : ''} />
              {isCheckingStatus ? 'Consultando Mercado Pago...' : 'Já paguei, verificar aprovação'}
            </button>
          )}

          {/* BOTÕES SECUNDÁRIOS */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
            <button 
              onClick={() => navigate('/minha-conta')}
              style={{ 
                flex: 1, 
                padding: '0.8rem', 
                background: 'rgba(255, 255, 255, 0.04)', 
                color: '#94a3b8', 
                border: '1px solid rgba(255, 255, 255, 0.08)', 
                borderRadius: '10px', 
                fontWeight: 600, 
                fontSize: '0.88rem', 
                cursor: 'pointer' 
              }}
            >
              Ir para Minha Conta
            </button>

            <button 
              onClick={() => navigate('/eventos')}
              style={{ 
                flex: 1, 
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
              Ver Campeonatos
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default PaymentPending;
