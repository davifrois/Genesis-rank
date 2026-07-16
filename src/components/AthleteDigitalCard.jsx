import React, { useEffect, useState, useRef } from 'react';
import QRCode from 'qrcode';
import { X, ScanLine, Download, Wallet } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import html2canvas from 'html2canvas';

const getBeltColors = (belt) => {
  const normalized = (belt || '').toLowerCase();
  switch (normalized) {
    case 'branca': return { bg: '#f8fafc', text: '#0f172a', border: '#e2e8f0', gradient: 'linear-gradient(135deg, #ffffff 0%, #e2e8f0 100%)' };
    case 'cinza': return { bg: '#94a3b8', text: '#ffffff', border: '#64748b', gradient: 'linear-gradient(135deg, #cbd5e1 0%, #64748b 100%)' };
    case 'amarela': return { bg: '#eab308', text: '#ffffff', border: '#ca8a04', gradient: 'linear-gradient(135deg, #fef08a 0%, #ca8a04 100%)' };
    case 'laranja': return { bg: '#f97316', text: '#ffffff', border: '#ea580c', gradient: 'linear-gradient(135deg, #fdba74 0%, #ea580c 100%)' };
    case 'verde': return { bg: '#22c55e', text: '#ffffff', border: '#16a34a', gradient: 'linear-gradient(135deg, #86efac 0%, #16a34a 100%)' };
    case 'azul': return { bg: '#3b82f6', text: '#ffffff', border: '#2563eb', gradient: 'linear-gradient(135deg, #93c5fd 0%, #2563eb 100%)' };
    case 'roxa': return { bg: '#a855f7', text: '#ffffff', border: '#9333ea', gradient: 'linear-gradient(135deg, #d8b4fe 0%, #9333ea 100%)' };
    case 'marrom': return { bg: '#78350f', text: '#ffffff', border: '#451a03', gradient: 'linear-gradient(135deg, #b45309 0%, #451a03 100%)' };
    case 'preta': return { bg: '#0f172a', text: '#ffffff', border: '#020617', gradient: 'linear-gradient(135deg, #334155 0%, #020617 100%)' };
    default: return { bg: '#0f172a', text: '#ffffff', border: '#020617', gradient: 'linear-gradient(135deg, #334155 0%, #020617 100%)' };
  }
};

