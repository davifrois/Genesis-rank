import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle, XCircle, Info, UserCheck, Users, ChevronDown,
  ChevronUp, Tag, ShieldCheck, AlertTriangle,
  X, Check, RotateCcw, CreditCard, Camera, Copy, AlertCircle, UserPlus,
  Search, Filter, ArrowUpDown
} from 'lucide-react';
import QRCode from 'qrcode';
import { publicRegistrationService } from '../services/publicRegistrationService';
import { generatePixPayload } from '../utils/pix';
import { compressImage } from '../utils/imageUtils';
import { useStore } from '../hooks/useStore';
import { resolveAthleteEventPrice } from '../utils/eventPricing';
import { getAvailableBeltsForAge, isValidBeltForAge } from '../utils/beltRules';

// ─── Categorias disponíveis ───────────────────────────────────────────────
const FAIXAS = ['Branca', 'Cinza', 'Amarela', 'Laranja', 'Verde', 'Azul', 'Roxa', 'Marrom', 'Preta'];
const CATEGORIAS_ETARIAS = [
  { label: 'Pré-Mirim', min: 0, max: 6 },
  { label: 'Mirim', min: 7, max: 9 },
  { label: 'Infantil', min: 10, max: 13 },
  { label: 'Infanto-Juvenil', min: 14, max: 15 },
  { label: 'Juvenil', min: 16, max: 17 },
  { label: 'Adulto', min: 18, max: 29 },
  { label: 'Master 1', min: 30, max: 35 },
  { label: 'Master 2', min: 36, max: 40 },
  { label: 'Master 3', min: 41, max: 45 },
  { label: 'Master 4', min: 46, max: 50 },
  { label: 'Master 5', min: 51, max: 55 },
  { label: 'Master 6', min: 56, max: 60 },
  { label: 'Master 7', min: 61, max: 999 },
];
const PESOS = ['Galo', 'Pluma', 'Pena', 'Leve', 'Médio', 'Meio-Pesado', 'Pesado', 'Super-Pesado', 'Pesadíssimo', 'Absoluto'];
const MODALIDADES = ['Gi (Com Kimono)', 'No-Gi (Sem Kimono)', 'Combo (Gi + No-Gi)'];

const formatBRL = (v) => `R$${Number(v || 0).toFixed(2)}`;

const describeCategoria = (cat) => {
  const parts = [cat.modalidade, cat.faixa, cat.categoriaEtaria, cat.peso].filter(Boolean);
  return parts.length ? parts.join(' / ') : 'Sem definição';
};

// ─── Toast ─────────────────────────────────────────────────────────────────
const TOAST_TYPES = { success: 'success', error: 'error', info: 'info' };

const Toast = ({ toasts, onRemove }) => (
  <div style={{
    position: 'fixed', bottom: '24px', right: '24px',
    zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '10px',
    maxWidth: '440px', width: '100%'
  }}>
    <AnimatePresence>
      {toasts.map((t) => (
        <motion.div
          key={t.id}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.22 }}
          style={{
            display: 'flex', alignItems: 'flex-start', gap: '14px',
            padding: '16px 20px',
            borderRadius: '12px',
            background: t.type === 'error'
              ? 'linear-gradient(135deg,#2a0a0a,#1a0000)'
              : t.type === 'info'
                ? 'linear-gradient(135deg,#0a1428,#0d1f3c)'
                : 'linear-gradient(135deg,#0a1f0a,#0d2a0d)',
            border: `1px solid ${t.type === 'error' ? '#c0392b55' : t.type === 'info' ? '#2980b955' : '#27ae6055'}`,
            boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
            cursor: 'pointer',
          }}
          onClick={() => onRemove(t.id)}
        >
          <div style={{ marginTop: '2px', flexShrink: 0 }}>
            {t.type === 'error' && <XCircle size={20} color="#e74c3c" />}
            {t.type === 'success' && <CheckCircle size={20} color="#2ecc71" />}
            {t.type === 'info' && <Info size={20} color="#3498db" />}
          </div>
          <div style={{ flex: 1, fontSize: '15px', lineHeight: '1.5', color: '#ddd' }}>
            {t.message}
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(t.id); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', padding: 0, marginTop: '2px' }}
          >
            <X size={16} />
          </button>
        </motion.div>
      ))}
    </AnimatePresence>
  </div>
);

// ─── useToast ──────────────────────────────────────────────────────────────
function useToast() {
  const [toasts, setToasts] = useState([]);
  const add = useCallback((message, type = TOAST_TYPES.success, duration = 4500) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  }, []);
  const remove = useCallback((id) => setToasts(prev => prev.filter(t => t.id !== id)), []);
  return { toasts, add, remove };
}

