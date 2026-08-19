import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { XCircle, AlertTriangle, ArrowRight, RefreshCw, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';

const PaymentCancel = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const externalRef = searchParams.get('external_reference');

  return (
    <div className="public-page payment-result-page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '85vh', padding: '2rem 1rem', background: '#090d16', color: '#fff' }}>
      <motion.div 
        initial={{ scale: 0.85, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }} 
        transition={{ type: 'spring', stiffness: 220, damping: 20 }}
        style={{ 
          width: '100%', 
          maxWidth: '540px', 
          background: 'linear-gradient(180deg, #161a26 0%, #0e121a 100%)', 
          border: '1px solid rgba(239, 68, 68, 0.25)', 
          borderRadius: '20px', 
          padding: '2.5rem 2rem', 
          textAlign: 'center', 
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7), 0 0 30px rgba(239, 68, 68, 0.08)' 
        }}
      >
        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '84px', height: '84px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.12)', border: '2px solid rgba(239, 68, 68, 0.4)', marginBottom: '1.5rem', boxShadow: '0 0 24px rgba(239, 68, 68, 0.2)' }}>
          <XCircle size={48} color="#ef4444" />
        </div>

        <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem', color: '#ffffff', letterSpacing: '-0.5px' }}>
          Pagamento Não Concluído
        </h1>
        
        <p style={{ fontSize: '0.95rem', color: '#94a3b8', marginBottom: '1.8rem', lineHeight: '1.5' }}>
          O processo de pagamento no Mercado Pago foi cancelado ou não foi finalizado. Sua vaga permanecerá pendente até a confirmação do pagamento.
        </p>

        <div style={{ background: '#1c2230', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '1.2rem', textAlign: 'left', marginBottom: '1.8rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f59e0b', fontSize: '0.88rem', fontWeight: 600, marginBottom: '0.4rem' }}>
            <AlertTriangle size={17} />
            Inscrição Salva como Pendente
          </div>
          <p style={{ fontSize: '0.84rem', color: '#cbd5e1', margin: 0 }}>
            Você pode tentar o pagamento novamente a qualquer momento através da sua área de inscrições em <strong>Minha Conta</strong>.
          </p>
        </div>

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
              boxShadow: '0 4px 15px rgba(0, 194, 203, 0.35)' 
            }}
          >
            Ir para Minha Conta
            <ArrowRight size={19} />
          </button>
          
          <button 
            onClick={() => navigate('/eventos')}
            style={{ 
              width: '100%', 
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
            Voltar aos Campeonatos
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default PaymentCancel;
