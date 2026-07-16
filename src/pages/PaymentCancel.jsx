import React from 'react';
import { useNavigate } from 'react-router-dom';
import { XCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const PaymentCancel = () => {
  const navigate = useNavigate();

  return (
    <div className="payment-result-page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', textAlign: 'center', padding: '2rem' }}>
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 20 }}>
        <XCircle size={80} color="#ef4444" style={{ marginBottom: '1rem' }} />
      </motion.div>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem', color: '#f4f4f5' }}>Pagamento Cancelado</h1>
      <p style={{ fontSize: '1.2rem', color: '#a1a1aa', maxWidth: '600px', marginBottom: '2rem' }}>
        O processo de pagamento foi cancelado. Sua inscrição foi salva como pendente, mas a vaga não está garantida até que o pagamento seja confirmado.
      </p>
      
      <div style={{ display: 'flex', gap: '1rem' }}>
        <button 
          onClick={() => navigate('/minha-conta')}
          style={{ padding: '0.75rem 1.5rem', background: '#eab308', color: '#000', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
        >
          Tentar Pagar Novamente
        </button>
        <button 
          onClick={() => navigate('/eventos')}
          style={{ padding: '0.75rem 1.5rem', background: 'transparent', color: '#f4f4f5', border: '1px solid #52525b', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
        >
          Voltar aos Eventos
        </button>
      </div>
    </div>
  );
};

export default PaymentCancel;
