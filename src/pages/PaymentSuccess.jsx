import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id') || searchParams.get('payment_id') || searchParams.get('collection_id');
  const externalRef = searchParams.get('external_reference');
  const status = searchParams.get('status') || searchParams.get('collection_status');

  React.useEffect(() => {
    if (externalRef && (status === 'approved' || !status)) {
      // 1. Atualiza no backend Java
      try {
        const apiUrl = import.meta.env?.VITE_API_URL || 'http://localhost:8080';
        fetch(`${apiUrl}/api/webhooks/payment/confirm-return?registrationIds=${encodeURIComponent(externalRef)}&paymentId=${encodeURIComponent(sessionId || '')}`, {
          method: 'GET',
          headers: { 'ngrok-skip-browser-warning': 'true' }
        }).catch(err => console.error('Erro ao confirmar backend:', err));
      } catch (e) {
        console.error('Falha ao acionar confirm-return:', e);
      }

      // 2. Atualiza no LocalStorage do navegador
      try {
        const registrationIds = externalRef.split(',').map(s => s.trim()).filter(Boolean);
        const stored = JSON.parse(localStorage.getItem('genesis_registrations_v1') || '[]');
        let updated = false;

        const newStored = stored.map(reg => {
          if (registrationIds.includes(reg.id) || registrationIds.includes(reg.athleteId)) {
            updated = true;
            return {
              ...reg,
              status: 'APPROVED',
              paymentStatus: 'APPROVED',
              paymentMethod: 'Mercado Pago'
            };
          }
          return reg;
        });

        if (updated) {
          localStorage.setItem('genesis_registrations_v1', JSON.stringify(newStored));
          window.dispatchEvent(new Event('storage'));
        }
      } catch (err) {
        console.error('Erro ao auto-aprovar inscricao no retorno:', err);
      }
    }
  }, [externalRef, status, sessionId]);

  return (
    <div className="payment-result-page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', textAlign: 'center', padding: '2rem' }}>
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 20 }}>
        <CheckCircle size={80} color="#22c55e" style={{ marginBottom: '1rem' }} />
      </motion.div>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem', color: '#f4f4f5' }}>Pagamento Confirmado!</h1>
      <p style={{ fontSize: '1.2rem', color: '#a1a1aa', maxWidth: '600px', marginBottom: '2rem' }}>
        Sua inscrição foi confirmada com sucesso via Mercado Pago.
        {sessionId && <span style={{ display: 'block', fontSize: '0.9rem', marginTop: '0.5rem', color: '#71717a' }}>ID da Transação: {sessionId}</span>}
      </p>
      
      <div style={{ display: 'flex', gap: '1rem' }}>
        <button 
          onClick={() => navigate('/minha-conta')}
          style={{ padding: '0.75rem 1.5rem', background: '#00c2cb', color: '#000', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
        >
          Ir para Minha Conta
        </button>
        <button 
          onClick={() => navigate('/eventos')}
          style={{ padding: '0.75rem 1.5rem', background: 'transparent', color: '#f4f4f5', border: '1px solid #52525b', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
        >
          Ver Mais Eventos
        </button>
      </div>
    </div>
  );
};

export default PaymentSuccess;