// ─── Painel de Categoria Inline ───────────────────────────────────────────
const CategoryModal = ({ atleta, onClose, onChange, valorBase, valorAbsoluto, valorCombo, registeredModalities = [], getSuggestedPrice }) => {
  const [local, setLocal] = useState({
    modalidade: atleta.categoria?.modalidade || '',
    faixa: atleta.categoria?.faixa || '',
    categoriaEtaria: atleta.categoria?.categoriaEtaria || '',
    peso: atleta.categoria?.peso || '',
  });

  const age = Number(atleta.idade) || 0;

  const isAgeAllowed = (cat) => {
    if (!age) return true;
    return age >= cat.min && age <= cat.max;
  };

  const handleSave = () => {
    if (!local.modalidade || !local.faixa || !local.categoriaEtaria || !local.peso) return;
    onChange(local);
    onClose();
  };

  const isValid = local.modalidade && local.faixa && local.categoriaEtaria && local.peso && isValidBeltForAge(local.faixa, age);
  
  const currentPricePreview = getSuggestedPrice
    ? getSuggestedPrice(local, atleta)
    : (local.modalidade?.includes('Combo') ? valorBase + valorAbsoluto : valorBase);

  const fieldStyle = {
    display: 'block', fontSize: '14px', color: '#888', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 'bold'
  };

  const selectStyle = {
    width: '100%', padding: '12px 14px', borderRadius: '10px',
    background: '#111', border: '1px solid #333', color: '#fff', fontSize: '16px'
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '12px',
        padding: '20px',
        marginTop: '12px',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr 1fr auto',
        gap: '12px',
        alignItems: 'flex-end',
      }}
    >
      <div>
        <label style={fieldStyle}>Modalidade</label>
        <select value={local.modalidade} onChange={e => setLocal(p => ({ ...p, modalidade: e.target.value }))} style={selectStyle}>
          <option value="">Selecione</option>
          {MODALIDADES.filter(m => (valorCombo > 0 || m.includes('Gi (Com Kimono)'))).map(m => {
            const mUpper = m.toUpperCase();
            let isRegistered = false;
            if (mUpper.includes('GI') && !mUpper.includes('NO-GI')) {
              if (registeredModalities.includes('GI')) isRegistered = true;
            }
            if (mUpper.includes('NO-GI')) {
              if (registeredModalities.includes('NO-GI')) isRegistered = true;
            }
            if (mUpper.includes('COMBO')) {
              if (registeredModalities.includes('GI') || registeredModalities.includes('NO-GI')) isRegistered = true;
            }
            return (
              <option key={m} value={m} disabled={isRegistered}>
                {m} {isRegistered ? '(Já inscrito)' : ''}
              </option>
            );
          })}
        </select>
      </div>

      <div>
        <label style={fieldStyle}>Faixa</label>
        <select value={local.faixa} onChange={e => setLocal(p => ({ ...p, faixa: e.target.value }))} style={selectStyle}>
          <option value="">Selecione</option>
          {getAvailableBeltsForAge(age).map(f => <option key={f} value={f}>{f}</option>)}
        </select>
      </div>

      <div>
        <label style={fieldStyle}>Categoria</label>
        <select value={local.categoriaEtaria} onChange={e => setLocal(p => ({ ...p, categoriaEtaria: e.target.value }))} style={selectStyle}>
          <option value="">Selecione</option>
          {CATEGORIAS_ETARIAS.map(c => (
            <option key={c.label} value={c.label} disabled={age > 0 && !isAgeAllowed(c)}>
              {c.label} {age > 0 && !isAgeAllowed(c) ? `(${c.min}-${c.max === 999 ? '61+' : c.max}a)` : ''}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label style={fieldStyle}>Peso</label>
        <select value={local.peso} onChange={e => setLocal(p => ({ ...p, peso: e.target.value }))} style={selectStyle}>
          <option value="">Selecione</option>
          {PESOS.filter(p => (valorAbsoluto > 0 || p !== 'Absoluto')).map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={handleSave}
          disabled={!isValid}
          style={{
            padding: '12px 20px', borderRadius: '10px', border: 'none', cursor: 'pointer',
            background: !isValid ? '#1a1a1a' : 'var(--brand-primary, #00c2cb)',
            color: !isValid ? '#555' : '#000',
            fontWeight: '700', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px',
            transition: 'all 0.2s', whiteSpace: 'nowrap'
          }}
        >
          <Check size={16} /> Salvar ({formatBRL(currentPricePreview)})
        </button>
        <button
          onClick={onClose}
          style={{
            padding: '10px 12px', borderRadius: '8px', border: '1px solid #333', cursor: 'pointer',
            background: 'transparent', color: '#888', fontSize: '14px',
          }}
        >
          <X size={16} />
        </button>
      </div>
    </motion.div>
  );
};

// ─── Linha de Atleta ──────────────────────────────────────────────────────
const AtletaRow = ({ atleta, selecionado, onToggle, onCategoria, onCheckin, valorBase, valorAbsoluto, valorCombo, eventRegistrations = [], getSuggestedPrice }) => {
  const [expandido, setExpandido] = useState(false);

  const categoriaStr = describeCategoria(atleta.categoria || {});
  const temCategoria = atleta.categoria?.modalidade && atleta.categoria?.faixa && atleta.categoria?.categoriaEtaria && atleta.categoria?.peso;
  const temCheckin = atleta.checkin;

  const athleteRegistrations = useMemo(() => {
    return eventRegistrations.filter(r => String(r.profileId) === String(atleta.id) || String(r.memberProfileId) === String(atleta.id));
  }, [eventRegistrations, atleta.id]);

  const registeredModalities = useMemo(() => {
    const mods = new Set();
    athleteRegistrations.forEach(r => {
      if (!r.modalidade) return;
      const mUpper = r.modalidade.toUpperCase();
      if (mUpper === 'GI' || mUpper.includes('GI (COM KIMONO)') || (mUpper.includes('GI') && !mUpper.includes('NO-GI'))) mods.add('GI');
      if (mUpper === 'NO-GI' || mUpper.includes('NO-GI') || mUpper.includes('SEM KIMONO')) mods.add('NO-GI');
      if (mUpper.includes('COMBO') || mUpper.includes('GI & NO-GI')) {
        mods.add('GI');
        mods.add('NO-GI');
      }
    });
    return Array.from(mods);
  }, [athleteRegistrations]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        border: selecionado
          ? '1px solid var(--brand-primary, #00c2cb)88'
          : '1px solid rgba(255,255,255,0.07)',
        borderRadius: '12px',
        background: selecionado
          ? 'linear-gradient(135deg, rgba(0,194,203,0.08), rgba(0,194,203,0.03))'
          : 'rgba(255,255,255,0.02)',
        marginBottom: '10px',
        overflow: 'hidden',
        transition: 'all 0.2s',
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.01, backgroundColor: selecionado ? 'rgba(0,194,203,0.06)' : 'rgba(255,255,255,0.04)' }}
        style={{
          display: 'grid',
          gridTemplateColumns: '50px 1.6fr 1.5fr 150px 140px 60px',
          alignItems: 'center',
          gap: '20px',
          padding: '20px 24px',
          marginBottom: '12px',
          border: selecionado ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(255,255,255,0.06)',
          borderRadius: '16px',
          background: selecionado ? 'rgba(255,255,255,0.04)' : 'rgba(18, 20, 26, 0.65)',
          backdropFilter: 'blur(10px)',
          boxShadow: selecionado ? '0 8px 30px rgba(0,0,0,0.4)' : '0 4px 15px rgba(0,0,0,0.2)',
          transition: 'all 0.2s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <input
              type="checkbox"
              checked={selecionado}
              onChange={onToggle}
              style={{ display: 'none' }}
              disabled={temCheckin || (window.isRegistrationClosed)} 
            />
            <div style={{
              width: '22px', height: '22px', borderRadius: '6px',
              border: selecionado ? '2px solid #ffffff' : '2px solid #555',
              background: selecionado ? '#ffffff' : 'rgba(0,0,0,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s',
              opacity: temCheckin ? 0.5 : 1
            }}>
              {selecionado && <Check size={14} color="#000" strokeWidth={3} />}
            </div>
          </label>
        </div>

        <div>
          <div style={{ fontWeight: '800', fontSize: '18px', color: '#ffffff', letterSpacing: '0.01em' }}>{atleta.nome}</div>
          <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '5px', display: 'flex', gap: '10px', fontWeight: '500' }}>
            {atleta.idade ? <span style={{ background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '4px' }}>{atleta.idade} anos</span> : null}
            {atleta.graduacao ? <span style={{ background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '4px' }}>Faixa {atleta.graduacao}</span> : null}
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontSize: '13px',
            color: temCategoria ? '#f1f5f9' : '#64748b',
            fontWeight: temCategoria ? '600' : '400',
            background: temCategoria ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)',
            padding: '6px 14px', borderRadius: '10px', display: 'inline-block',
            border: temCategoria ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(255,255,255,0.04)'
          }}>
            {categoriaStr}
          </div>
        </div>

        <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
          <span style={{ fontSize: '18px', fontWeight: '800', color: '#ffffff' }}>
            {formatBRL(atleta.valor)}
          </span>
        </div>

        <div style={{ textAlign: 'center' }}>
          {!selecionado ? (
            <span style={{ color: '#475569', fontSize: '14px', fontWeight: '500' }}>—</span>
          ) : !temCategoria ? (
            <span style={{
              background: 'rgba(255, 255, 255, 0.05)', color: '#fbbf24', border: '1px solid rgba(251, 191, 36, 0.25)',
              padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', letterSpacing: '0.04em'
            }}>PENDENTE</span>
          ) : temCheckin ? (
            <span style={{
              background: 'rgba(255, 255, 255, 0.05)', color: '#94a3b8', border: '1px solid rgba(255, 255, 255, 0.1)',
              padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', letterSpacing: '0.04em'
            }}>ENVIADO</span>
          ) : (
            <span style={{
              background: 'rgba(255, 255, 255, 0.1)', color: '#ffffff', border: '1px solid rgba(255, 255, 255, 0.2)',
              padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', letterSpacing: '0.04em'
            }}>PRONTO</span>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          {selecionado && !temCheckin && (
            <button
              onClick={() => setExpandido(!expandido)}
              style={{
                background: expandido ? 'var(--brand-primary)' : 'rgba(255,255,255,0.05)',
                border: 'none', cursor: 'pointer',
                color: expandido ? '#000' : '#888',
                borderRadius: '10px', padding: '8px',
                display: 'flex', alignItems: 'center',
                transition: 'all 0.2s',
                boxShadow: expandido ? '0 0 15px rgba(0,194,203,0.4)' : 'none'
              }}
            >
              {expandido ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
          )}
        </div>
      </motion.div>

      <AnimatePresence>
        {selecionado && expandido && !temCheckin && (
          <div style={{ padding: '0 20px 18px' }}>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
              <button
                onClick={() => setExpandido(!expandido)}
                style={{
                  padding: '10px 20px', borderRadius: '10px', border: '1px solid #444',
                background: 'rgba(255,255,255,0.05)', color: '#bbb',
                fontSize: '15px', cursor: 'pointer', fontWeight: '600',
                display: 'flex', alignItems: 'center', gap: '8px',
                transition: 'all 0.15s',
                }}
              >
                <Tag size={15} /> {temCategoria ? 'Alterar Categoria' : 'Definir Categoria'}
              </button>
            </div>
            {expandido && (
            <CategoryModal
              atleta={atleta}
              valorBase={valorBase}
              valorAbsoluto={valorAbsoluto}
              valorCombo={valorCombo}
              registeredModalities={registeredModalities}
              getSuggestedPrice={getSuggestedPrice}
              onChange={onCategoria}
              onClose={() => setExpandido(false)}
            />
          )}</div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ========================================== //
//  MODAL DE CHECKOUT PIX E COMPROVANTE       //
// ========================================== //
// Este componente lida com a geração do pagamento (QR Code Pix)
// para a equipe toda em lote.
const PixCheckoutModal = ({ onConfirm, onCancel, total, isLoading, error }) => {
  const [proofFile, setProofFile] = useState(null);
  const [proofError, setProofError] = useState('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [copied, setCopied] = useState(false);

  // Payload PIX Fictício / Padrão (O campeonatoAtivo deveria vir com pixKey, usaremos um placeholder)
  const pixKey = "financeiro@genesisesportes.com.br";
  const pixPayloadStr = generatePixPayload({
    key: pixKey,
    name: 'GENESIS RANK',
    city: 'BRASILIA',
    amount: total,
    reference: 'EQUIPE'
  });

  useEffect(() => {
    if (pixPayloadStr) {
      QRCode.toDataURL(pixPayloadStr, { width: 300, margin: 2, color: { dark: '#000000', light: '#ffffff' } })
        .then(setQrCodeDataUrl)
        .catch(console.error);
    }
  }, [pixPayloadStr]);

  const handleCopy = () => {
    navigator.clipboard.writeText(pixPayloadStr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      setProofFile(null);
      setProofError('');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setProofError('O comprovante deve ter no máximo 5MB.');
      setProofFile(null);
      return;
    }
    setProofError('');
    setProofFile(file);
  };

  const handleFinish = async () => {
    onConfirm(null);
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px'
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        style={{
          background: '#111', border: '1px solid #333', borderRadius: '16px',
          width: '100%', maxWidth: '500px', overflow: 'hidden'
        }}
      >
        <div style={{ padding: '24px', borderBottom: '1px solid #222', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '20px', color: '#f0f0f0' }}>Pagamento da Equipe</h3>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}><X size={20}/></button>
        </div>

        <div style={{ padding: '24px' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ fontSize: '14px', color: '#888', marginBottom: '8px' }}>Valor Total da Equipe</div>
            <div style={{ fontSize: '36px', fontWeight: '800', color: '#00c2cb' }}>{formatBRL(total)}</div>
          </div>

          <p style={{ color: '#aaa', fontSize: '14px', textAlign: 'center', marginBottom: '24px', lineHeight: '1.5' }}>
            Ao clicar abaixo, a inscrição da sua equipe será registrada e você será direcionado para o **Mercado Pago** para concluir o pagamento com PIX, Cartão ou Boleto.
          </p>

          {error && (
            <div style={{ padding: '12px', background: 'rgba(231,76,60,0.1)', border: '1px solid #e74c3c55', color: '#e74c3c', borderRadius: '8px', fontSize: '14px', marginBottom: '20px' }}>
              {error}
            </div>
          )}

          <button
            onClick={handleFinish}
            disabled={isLoading}
            style={{
              width: '100%', padding: '16px', borderRadius: '12px', border: 'none',
              background: 'linear-gradient(135deg, var(--brand-primary, #00c2cb), #009ba3)',
              color: '#000', fontWeight: '800', fontSize: '16px', cursor: 'pointer',
              opacity: isLoading ? 0.7 : 1
            }}
          >
            {isLoading ? 'Gerando Checkout...' : 'Ir para o Mercado Pago ▶'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const SuccessModal = ({ onConsult, onBack }) => (
  <div style={{
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px'
  }}>
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
      style={{
        background: '#111', border: '1px solid #2ecc71', borderRadius: '16px',
        width: '100%', maxWidth: '400px', overflow: 'hidden', textAlign: 'center', padding: '32px 24px'
      }}
    >
      <CheckCircle size={56} color="#2ecc71" style={{ marginBottom: '16px' }} />
      <h3 style={{ margin: '0 0 12px', fontSize: '22px', color: '#f0f0f0' }}>Pagamento Realizado!</h3>
      <p style={{ color: '#aaa', fontSize: '15px', lineHeight: 1.5, marginBottom: '24px' }}>
        As inscrições da equipe foram enviadas com sucesso.
      </p>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <button
          onClick={onConsult}
          style={{
            width: '100%', padding: '14px', borderRadius: '10px', border: 'none',
            background: 'linear-gradient(135deg, var(--brand-primary, #00c2cb), #009ba3)',
            color: '#000', fontWeight: '800', fontSize: '15px', cursor: 'pointer',
          }}
        >
          Consultar Inscrições
        </button>
        <button
          onClick={onBack}
          style={{
            width: '100%', padding: '14px', borderRadius: '10px', border: '1px solid #444',
            background: 'transparent', color: '#ccc', fontWeight: '600', fontSize: '15px', cursor: 'pointer',
          }}
        >
          Voltar para o Painel
        </button>
      </div>
    </motion.div>
  </div>
);

// ─── Componente Principal ─────────────────────────────────────────────────
export default function GerenteTreinador({ usuarioLogado, campeonatoAtivo, academyAthletes = [], addAthlete, academyName }) {
  const { toasts, add: addToast, remove: removeToast } = useToast();
  const { athletes, removeAthlete } = useStore();
  const [showPixModal, setShowPixModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const eventRegistrations = useMemo(() => {
    return athletes.filter(a => String(a.eventId) === String(campeonatoAtivo?.id));
  }, [athletes, campeonatoAtivo]);

  // Limpeza de inscrições travadas (que falharam antes) para permitir tentar novamente
  useEffect(() => {
    const stuckAthletes = athletes.filter(a => a.status === 'pending_sync');
    if (stuckAthletes.length > 0 && typeof removeAthlete === 'function') {
      setTimeout(() => {
        stuckAthletes.forEach(a => removeAthlete(a.id));
      }, 100);
    }
  }, [athletes, removeAthlete]);

  const isProfessor = usuarioLogado.isProfessor || usuarioLogado.isAdmin;
  const temAcademia = !!usuarioLogado.academiaId;

  if (!isProfessor || !temAcademia) {
    return (
      <div style={{
        background: 'linear-gradient(135deg,#1a0a0a,#0f0a00)', border: '1px solid #c0392b44',
        borderRadius: '16px', padding: '40px', textAlign: 'center', color: '#e74c3c',
      }}>
        <AlertTriangle size={48} style={{ marginBottom: '16px', opacity: 0.8 }} />
        <h3 style={{ margin: '0 0 10px', fontSize: '20px' }}>{!isProfessor ? 'Acesso restrito a professores' : 'Academia não vinculada'}</h3>
        <p style={{ color: '#888', margin: 0, fontSize: '15px' }}>
          {!isProfessor ? 'Apenas professores e administradores podem gerenciar inscrições.' : 'Você não possui uma academia vinculada. Acesse "Academia" para cadastrar.'}
        </p>
      </div>
    );
  }

  const { base: valorBase, absoluteFee: valorAbsoluto, combo: valorCombo } = useMemo(() => {
    return resolveAthleteEventPrice({ event: campeonatoAtivo });
  }, [campeonatoAtivo]);

  const isRegistrationClosed = useMemo(() => {
    if (!campeonatoAtivo) return true;
    const ro = campeonatoAtivo.registrationOpen;
    if (ro === false || ro === 'false' || ro === 'fechado' || ro === 'closed' || ro === '0' || ro === 'nao' || ro === 'não') {
      return true;
    }
    const rawDate = campeonatoAtivo.date;
    if (rawDate) {
      const d = new Date(rawDate);
      if (!Number.isNaN(d.getTime()) && d.getTime() < Date.now()) {
        return true;
      }
    }
    return false;
  }, [campeonatoAtivo]);

  // attach to window for deep children if needed or pass as prop
  window.isRegistrationClosed = isRegistrationClosed;

  const getSuggestedPrice = (cat, athlete) => {
    if (!cat || !cat.modalidade) {
      const { base } = resolveAthleteEventPrice({ event: campeonatoAtivo, athlete, modalitiesCount: 1 });
      return base;
    }
    const isCombo = cat.modalidade.includes('Combo') || (cat.modalidade.includes('Gi') && cat.modalidade.includes('No-Gi'));
    const isAbsolute = cat.peso === 'Absoluto';
    const { total } = resolveAthleteEventPrice({
      event: campeonatoAtivo,
      athlete,
      modalitiesCount: isCombo ? 2 : 1,
      absolute: isAbsolute
    });
    return total;
  };

  // Estado dos atletas do roster
  const [roster, setRoster] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterFaixa, setFilterFaixa] = useState('');
  const [filterCategoria, setFilterCategoria] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sortBy, setSortBy] = useState('nome_asc');

  useEffect(() => {
    setRoster(
      academyAthletes.map(a => ({
        id: a.id,
        nome: a.fullName || [a.firstName, a.lastName].filter(Boolean).join(' ') || a.name || 'Atleta',
        idade: a.age || '',
        graduacao: a.belt || '',
        categoria: {
          modalidade: '',
          faixa: a.belt || '',
          categoriaEtaria: a.categoria || '',
          peso: a.weight || '',
        },
        genero: a.gender || a.genero || 'Masculino',
        valor: getSuggestedPrice(null, a),
        checkin: false, // Usado como flag de "Já submetido"
        selecionado: false,
      }))
    );
  }, [academyAthletes, campeonatoAtivo]);

  // Toggles
  const toggleSelecionado = useCallback((id) => {
    setRoster(prev => {
      const atleta = prev.find(a => a.id === id);
      if (!atleta || atleta.checkin || isRegistrationClosed) return prev;
      const novoEstado = !atleta.selecionado;
      const cat = describeCategoria(atleta.categoria || {});
      const valor = atleta.valor;

      if (novoEstado) {
        addToast(`Aluno ${atleta.nome} selecionado. Categoria: ${cat === 'Sem definição' ? 'Sem definição' : cat}. Valor total da inscrição: ${formatBRL(valor)}`, TOAST_TYPES.success);
      } else {
        addToast(`Aluno ${atleta.nome} desmarcado.`, TOAST_TYPES.info);
      }

      return prev.map(a => a.id === id ? { ...a, selecionado: novoEstado } : a);
    });
  }, [addToast]);

  const atualizarCategoria = useCallback((id, novaCategoria) => {
    setRoster(prev => {
      const atleta = prev.find(a => a.id === id);
      if (!atleta) return prev;
      const cat = describeCategoria(novaCategoria);
      const athData = academyAthletes.find(ath => ath.id === atleta.id) || atleta;
      const novoValor = getSuggestedPrice(novaCategoria, athData);
      addToast(`Aluno ${atleta.nome} — categoria definida: ${cat}. Valor total da inscrição: ${formatBRL(novoValor)}`, TOAST_TYPES.success);
      return prev.map(a => a.id === id ? { ...a, categoria: novaCategoria, valor: novoValor } : a);
    });
  }, [addToast, getSuggestedPrice, academyAthletes]);

  const atualizarValor = useCallback((id, novoValor) => {
    setRoster(prev => {
      const atleta = prev.find(a => a.id === id);
      if (!atleta) return prev;
      addToast(`Valor atualizado para ${atleta.nome}. Valor total da inscrição: ${formatBRL(novoValor)}`, TOAST_TYPES.info);
      return prev.map(a => a.id === id ? { ...a, valor: novoValor } : a);
    });
  }, [addToast]);

  const resetarTodos = useCallback(() => {
    setRoster(prev => prev.map(a => {
      if (a.checkin) return a;
      const athData = academyAthletes.find(ath => ath.id === a.id) || a;
      return { ...a, selecionado: false, valor: getSuggestedPrice(null, athData) };
    }));
    addToast('Seleções limpas (exceto alunos já enviados).', TOAST_TYPES.info);
  }, [addToast, getSuggestedPrice, academyAthletes]);

  const filteredRoster = useMemo(() => {
    let result = [...roster];
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter(a => (a.nome || '').toLowerCase().includes(q) || String(a.id || '').toLowerCase().includes(q));
    }
    if (filterFaixa) {
      result = result.filter(a => (a.categoria?.faixa || a.graduacao || '').toLowerCase() === filterFaixa.toLowerCase());
    }
    if (filterCategoria) {
      result = result.filter(a => (a.categoria?.categoriaEtaria || '').toLowerCase() === filterCategoria.toLowerCase());
    }
    if (filterStatus) {
      if (filterStatus === 'enviado') result = result.filter(a => a.checkin);
      if (filterStatus === 'pendente') result = result.filter(a => !a.categoria?.modalidade || !a.categoria?.faixa);
      if (filterStatus === 'pronto') result = result.filter(a => a.categoria?.modalidade && a.categoria?.faixa && !a.checkin);
    }
    if (sortBy === 'nome_asc') {
      result.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
    } else if (sortBy === 'nome_desc') {
      result.sort((a, b) => (b.nome || '').localeCompare(a.nome || ''));
    } else if (sortBy === 'idade_asc') {
      result.sort((a, b) => (Number(a.idade) || 0) - (Number(b.idade) || 0));
    } else if (sortBy === 'idade_desc') {
      result.sort((a, b) => (Number(b.idade) || 0) - (Number(a.idade) || 0));
    } else if (sortBy === 'categoria') {
      result.sort((a, b) => (a.categoria?.categoriaEtaria || '').localeCompare(b.categoria?.categoriaEtaria || ''));
    }
    return result;
  }, [roster, searchTerm, filterFaixa, filterCategoria, filterStatus, sortBy]);

  const toggleSelectAllFiltered = useCallback(() => {
    const elegiveis = filteredRoster.filter(a => !a.checkin);
    const todosJaSelecionados = elegiveis.length > 0 && elegiveis.every(a => a.selecionado);
    setRoster(prev => prev.map(a => {
      if (a.checkin) return a;
      const isFiltered = filteredRoster.some(f => f.id === a.id);
      if (isFiltered) {
        return { ...a, selecionado: !todosJaSelecionados };
      }
      return a;
    }));
  }, [filteredRoster]);

  // Cálculos
  const atletasSelecionados = useMemo(() => roster.filter(a => a.selecionado && !a.checkin), [roster]);
  const totalGeral = useMemo(() => atletasSelecionados.reduce((s, a) => s + (a.valor || 0), 0), [atletasSelecionados]);
  const semCategoria = useMemo(() => atletasSelecionados.filter(a => !a.categoria?.modalidade || !a.categoria?.faixa).length, [atletasSelecionados]);
  const jaEnviados = useMemo(() => roster.filter(a => a.checkin).length, [roster]);

  const handleCheckoutSubmit = async (proofFile) => {
    setIsSubmitting(true);
    setSubmitError('');

    try {
      let proofDataUrl = '';
      if (proofFile) {
        if (proofFile.type.startsWith('image/')) {
          proofDataUrl = await compressImage(proofFile);
        } else {
          const reader = new FileReader();
          proofDataUrl = await new Promise((res, rej) => { reader.onload = () => res(reader.result); reader.onerror = rej; reader.readAsDataURL(proofFile); });
        }
      }

      // Redirecionar lote da equipe para o Mercado Pago
      const regIds = [];
      for (const atleta of atletasSelecionados) {
        const regId = `reg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        regIds.push(regId);
        const payload = {
          id: regId,
          eventId: campeonatoAtivo.id,
          eventName: campeonatoAtivo.nome,
          nome: atleta.nome,
          profileId: atleta.id,
          academia: academyName || usuarioLogado.academiaId,
          faixa: atleta.categoria.faixa,
          peso: atleta.categoria.peso,
          categoria: atleta.categoria.categoriaEtaria,
          modalidade: atleta.categoria.modalidade,
          genero: atleta.genero || 'Masculino',
          price: atleta.valor,
          notes: JSON.stringify({ equipeLote: true, totalAtletas: atletasSelecionados.length }),
          status: 'PENDING'
        };
        
        try {
          if (typeof addAthlete === 'function') {
            addAthlete(payload);
          }
        } catch (e) {
          console.warn('Falha ao adicionar atleta ao cache local:', e);
        }

        try {
          await publicRegistrationService.register(payload);
        } catch (e) {
          console.warn(`Sync backend falhou para lote ${payload.id} - offline mode:`, e);
        }
      }

      setRoster(prev => prev.map(a => atletasSelecionados.find(s => s.id === a.id) ? { ...a, checkin: true, selecionado: false } : a));
      
      // Chamada Checkout Pro Mercado Pago para o lote da equipe
      if (totalGeral > 0) {
        const registrationIds = regIds.join(',');
        const athleteName = `Equipe ${academyName || 'Academia'} (${atletasSelecionados.length} Atletas)`;
        const athleteEmail = usuarioLogado?.email || (typeof usuarioLogado?.username === 'string' && usuarioLogado.username.includes('@') ? usuarioLogado.username : 'contato@genesisesportes.com.br');
        const data = await publicRegistrationService.createCheckoutSession({
          registrationIds,
          athleteName,
          athleteEmail,
          amount: totalGeral
        });
        
        if (data?.url) {
          window.location.href = data.url;
          return;
        }
      }

      setShowPixModal(false);
      setShowSuccessModal(true);

    } catch (err) {
      setSubmitError(err.message || 'Erro ao processar as inscrições. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (roster.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        style={{ 
          textAlign: 'center', 
          padding: '80px 20px', 
          background: 'rgba(15, 23, 42, 0.4)', 
          backdropFilter: 'blur(16px)',
          borderRadius: '24px', 
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '24px',
          maxWidth: '600px',
          margin: '0 auto'
        }}
      >
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
          style={{
            width: '96px',
            height: '96px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(36, 120, 255, 0.1), rgba(36, 120, 255, 0.02))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(36, 120, 255, 0.2)',
            boxShadow: '0 0 30px rgba(36, 120, 255, 0.1)'
          }}
        >
          <Users size={40} style={{ color: '#2478ff' }} />
        </motion.div>
        
        <div>
          <h3 style={{ color: '#fff', fontSize: '1.5rem', fontWeight: '700', marginBottom: '12px', letterSpacing: '-0.5px' }}>
            Nenhum aluno vinculado
          </h3>
          <p style={{ color: '#94a3b8', fontSize: '1.1rem', lineHeight: '1.6', margin: 0, maxWidth: '400px' }}>
            Para gerenciar inscrições neste campeonato, você precisa primeiro vincular alunos à sua academia.
          </p>
        </div>

        <motion.a 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          href="/minha-conta"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'linear-gradient(135deg, #2478ff 0%, #1e40af 100%)',
            color: '#fff',
            padding: '14px 28px',
            borderRadius: '12px',
            fontWeight: '600',
            fontSize: '1rem',
            textDecoration: 'none',
            boxShadow: '0 4px 20px rgba(36, 120, 255, 0.4)',
            marginTop: '12px'
          }}
        >
          <UserPlus size={18} />
          Adicionar Alunos Agora
        </motion.a>
      </motion.div>
    );
  }

  return (
    <>
      <Toast toasts={toasts} onRemove={removeToast} />
      {showPixModal && <PixCheckoutModal total={totalGeral} onCancel={() => setShowPixModal(false)} onConfirm={handleCheckoutSubmit} isLoading={isSubmitting} error={submitError} />}
      {showSuccessModal && (
        <SuccessModal 
          onConsult={() => { window.location.href = `/eventos/${campeonatoAtivo.id}?tab=athletes`; }} 
          onBack={() => setShowSuccessModal(false)} 
        />
      )}

      {/* Cabeçalho do painel */}
      {campeonatoAtivo && (
        <div style={{
          background: 'rgba(18, 20, 26, 0.65)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
          borderRadius: '20px', padding: '24px 28px', marginBottom: '32px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '24px',
        }}>
          <div>
            <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px', fontWeight: '700' }}>
              Campeonato Ativo
            </div>
            <div style={{ fontSize: '24px', fontWeight: '800', color: '#ffffff', letterSpacing: '-0.01em' }}>{campeonatoAtivo.nome}</div>
            <div style={{ fontSize: '14px', color: '#94a3b8', marginTop: '6px', fontWeight: '500' }}>
              Taxa base: <strong style={{ color: '#ffffff' }}>{formatBRL(valorBase)}</strong> <span style={{ margin: '0 6px', color: '#444' }}>|</span> Absoluto: <strong style={{ color: '#ffffff' }}>+{formatBRL(valorAbsoluto)}</strong>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {[
              { label: 'Alunos', value: roster.length, color: '#94a3b8', bg: 'rgba(255,255,255,0.03)' },
              { label: 'Selecionados', value: atletasSelecionados.length, color: '#ffffff', bg: 'rgba(255,255,255,0.08)' },
              { label: 'Enviados', value: jaEnviados, color: '#94a3b8', bg: 'rgba(255,255,255,0.03)' },
              { label: 'Total', value: formatBRL(totalGeral), color: '#ffffff', bg: 'rgba(255,255,255,0.08)' },
            ].map(s => (
              <div key={s.label} style={{
                textAlign: 'center',
                background: s.bg,
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '12px',
                padding: '12px 18px',
                minWidth: '100px'
              }}>
                <div style={{ fontSize: '22px', fontWeight: '800', color: s.color }}>{s.value}</div>
                <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '4px', fontWeight: '700' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alertas */}
      {isRegistrationClosed && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)',
          borderRadius: '12px', padding: '14px 20px', marginBottom: '20px',
          display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', color: '#f87171', fontWeight: '600'
        }}>
          <AlertTriangle size={18} />
          As inscrições para este campeonato estão encerradas. Não é possível adicionar novos alunos.
        </div>
      )}

      {!isRegistrationClosed && semCategoria > 0 && (
        <div style={{
          background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)',
          borderRadius: '12px', padding: '14px 20px', marginBottom: '20px',
          display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', color: '#fbbf24', fontWeight: '600'
        }}>
          <AlertTriangle size={18} />
          {semCategoria} aluno{semCategoria > 1 ? 's' : ''} selecionado{semCategoria > 1 ? 's' : ''} sem categoria definida. Clique no atleta para expandir e definir.
        </div>
      )}

      {/* Barra de Filtros e Busca */}
      <div style={{
        background: 'rgba(18, 20, 26, 0.5)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '16px',
        padding: '16px 20px',
        marginBottom: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px'
      }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Busca por Nome / ID */}
          <div style={{ flex: '1 1 240px', position: 'relative', minWidth: '220px' }}>
            <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' }} />
            <input
              type="text"
              placeholder="Buscar atleta por nome ou ID..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '11px 14px 11px 40px',
                borderRadius: '10px',
                background: '#111318',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#fff',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={e => e.target.style.borderColor = '#ffffff'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}>
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filtro por Faixa */}
          <div style={{ flex: '0 1 150px', minWidth: '140px' }}>
            <select
              value={filterFaixa}
              onChange={e => setFilterFaixa(e.target.value)}
              style={{
                width: '100%', padding: '11px 14px', borderRadius: '10px',
                background: '#111318', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '14px', cursor: 'pointer'
              }}
            >
              <option value="">Todas as faixas</option>
              {FAIXAS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>

          {/* Filtro por Categoria */}
          <div style={{ flex: '0 1 160px', minWidth: '150px' }}>
            <select
              value={filterCategoria}
              onChange={e => setFilterCategoria(e.target.value)}
              style={{
                width: '100%', padding: '11px 14px', borderRadius: '10px',
                background: '#111318', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '14px', cursor: 'pointer'
              }}
            >
              <option value="">Todas as categorias</option>
              {CATEGORIAS_ETARIAS.map(c => <option key={c.label} value={c.label}>{c.label}</option>)}
            </select>
          </div>

          {/* Filtro por Status */}
          <div style={{ flex: '0 1 140px', minWidth: '130px' }}>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              style={{
                width: '100%', padding: '11px 14px', borderRadius: '10px',
                background: '#111318', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '14px', cursor: 'pointer'
              }}
            >
              <option value="">Todos os status</option>
              <option value="pronto">Pronto</option>
              <option value="pendente">Pendente</option>
              <option value="enviado">Enviado</option>
            </select>
          </div>

          {/* Ordenação */}
          <div style={{ flex: '0 1 170px', minWidth: '160px' }}>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              style={{
                width: '100%', padding: '11px 14px', borderRadius: '10px',
                background: '#111318', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '14px', cursor: 'pointer'
              }}
            >
              <option value="nome_asc">Nome (A - Z)</option>
              <option value="nome_desc">Nome (Z - A)</option>
              <option value="idade_asc">Idade (Crescente)</option>
              <option value="idade_desc">Idade (Decrescente)</option>
              <option value="categoria">Categoria</option>
            </select>
          </div>
        </div>

        {/* Ações globais e contadores */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '500' }}>
            Exibindo <strong style={{ color: '#fff', fontWeight: '700' }}>{filteredRoster.length}</strong> de <strong style={{ color: '#fff' }}>{roster.length}</strong> alunos na academia
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={toggleSelectAllFiltered}
              disabled={isRegistrationClosed || filteredRoster.length === 0}
              style={{
                padding: '8px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.15)',
                background: 'rgba(255,255,255,0.06)', color: '#ffffff', fontSize: '13px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600', transition: 'all 0.2s',
                opacity: (isRegistrationClosed || filteredRoster.length === 0) ? 0.5 : 1
              }}
            >
              <Check size={14} /> Selecionar Filtrados
            </button>
            <button
              onClick={resetarTodos}
              style={{
                padding: '8px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)',
                background: 'transparent', color: '#94a3b8', fontSize: '13px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600', transition: 'all 0.2s'
              }}
            >
              <RotateCcw size={14} /> Limpar seleção
            </button>
          </div>
        </div>
      </div>

      {/* Lista de atletas */}
      <div>
        {filteredRoster.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '40px 20px', background: 'rgba(255,255,255,0.02)',
            borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.1)', color: '#888'
          }}>
            <p style={{ margin: 0, fontSize: '16px' }}>Nenhum atleta encontrado com os filtros selecionados.</p>
          </div>
        ) : (
          filteredRoster.map(atleta => (
            <AtletaRow
              key={atleta.id}
              atleta={atleta}
              selecionado={atleta.selecionado}
              valorBase={valorBase}
              valorAbsoluto={valorAbsoluto}
              valorCombo={valorCombo}
              getSuggestedPrice={getSuggestedPrice}
              onToggle={() => toggleSelecionado(atleta.id)}
              onCategoria={(novaCategoria) => {
                if (novaCategoria && typeof novaCategoria === 'object' && novaCategoria.faixa) {
                  atualizarCategoria(atleta.id, novaCategoria);
                }
              }}
            />
          ))
        )}
      </div>

      {/* Rodapé de checkout */}
      {!isRegistrationClosed && atletasSelecionados.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          style={{
            marginTop: '32px', background: 'rgba(18, 20, 26, 0.95)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,255,255,0.12)', borderRadius: '18px', padding: '24px 28px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
          }}
        >
          <div>
            <div style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '4px', fontWeight: '600' }}>
              {atletasSelecionados.length} atleta{atletasSelecionados.length > 1 ? 's' : ''} pronto{atletasSelecionados.length > 1 ? 's' : ''} para envio
            </div>
            <div style={{ fontSize: '28px', fontWeight: '800', color: '#ffffff' }}>{formatBRL(totalGeral)}</div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Total unificado da equipe</div>
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              style={{
                padding: '14px 26px', borderRadius: '12px', border: 'none',
                background: '#ffffff',
                color: '#000000', fontWeight: '800', fontSize: '15px',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
                opacity: semCategoria > 0 ? 0.5 : 1,
                transition: 'all 0.2s'
              }}
              disabled={semCategoria > 0}
              title={semCategoria > 0 ? 'Defina a categoria de todos os atletas primeiro' : ''}
              onClick={() => setShowPixModal(true)}
            >
              <CreditCard size={18} /> Pagar Inscrições da Equipe
            </button>
          </div>
        </motion.div>
      )}
    </>
  );
}
