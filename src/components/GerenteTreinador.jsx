import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle, XCircle, Info, UserCheck, Users, ChevronDown,
  ChevronUp, Edit3, Tag, ShieldCheck, AlertTriangle,
  X, Check, RotateCcw, CreditCard, Camera, Copy, AlertCircle
} from 'lucide-react';
import QRCode from 'qrcode';
import { publicRegistrationService } from '../services/publicRegistrationService';
import { generatePixPayload } from '../utils/pix';
import { compressImage } from '../utils/imageUtils';
import { useStore } from '../hooks/useStore';
import { resolveAthleteEventPrice } from '../utils/eventPricing';

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
const CategoryModal = ({ atleta, onClose, onChange, valorBase, valorAbsoluto, registeredModalities = [] }) => {
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

  const isValid = local.modalidade && local.faixa && local.categoriaEtaria && local.peso;
  
  const currentPricePreview = local.modalidade?.includes('Combo') ? valorBase + valorAbsoluto : valorBase;

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
          {MODALIDADES.map(m => {
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
          {FAIXAS.map(f => <option key={f} value={f}>{f}</option>)}
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
          {PESOS.map(p => <option key={p} value={p}>{p}</option>)}
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
const AtletaRow = ({ atleta, selecionado, onToggle, onCategoria, onCheckin, onValorChange, valorBase, valorAbsoluto, eventRegistrations = [] }) => {
  const [expandido, setExpandido] = useState(false);
  const [editandoValor, setEditandoValor] = useState(false);
  const [valorLocal, setValorLocal] = useState(String(atleta.valor));

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

  const handleValorBlur = () => {
    const parsed = parseFloat(valorLocal.replace(',', '.'));
    if (!isNaN(parsed) && parsed >= 0) {
      onValorChange(parsed);
    } else {
      setValorLocal(String(atleta.valor));
    }
    setEditandoValor(false);
  };

  useEffect(() => {
    setValorLocal(String(atleta.valor));
  }, [atleta.valor]);

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
          padding: '22px 24px',
          marginBottom: '12px',
          border: selecionado ? '1px solid rgba(0,194,203,0.3)' : '1px solid rgba(255,255,255,0.05)',
          borderRadius: '16px',
          background: selecionado ? 'rgba(0,194,203,0.03)' : 'rgba(20,20,24,0.6)',
          backdropFilter: 'blur(10px)',
          boxShadow: selecionado ? '0 8px 30px rgba(0,194,203,0.1)' : '0 4px 15px rgba(0,0,0,0.2)',
          transition: 'all 0.3s ease',
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
              width: '24px', height: '24px', borderRadius: '6px',
              border: selecionado ? '2px solid var(--brand-primary, #00c2cb)' : '2px solid #555',
              background: selecionado ? 'var(--brand-primary, #00c2cb)' : 'rgba(0,0,0,0.2)',
              boxShadow: selecionado ? '0 0 10px rgba(0,194,203,0.5)' : 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s',
              opacity: temCheckin ? 0.5 : 1
            }}>
              {selecionado && <Check size={16} color="#000" strokeWidth={3} />}
            </div>
          </label>
        </div>

        <div>
          <div style={{ fontWeight: '800', fontSize: '19px', color: '#ffffff', letterSpacing: '0.02em' }}>{atleta.nome}</div>
          <div style={{ fontSize: '14px', color: '#a0a0a0', marginTop: '6px', display: 'flex', gap: '12px', fontWeight: '600' }}>
            {atleta.idade ? <span style={{ background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '4px' }}>🎂 {atleta.idade} anos</span> : null}
            {atleta.graduacao ? <span style={{ background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '4px' }}>🥋 {atleta.graduacao}</span> : null}
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontSize: '14px',
            color: temCategoria ? '#60a5fa' : '#777',
            fontWeight: temCategoria ? '700' : '500',
            background: temCategoria ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255,255,255,0.02)',
            padding: '8px 16px', borderRadius: '12px', display: 'inline-block',
            border: temCategoria ? '1px solid rgba(59, 130, 246, 0.2)' : '1px solid rgba(255,255,255,0.05)'
          }}>
            {categoriaStr}
          </div>
        </div>

        <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
          {editandoValor && !temCheckin ? (
            <input
              type="text"
              value={valorLocal}
              onChange={e => setValorLocal(e.target.value)}
              onBlur={handleValorBlur}
              autoFocus
              style={{
                width: '80px', padding: '6px 10px', borderRadius: '8px',
                background: 'rgba(0,0,0,0.3)', border: '1px solid var(--brand-primary)', color: '#fff', textAlign: 'right', outline: 'none'
              }}
            />
          ) : (
            <>
              <span style={{ fontSize: '20px', fontWeight: '900', color: '#ffffff', letterSpacing: '0.02em' }}>
                {formatBRL(atleta.valor)}
              </span>
              {!temCheckin && (
                <button onClick={() => setEditandoValor(true)} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '6px', border: 'none', cursor: 'pointer', color: '#888', padding: '6px', transition: 'all 0.2s' }}>
                  <Edit3 size={14} />
                </button>
              )}
            </>
          )}
        </div>

        <div style={{ textAlign: 'center' }}>
          {!selecionado ? (
            <span style={{ color: '#666', fontSize: '15px', fontWeight: '600' }}>—</span>
          ) : !temCategoria ? (
            <span style={{
              background: 'rgba(245, 158, 11, 0.1)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)',
              padding: '6px 16px', borderRadius: '24px', fontSize: '13px', fontWeight: '800', letterSpacing: '0.05em'
            }}>PENDENTE</span>
          ) : temCheckin ? (
            <span style={{
              background: 'rgba(16, 185, 129, 0.1)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)',
              padding: '6px 16px', borderRadius: '24px', fontSize: '13px', fontWeight: '800', letterSpacing: '0.05em'
            }}>ENVIADO ✓</span>
          ) : (
            <span style={{
              background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.3)',
              padding: '6px 16px', borderRadius: '24px', fontSize: '13px', fontWeight: '800', letterSpacing: '0.05em'
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
              registeredModalities={registeredModalities}
              onChange={onCategoria}
              onClose={() => setExpandido(false)}
            />
          )}</div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ─── Modal de Checkout PIX ─────────────────────────────────────────────
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
    if (total > 0 && !proofFile) {
      setProofError('Por favor, anexe o comprovante de pagamento antes de finalizar.');
      return;
    }
    onConfirm(proofFile);
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
            <div style={{ fontSize: '14px', color: '#888', marginBottom: '8px' }}>Valor Total a Pagar</div>
            <div style={{ fontSize: '36px', fontWeight: '800', color: '#2ecc71' }}>{formatBRL(total)}</div>
          </div>

          {total > 0 && (
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                <div style={{ width: '140px', height: '140px', background: '#fff', borderRadius: '8px', padding: '8px' }}>
                  {qrCodeDataUrl ? <img src={qrCodeDataUrl} alt="QR Code PIX" style={{ width: '100%', height: '100%' }} /> : <div style={{ width: '100%', height: '100%', background: '#eee' }}/>}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '14px', color: '#ccc', margin: '0 0 12px 0', lineHeight: 1.5 }}>
                    Escaneie o QR Code com o app do seu banco ou copie o código PIX Copia e Cola.
                  </p>
                  <button onClick={handleCopy} style={{
                    width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--brand-primary, #00c2cb)',
                    background: 'transparent', color: 'var(--brand-primary, #00c2cb)', fontWeight: '600',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer'
                  }}>
                    {copied ? <Check size={16}/> : <Copy size={16}/>}
                    {copied ? 'Código Copiado!' : 'Copiar Código PIX'}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#f0f0f0', marginBottom: '10px' }}>
              Comprovante de Pagamento (Obrigatório)
            </label>
            <div style={{
              border: '2px dashed #444', borderRadius: '12px', padding: '24px', textAlign: 'center',
              background: 'rgba(0,0,0,0.2)', transition: 'border-color 0.2s',
              borderColor: proofFile ? '#2ecc71' : proofError ? '#e74c3c' : '#444'
            }}>
              <input type="file" id="pix-proof" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
              <label htmlFor="pix-proof" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                {proofFile ? <CheckCircle size={32} color="#2ecc71" /> : <Camera size={32} color="#888" />}
                <div style={{ color: proofFile ? '#2ecc71' : '#aaa', fontSize: '15px' }}>
                  {proofFile ? `Arquivo selecionado: ${proofFile.name}` : 'Clique para selecionar a imagem do comprovante'}
                </div>
              </label>
            </div>
            {proofError && <div style={{ color: '#e74c3c', fontSize: '13px', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}><AlertCircle size={14}/> {proofError}</div>}
          </div>

          {error && (
            <div style={{ padding: '12px', background: 'rgba(231,76,60,0.1)', border: '1px solid #e74c3c55', color: '#e74c3c', borderRadius: '8px', fontSize: '14px', marginBottom: '20px' }}>
              {error}
            </div>
          )}

          <button
            onClick={handleFinish}
            disabled={isLoading || (total > 0 && !proofFile)}
            style={{
              width: '100%', padding: '16px', borderRadius: '10px', border: 'none',
              background: 'linear-gradient(135deg, var(--brand-primary, #00c2cb), #009ba3)',
              color: '#000', fontWeight: '800', fontSize: '16px', cursor: 'pointer',
              opacity: isLoading ? 0.7 : 1
            }}
          >
            {isLoading ? 'Enviando Inscrições...' : 'Finalizar Inscrições da Equipe'}
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

  const { base: valorBase, absoluteFee: valorAbsoluto } = useMemo(() => {
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
      const { base } = resolveAthleteEventPrice({ event: campeonatoAtivo, athlete });
      return base;
    }
    const { total } = resolveAthleteEventPrice({
      event: campeonatoAtivo,
      athlete,
      modalitiesCount: cat.modalidade.includes('Combo') ? 2 : 1
    });
    return total;
  };

  // Estado dos atletas do roster
  const [roster, setRoster] = useState([]);

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

      for (const atleta of atletasSelecionados) {
        const payload = {
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
          notes: JSON.stringify({
            comprovanteArquivoDataUrl: proofDataUrl,
            equipeLote: true
          }),
          status: 'pending_sync' // status initial
        };
        
        try {
          if (typeof addAthlete === 'function') {
            // Remove the base64 image from the local cache payload to prevent localStorage quota errors
            const cachePayload = { ...payload };
            if (cachePayload.notes) {
              const notesObj = JSON.parse(cachePayload.notes);
              delete notesObj.comprovanteArquivoDataUrl;
              cachePayload.notes = JSON.stringify(notesObj);
            }
            addAthlete(cachePayload);
          }
        } catch (e) {
          console.warn('Falha ao adicionar atleta ao cache local:', e);
        }

        await publicRegistrationService.register(payload);
      }

      // Marcar os selecionados como checkin = true (enviado) e desmarcar
      setRoster(prev => prev.map(a => atletasSelecionados.find(s => s.id === a.id) ? { ...a, checkin: true, selecionado: false } : a));
      
      addToast(`Sucesso! ${atletasSelecionados.length} inscrições enviadas para aprovação. Comprovante anexado.`, TOAST_TYPES.success, 8000);
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
      <div style={{ textAlign: 'center', padding: '80px 20px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
        <Users size={48} style={{ color: '#444', marginBottom: '16px' }} />
        <p style={{ color: '#888', fontSize: '16px' }}>Nenhum aluno vinculado a esta academia.<br /><span style={{ fontSize: '14px', color: '#555' }}>Adicione alunos em "Academia" para gerenciar inscrições.</span></p>
      </div>
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
          background: 'linear-gradient(135deg, rgba(0,194,203,0.08), rgba(0,194,203,0.02))',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(0,194,203,0.2)',
          boxShadow: '0 12px 40px rgba(0,0,0,0.2)',
          borderRadius: '24px', padding: '32px', marginBottom: '40px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '24px',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--brand-primary, #00c2cb)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px', fontWeight: '800' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--brand-primary)', boxShadow: '0 0 10px var(--brand-primary)' }}></span>
              Campeonato Ativo
            </div>
            <div style={{ fontSize: '28px', fontWeight: '900', color: '#fff', letterSpacing: '-0.02em' }}>{campeonatoAtivo.nome}</div>
            <div style={{ fontSize: '15px', color: '#999', marginTop: '8px', fontWeight: '500' }}>
              Taxa base: <strong style={{ color: '#ccc' }}>{formatBRL(valorBase)}</strong> <span style={{ margin: '0 6px', color: '#444' }}>|</span> Absoluto: <strong style={{ color: '#ccc' }}>+{formatBRL(valorAbsoluto)}</strong>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            {[
              { label: 'Alunos', value: roster.length, color: '#aaa', bg: 'rgba(255,255,255,0.03)' },
              { label: 'Selecionados', value: atletasSelecionados.length, color: 'var(--brand-primary,#00c2cb)', bg: 'rgba(0,194,203,0.1)' },
              { label: 'Enviados', value: jaEnviados, color: '#f39c12', bg: 'rgba(243,156,18,0.1)' },
              { label: 'Total', value: formatBRL(totalGeral), color: '#fff', bg: 'rgba(255,255,255,0.06)' },
            ].map(s => (
              <div key={s.label} style={{
                textAlign: 'center',
                background: s.bg,
                border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: '16px',
                padding: '16px 20px',
                minWidth: '110px'
              }}>
                <div style={{ fontSize: '26px', fontWeight: '900', color: s.color, textShadow: '0 2px 10px rgba(0,0,0,0.3)' }}>{s.value}</div>
                <div style={{ fontSize: '12px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '6px', fontWeight: '700' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alertas */}
      {isRegistrationClosed && (
        <div style={{
          background: 'rgba(231,76,60,0.1)', border: '1px solid rgba(231,76,60,0.3)',
          borderRadius: '12px', padding: '14px 20px', marginBottom: '20px',
          display: 'flex', alignItems: 'center', gap: '12px', fontSize: '15px', color: '#e74c3c', fontWeight: '600'
        }}>
          <AlertTriangle size={20} />
          As inscrições para este campeonato estão encerradas. Não é possível adicionar novos alunos.
        </div>
      )}

      {!isRegistrationClosed && semCategoria > 0 && (
        <div style={{
          background: 'rgba(243,156,18,0.1)', border: '1px solid rgba(243,156,18,0.3)',
          borderRadius: '12px', padding: '14px 20px', marginBottom: '20px',
          display: 'flex', alignItems: 'center', gap: '12px', fontSize: '15px', color: '#f39c12', fontWeight: '600'
        }}>
          <AlertTriangle size={20} />
          {semCategoria} aluno{semCategoria > 1 ? 's' : ''} selecionado{semCategoria > 1 ? 's' : ''} sem categoria definida. Clique no atleta para expandir e definir.
        </div>
      )}

      {/* Ações globais */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ fontSize: '18px', color: '#aaa', fontWeight: '500' }}><strong style={{ color: '#fff', fontWeight: '800' }}>{roster.length}</strong> alunos na academia</div>
        <button onClick={resetarTodos} style={{
          padding: '10px 20px', borderRadius: '12px', border: '1px solid #555',
          background: 'rgba(255,255,255,0.03)', color: '#ccc', fontSize: '15px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '700', transition: 'all 0.2s'
        }}>
          <RotateCcw size={18} /> Limpar seleção
        </button>
      </div>

      {/* Lista de atletas */}
      <div>
        {roster.map(atleta => (
          <AtletaRow
            key={atleta.id}
            atleta={atleta}
            selecionado={atleta.selecionado}
            valorBase={valorBase}
            valorAbsoluto={valorAbsoluto}
            onToggle={() => toggleSelecionado(atleta.id)}
            onCategoria={(novaCategoria) => {
              if (novaCategoria && typeof novaCategoria === 'object' && novaCategoria.faixa) {
                atualizarCategoria(atleta.id, novaCategoria);
              }
            }}
            onValorChange={(v) => atualizarValor(atleta.id, v)}
          />
        ))}
      </div>

      {/* Rodapé de checkout */}
      {!isRegistrationClosed && atletasSelecionados.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          style={{
            marginTop: '32px', background: 'linear-gradient(135deg, #0a1f0a, #0d2a0d)',
            border: '1px solid rgba(46,204,113,0.3)', borderRadius: '16px', padding: '24px 30px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px',
            boxShadow: '0 10px 40px rgba(46,204,113,0.1)'
          }}
        >
          <div>
            <div style={{ fontSize: '15px', color: '#aaa', marginBottom: '6px', fontWeight: 'bold' }}>
              {atletasSelecionados.length} atleta{atletasSelecionados.length > 1 ? 's' : ''} pronto{atletasSelecionados.length > 1 ? 's' : ''} para envio
            </div>
            <div style={{ fontSize: '32px', fontWeight: '900', color: '#2ecc71' }}>{formatBRL(totalGeral)}</div>
            <div style={{ fontSize: '13px', color: '#777', marginTop: '4px' }}>Total unificado da equipe</div>
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              style={{
                padding: '16px 28px', borderRadius: '12px', border: 'none',
                background: 'linear-gradient(135deg, var(--brand-primary,#00c2cb), #009ba3)',
                color: '#000', fontWeight: '800', fontSize: '16px',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px',
                opacity: semCategoria > 0 ? 0.5 : 1,
              }}
              disabled={semCategoria > 0}
              title={semCategoria > 0 ? 'Defina a categoria de todos os atletas primeiro' : ''}
              onClick={() => setShowPixModal(true)}
            >
              <CreditCard size={20}/> Gerar PIX e Anexar Comprovante
            </button>
          </div>
        </motion.div>
      )}
    </>
  );
}
