import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, Clock, AlertTriangle, ShieldCheck, ArrowRight, Calendar, User, Trophy, CreditCard, Sparkles, ExternalLink, ArrowLeft, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import localforage from 'localforage';
import { publicRegistrationService } from '../services/publicRegistrationService';

const PaymentSuccess = () => {
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

  const rawStatus = 
    searchParams.get('collection_status') || 
    searchParams.get('status') || 
    searchParams.get('payment_status');

  const [paymentState, setPaymentState] = useState('checking'); // 'checking' | 'approved' | 'pending' | 'rejected'
  const [registration, setRegistration] = useState(null);
  const [countdown, setCountdown] = useState(8);
  const [autoRedirect, setAutoRedirect] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function verifyAndProcess() {
      // 1. Determinar status inicial a partir dos parâmetros de URL
      const normalizedParamStatus = (rawStatus || '').toLowerCase().trim();
      let isPaymentApproved = normalizedParamStatus === 'approved';
      let isPaymentPending = normalizedParamStatus === 'pending' || normalizedParamStatus === 'in_process';
      let isPaymentRejected = normalizedParamStatus === 'rejected' || normalizedParamStatus === 'cancelled' || normalizedParamStatus === 'null';

      // 2. Se houver ID de pagamento, consultar status oficial na API
      if (sessionId && sessionId !== 'null') {
        try {
          const statusCheck = await publicRegistrationService.checkPaymentStatus(sessionId);
          if (statusCheck) {
            if (statusCheck.approved || statusCheck.status === 'approved') {
              isPaymentApproved = true;
              isPaymentPending = false;
              isPaymentRejected = false;
            } else if (statusCheck.status === 'pending' || statusCheck.status === 'in_process') {
              isPaymentApproved = false;
              isPaymentPending = true;
              isPaymentRejected = false;
            } else if (statusCheck.status === 'rejected' || statusCheck.status === 'cancelled') {
              isPaymentApproved = false;
              isPaymentPending = false;
              isPaymentRejected = true;
            }
          }
        } catch (err) {
          console.warn('[PaymentSuccess] Erro ao consultar status do pagamento:', err);
        }
      }

      // Se nenhum parâmetro de URL foi passado e nenhum sessionId válido, não é aprovação
      if (!rawStatus && !sessionId) {
        isPaymentApproved = false;
        isPaymentPending = true;
      }

      if (!isMounted) return;

      // Se pagamento foi rejeitado ou cancelado
      if (isPaymentRejected) {
        setPaymentState('rejected');
        return;
      }

      // Se pagamento está pendente (ex: boleto, PIX aguardando pagamento ou usuário retornou sem concluir)
      if (!isPaymentApproved) {
        setPaymentState('pending');

        // Carregar dados da inscrição localmente sem alterar para aprovado
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
        return;
      }

      // 3. Pagamento genuinamente APROVADO: Notificar backend e atualizar caches
      setPaymentState('approved');

      // Notificar backend via confirm-return
      try {
        const baseApi = (import.meta.env?.VITE_API_BASE_URL || window.location.origin).replace(/\/$/, '');
        if (externalRef || sessionId) {
          fetch(`${baseApi}/api/webhooks/payment/confirm-return?registrationIds=${encodeURIComponent(externalRef || '')}&paymentId=${encodeURIComponent(sessionId || '')}`, {
            method: 'GET',
            headers: { 'ngrok-skip-browser-warning': 'true' }
          }).catch(err => console.warn('Confirm-return ping:', err));
        }
      } catch (e) {
        console.warn('Falha no confirm-return:', e);
      }

      // Atualizar armazenamentos locais para APPROVED
      const targetIds = externalRef 
        ? externalRef.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
        : [];

      let found = null;

      // A) genesis_registrations_v1
      try {
        const rawStored = localStorage.getItem('genesis_registrations_v1');
        if (rawStored) {
          const storedList = JSON.parse(rawStored);
          if (Array.isArray(storedList)) {
            const updated = storedList.map(reg => {
              const regId = (reg.id || reg.athleteId || reg.clientRequestId || '').toLowerCase();
              if (targetIds.length === 0 || targetIds.some(t => regId.includes(t) || t.includes(regId))) {
                found = {
                  ...reg,
                  status: 'APPROVED',
                  paymentStatus: 'APPROVED',
                  paymentMethod: 'Mercado Pago',
                  transactionId: sessionId || reg.transactionId || 'MP-' + Date.now()
                };
                return found;
              }
              return reg;
            });
            localStorage.setItem('genesis_registrations_v1', JSON.stringify(updated));
          }
        }
      } catch (err) {
        console.warn('Erro ao atualizar genesis_registrations_v1:', err);
      }

      // B) genesis_public_registration_pending_v1
      try {
        const rawPending = localStorage.getItem('genesis_public_registration_pending_v1');
        if (rawPending) {
          const pendingList = JSON.parse(rawPending);
          if (Array.isArray(pendingList)) {
            const updatedPending = pendingList.map(reg => {
              const regId = (reg.id || reg.clientRequestId || '').toLowerCase();
              if (targetIds.length === 0 || targetIds.some(t => regId.includes(t) || t.includes(regId))) {
                const regApproved = {
                  ...reg,
                  status: 'APPROVED',
                  paymentStatus: 'APPROVED',
                  paymentMethod: 'Mercado Pago',
                  transactionId: sessionId || 'MP-' + Date.now()
                };
                if (!found) found = regApproved;
                return regApproved;
              }
              return reg;
            });
            localStorage.setItem('genesis_public_registration_pending_v1', JSON.stringify(updatedPending));
          }
        }
      } catch (err) {
        console.warn('Erro ao atualizar pending registrations:', err);
      }

      // C) genesis_ranking_data no LocalForage e localStorage
      try {
        const rawGlobal = localStorage.getItem('genesis_ranking_data');
        if (rawGlobal) {
          const globalData = JSON.parse(rawGlobal);
          if (globalData && Array.isArray(globalData.athletes)) {
            let mod = false;
            globalData.athletes = globalData.athletes.map(a => {
              const aId = (a.id || a.clientRequestId || '').toLowerCase();
              if (targetIds.length === 0 || targetIds.some(t => aId.includes(t) || t.includes(aId))) {
                const approvedAth = {
                  ...a,
                  status: 'APPROVED',
                  paymentStatus: 'APPROVED',
                  paymentMethod: 'Mercado Pago',
                  transactionId: sessionId || a.transactionId || 'MP-' + Date.now()
                };
                if (!found) found = approvedAth;
                mod = true;
                return approvedAth;
              }
              return a;
            });
            if (mod) {
              localStorage.setItem('genesis_ranking_data', JSON.stringify(globalData));
              try {
                await localforage.setItem('genesis_ranking_data', globalData);
              } catch (_) {}
            }
          }
        }
      } catch (err) {
        console.warn('Erro ao atualizar genesis_ranking_data:', err);
      }

      if (isMounted) {
        if (found) setRegistration(found);
        window.dispatchEvent(new Event('storage'));
      }
    }

    verifyAndProcess();

    return () => {
      isMounted = false;
    };
  }, [externalRef, rawStatus, sessionId]);

  // Contagem regressiva para redirecionamento automático
  useEffect(() => {
    if (!autoRedirect || paymentState === 'checking') return;
    if (countdown <= 0) {
      navigate('/minha-conta');
      return;
    }
    const timer = setTimeout(() => {
      setCountdown(prev => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [countdown, autoRedirect, navigate, paymentState]);

  // Tela de verificação em andamento
  if (paymentState === 'checking') {
    return (
      <div className="public-page payment-result-page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '85vh', padding: '2rem 1rem', background: '#090d16', color: '#fff' }}>
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <Loader2 size={48} color="#00c2cb" className="animate-spin" />
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>Verificando status do pagamento...</h2>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Aguarde enquanto consultamos a confirmação com o Mercado Pago.</p>
        </div>
      </div>
    );
  }

  // Tela de pagamento rejeitado
  if (paymentState === 'rejected') {
    return (
      <div className="public-page payment-result-page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '85vh', padding: '2rem 1rem', background: '#090d16', color: '#fff' }}>
        <motion.div 
          initial={{ scale: 0.85, opacity: 0 }} 
          animate={{ scale: 1, opacity: 1 }} 
          transition={{ type: 'spring', stiffness: 220, damping: 20 }}
          style={{ width: '100%', maxWidth: '560px', background: 'linear-gradient(180deg, #161a26 0%, #0e121a 100%)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '20px', padding: '2.5rem 2rem', textAlign: 'center', boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7)' }}
        >
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '84px', height: '84px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.12)', border: '2px solid rgba(239, 68, 68, 0.4)', marginBottom: '1.5rem' }}>
            <AlertTriangle size={48} color="#ef4444" />
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem', color: '#ffffff' }}>Pagamento Não Concluído</h1>
          <p style={{ fontSize: '0.95rem', color: '#94a3b8', marginBottom: '1.8rem' }}>
            A transação no Mercado Pago foi recusada ou cancelada. Sua vaga não foi confirmada.
          </p>
          <button 
            onClick={() => navigate('/minha-conta')}
            style={{ width: '100%', padding: '0.95rem', background: 'linear-gradient(135deg, #00c2cb 0%, #009ca4 100%)', color: '#05070b', border: 'none', borderRadius: '12px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            Ir para Minha Conta <ArrowRight size={19} />
          </button>
        </motion.div>
      </div>
    );
  }

  // Tela de pagamento pendente (usuário voltou sem pagar ou aguardando PIX/Boleto)
  if (paymentState === 'pending') {
    return (
      <div className="public-page payment-result-page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '85vh', padding: '2rem 1rem', background: '#090d16', color: '#fff' }}>
        <motion.div 
          initial={{ scale: 0.85, opacity: 0 }} 
          animate={{ scale: 1, opacity: 1 }} 
          transition={{ type: 'spring', stiffness: 220, damping: 20 }}
          style={{ width: '100%', maxWidth: '560px', background: 'linear-gradient(180deg, #191f2c 0%, #111622 100%)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '20px', padding: '2.5rem 2rem', textAlign: 'center', boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7)' }}
        >
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '84px', height: '84px', borderRadius: '50%', background: 'rgba(245, 158, 11, 0.12)', border: '2px solid rgba(245, 158, 11, 0.4)', marginBottom: '1.5rem' }}>
            <Clock size={48} color="#f59e0b" />
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem', color: '#ffffff' }}>Pagamento Pendente</h1>
          <p style={{ fontSize: '0.95rem', color: '#94a3b8', marginBottom: '1.5rem', lineHeight: '1.5' }}>
            Sua inscrição foi registrada, mas o pagamento no Mercado Pago ainda <strong>não foi confirmado</strong>. Assim que o pagamento for aprovado, sua vaga será confirmada automaticamente.
          </p>
          <div style={{ background: '#1c2230', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '1.2rem', textAlign: 'left', marginBottom: '1.8rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f59e0b', fontSize: '0.88rem', fontWeight: 600, marginBottom: '0.4rem' }}>
              <Clock size={17} />
              Status: Aguardando Pagamento
            </div>
            <p style={{ fontSize: '0.84rem', color: '#cbd5e1', margin: 0 }}>
              Você pode concluir o pagamento ou consultar o status a qualquer momento em <strong>Minha Conta</strong>.
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button 
              onClick={() => navigate('/minha-conta')}
              style={{ width: '100%', padding: '0.95rem', background: 'linear-gradient(135deg, #00c2cb 0%, #009ca4 100%)', color: '#05070b', border: 'none', borderRadius: '12px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              Ir para Minha Conta <ArrowRight size={19} />
            </button>
            <button 
              onClick={() => navigate('/eventos')}
              style={{ width: '100%', padding: '0.8rem', background: 'transparent', color: '#94a3b8', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer' }}
            >
              Voltar aos Campeonatos
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="public-page payment-result-page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '85vh', padding: '2rem 1rem', background: '#090d16', color: '#fff' }}>
      <motion.div 
        initial={{ scale: 0.85, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }} 
        transition={{ type: 'spring', stiffness: 220, damping: 20 }}
        style={{ 
          width: '100%', 
          maxWidth: '560px', 
          background: 'linear-gradient(180deg, #121929 0%, #0d121f 100%)', 
          border: '1px solid rgba(0, 194, 203, 0.25)', 
          borderRadius: '20px', 
          padding: '2.5rem 2rem', 
          textAlign: 'center', 
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7), 0 0 30px rgba(0, 194, 203, 0.08)' 
        }}
      >
        {/* ÍCONE DE SUCESSO */}
        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '84px', height: '84px', borderRadius: '50%', background: 'rgba(34, 197, 94, 0.14)', border: '2px solid rgba(34, 197, 94, 0.5)', marginBottom: '1.5rem', boxShadow: '0 0 24px rgba(34, 197, 94, 0.2)' }}>
          <CheckCircle size={50} color="#22c55e" />
        </div>

        <h1 style={{ fontSize: '2.1rem', fontWeight: 800, marginBottom: '0.4rem', color: '#ffffff', letterSpacing: '-0.5px' }}>
          Inscrição Confirmada!
        </h1>
        
        <p style={{ fontSize: '0.95rem', color: '#94a3b8', marginBottom: '1.8rem', lineHeight: '1.5' }}>
          Seu pagamento via <strong style={{ color: '#00c2cb' }}>Mercado Pago</strong> foi processado e aprovado com sucesso. Sua vaga está garantida!
        </p>

        {/* COMPROVANTE DETALHADO DA INSCRIÇÃO */}
        <div style={{ background: '#172033', border: '1px solid rgba(255, 255, 255, 0.09)', borderRadius: '14px', padding: '1.4rem', textAlign: 'left', marginBottom: '1.8rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '0.85rem', marginBottom: '0.85rem' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#22c55e', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px', letterSpacing: '0.04em' }}>
              <ShieldCheck size={17} /> Aprovado Oficialmente
            </span>
            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
              {new Date().toLocaleDateString('pt-BR')} • {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.9rem' }}>
            {/* ATLETA */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <User size={16} color="#00c2cb" style={{ flexShrink: 0 }} />
              <span style={{ color: '#94a3b8' }}>Atleta:</span>
              <strong style={{ color: '#ffffff', marginLeft: 'auto', textAlign: 'right', fontWeight: 700 }}>
                {registration?.athleteName || registration?.fullName || registration?.nome || 'Atleta Confirmado'}
              </strong>
            </div>

            {/* EVENTO */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Trophy size={16} color="#fbbf24" style={{ flexShrink: 0 }} />
              <span style={{ color: '#94a3b8' }}>Campeonato:</span>
              <strong style={{ color: '#ffffff', marginLeft: 'auto', textAlign: 'right', fontWeight: 700 }}>
                {registration?.eventName || registration?.eventTitle || 'Circuito Genesis Sports'}
              </strong>
            </div>

            {/* CATEGORIA / FAIXA */}
            {(registration?.belt || registration?.category || registration?.faixa || registration?.categoria) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Calendar size={16} color="#38bdf8" style={{ flexShrink: 0 }} />
                <span style={{ color: '#94a3b8' }}>Divisão:</span>
                <strong style={{ color: '#ffffff', marginLeft: 'auto', textAlign: 'right' }}>
                  {registration.belt || registration.faixa ? `${registration.belt || registration.faixa} • ` : ''}
                  {registration.category || registration.categoria || registration.modalidade || 'Geral'}
                </strong>
              </div>
            )}

            {/* ID TRANSAÇÃO MP */}
            {sessionId && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px', paddingTop: '8px', borderTop: '1px dashed rgba(255, 255, 255, 0.08)', fontSize: '0.8rem' }}>
                <CreditCard size={15} color="#00c2cb" style={{ flexShrink: 0 }} />
                <span style={{ color: '#64748b' }}>Comprovante MP:</span>
                <span style={{ color: '#38bdf8', fontFamily: 'monospace', marginLeft: 'auto', fontWeight: 600 }}>{sessionId}</span>
              </div>
            )}
          </div>
        </div>

        {/* REDIRECIONAMENTO AUTOMÁTICO */}
        {autoRedirect && (
          <div style={{ marginBottom: '1.6rem', fontSize: '0.86rem', color: '#94a3b8', background: 'rgba(0, 194, 203, 0.06)', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(0, 194, 203, 0.15)' }}>
            Redirecionando para suas inscrições em <strong style={{ color: '#00c2cb', fontSize: '0.95rem' }}>{countdown}s</strong>...{' '}
            <button 
              onClick={() => setAutoRedirect(false)}
              style={{ background: 'none', border: 'none', color: '#64748b', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.82rem', marginLeft: '6px' }}
            >
              Pausar
            </button>
          </div>
        )}

        {/* BOTÕES DE AÇÃO */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button 
            onClick={() => navigate('/minha-conta')}
            style={{ 
              width: '100%', 
              padding: '0.95rem', 
              background: 'linear-gradient(135deg, #00c2cb 0%, #009ca4 100%)', 
              color: '#05070b', 
              border: 'none', 
              borderRadius: '12px', 
              fontWeight: 800, 
              fontSize: '1rem', 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '8px', 
              boxShadow: '0 4px 15px rgba(0, 194, 203, 0.35)',
              transition: 'transform 0.2s, box-shadow 0.2s' 
            }}
          >
            Ver Minha Inscrição
            <ArrowRight size={19} />
          </button>
          
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              onClick={() => navigate('/ranking')}
              style={{ 
                flex: 1, 
                padding: '0.8rem', 
                background: 'rgba(255, 255, 255, 0.06)', 
                color: '#e2e8f0', 
                border: '1px solid rgba(255, 255, 255, 0.14)', 
                borderRadius: '10px', 
                fontWeight: 600, 
                fontSize: '0.88rem', 
                cursor: 'pointer' 
              }}
            >
              Ver Ranking
            </button>
            <button 
              onClick={() => navigate('/eventos')}
              style={{ 
                flex: 1, 
                padding: '0.8rem', 
                background: 'transparent', 
                color: '#94a3b8', 
                border: '1px solid rgba(255, 255, 255, 0.08)', 
                borderRadius: '10px', 
                fontWeight: 600, 
                fontSize: '0.88rem', 
                cursor: 'pointer' 
              }}
            >
              Mais Eventos
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default PaymentSuccess;