const getInitials = (name) => {
  if (!name) return 'AT';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const calculateAge = (dateString) => {
  if (!dateString) return '--';
  const birthYear = Number(dateString.slice(0, 4));
  if (!Number.isFinite(birthYear) || birthYear <= 1900) return '--';
  return new Date().getFullYear() - birthYear;
};

const generateIdNumber = (uuid) => {
  if (!uuid) return '000000';
  return uuid.split('-')[0].toUpperCase();
};

export default function AthleteDigitalCard({ profile, academyName, profileUrl, onClose }) {
  const [qrUrl, setQrUrl] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [walletMessage, setWalletMessage] = useState(false);
  const cardRef = useRef(null);
  const beltInfo = getBeltColors(profile.belt);

  useEffect(() => {
    if (profileUrl) {
      QRCode.toDataURL(profileUrl, {
        width: 300,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' }
      }).then(setQrUrl).catch(console.error);
    }
  }, [profileUrl]);

  const handleDownload = async () => {
    if (!cardRef.current || isDownloading) return;
    setIsDownloading(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 3, // High resolution
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#09090b',
        logging: false
      });
      const image = canvas.toDataURL('image/png', 1.0);
      const link = document.createElement('a');
      link.download = `genesis-id-${profile.fullName ? profile.fullName.replace(/\s+/g, '-').toLowerCase() : 'atleta'}.png`;
      link.href = image;
      link.click();
    } catch (err) {
      console.error('Erro ao gerar imagem:', err);
      alert('Não foi possível gerar a imagem no momento. Tente tirar um print da tela.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(5, 5, 10, 0.85)',
        backdropFilter: 'blur(12px)',
        zIndex: 99999,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '20px'
      }}
    >
      <button 
        onClick={onClose}
        style={{
          position: 'absolute', top: '24px', right: '24px',
          background: 'rgba(255,255,255,0.1)', border: 'none',
          color: '#fff', width: '40px', height: '40px', borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', transition: 'all 0.2s'
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
        onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
      >
        <X size={20} />
      </button>

      {/* The Black Card Wrapper */}
      <motion.div 
        initial={{ y: 50, scale: 0.95 }}
        animate={{ y: 0, scale: 1 }}
        style={{ width: '100%', maxWidth: '380px' }}
      >
        <div 
          ref={cardRef}
          style={{
            background: '#09090b',
            borderRadius: '24px',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.1)',
            position: 'relative'
          }}
        >
          {/* Shine effect */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: '150px',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0) 100%)',
            pointerEvents: 'none'
          }} />

          {/* Header Ribbon */}
          <div style={{
            padding: '24px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            borderBottom: '1px solid rgba(255,255,255,0.05)'
          }}>
            <div style={{ color: '#fff', fontSize: '1.2rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
              GENESIS<span style={{ color: '#00c2cb' }}>SPORTS</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              <ScanLine size={12} /> ID DIGITAL
            </div>
          </div>

          {/* Profile Info & Stats */}
          <div style={{ padding: '32px 24px 20px', display: 'flex', flexDirection: 'column' }}>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px' }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                {profile.photoUrl ? (
                  <img 
                    src={profile.photoUrl} 
                    alt="Perfil" 
                    crossOrigin="anonymous"
                    style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: `3px solid ${beltInfo.border}` }}
                  />
                ) : (
                  <div style={{
                    width: '80px', height: '80px', borderRadius: '50%',
                    background: beltInfo.bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: beltInfo.text, fontSize: '1.75rem', fontWeight: 800,
                    border: `3px solid ${beltInfo.border}`
                  }}>
                    {getInitials(profile.fullName)}
                  </div>
                )}
                
                {/* Belt Tag */}
                <div style={{
                  position: 'absolute', bottom: '-8px', left: '50%', transform: 'translateX(-50%)',
                  background: beltInfo.gradient,
                  color: beltInfo.text,
                  fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em',
                  padding: '4px 10px', borderRadius: '12px',
                  border: `1px solid ${beltInfo.border}`,
                  whiteSpace: 'nowrap',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                }}>
                  Faixa {profile.belt || 'Branca'}
                </div>
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: '#fff', fontSize: '1.3rem', fontWeight: 700, lineHeight: 1.2, marginBottom: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {profile.fullName || 'Atleta sem nome'}
                </div>
                <div style={{ color: '#00c2cb', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {academyName || 'Atleta Independente'}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', fontWeight: 500 }}>
                  {profile.city && profile.state ? `${profile.city}, ${profile.state}` : (profile.country || 'Brasil')}
                </div>
              </div>
            </div>

            {/* Extra Metadata Grid */}
            <div style={{ 
              display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', 
              background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '16px',
              border: '1px solid rgba(255,255,255,0.05)'
            }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginBottom: '4px' }}>Reg / ID</span>
                <span style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 600 }}>{generateIdNumber(profile.id)}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginBottom: '4px' }}>Idade</span>
                <span style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 600 }}>{calculateAge(profile.birthDate)} anos</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginBottom: '4px' }}>Categoria</span>
                <span style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 600 }}>{profile.weight || 'Absoluto'}</span>
              </div>
            </div>

          </div>

          {/* QR Code Section */}
          <div style={{
            background: 'rgba(255,255,255,0.02)',
            borderTop: '1px solid rgba(255,255,255,0.05)',
            padding: '24px',
            display: 'flex', flexDirection: 'column', alignItems: 'center'
          }}>
            <div style={{ 
              background: '#fff', 
              padding: '12px', 
              borderRadius: '16px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
              marginBottom: '16px'
            }}>
              {qrUrl ? (
                <img src={qrUrl} alt="QR Code" style={{ width: '130px', height: '130px', display: 'block', borderRadius: '8px' }} />
              ) : (
                <div style={{ width: '130px', height: '130px', background: '#f1f5f9', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.8rem' }}>Gerando...</div>
              )}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', textAlign: 'center', lineHeight: 1.5 }}>
              Escaneie o QR Code na pesagem<br/>para validar este atleta.
            </div>
          </div>
        </div>

        {/* Download Action */}
        <button
          onClick={handleDownload}
          disabled={isDownloading}
          style={{
            marginTop: '24px', width: '100%',
            padding: '16px', borderRadius: '16px',
            background: 'linear-gradient(135deg, #00c2cb 0%, #009ba3 100%)',
            border: 'none', color: '#fff',
            fontSize: '0.95rem', fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            cursor: isDownloading ? 'default' : 'pointer',
            boxShadow: '0 10px 25px rgba(0, 194, 203, 0.4)',
            transition: 'all 0.2s',
            opacity: isDownloading ? 0.7 : 1
          }}
        >
          <Download size={18} />
          {isDownloading ? 'Gerando Imagem Alta Qualidade...' : 'Salvar na Galeria do Celular'}
        </button>

        {/* Apple Wallet Action */}
        <button
          onClick={() => {
            setWalletMessage(true);
            setTimeout(() => setWalletMessage(false), 4000);
          }}
          style={{
            marginTop: '12px', width: '100%',
            padding: '16px', borderRadius: '16px',
            background: '#000000',
            border: '1px solid #333', color: '#fff',
            fontSize: '0.95rem', fontWeight: 600,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          <Wallet size={18} />
          Adicionar à Carteira da Apple
        </button>

        {/* Wallet Coming Soon Message */}
        <AnimatePresence>
          {walletMessage && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: 'auto', marginTop: '12px' }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              style={{
                background: 'rgba(234, 179, 8, 0.1)',
                border: '1px solid rgba(234, 179, 8, 0.3)',
                color: '#eab308',
                padding: '12px 16px',
                borderRadius: '12px',
                fontSize: '0.85rem',
                textAlign: 'center',
                lineHeight: 1.5,
                overflow: 'hidden'
              }}
            >
              <strong>Integração em Breve!</strong><br />
              Estamos finalizando a conexão oficial com os servidores da Apple para ativar esta funcionalidade. Por enquanto, utilize o botão azul para salvar a imagem.
            </motion.div>
          )}
        </AnimatePresence>

      </motion.div>
    </motion.div>
  );
}
