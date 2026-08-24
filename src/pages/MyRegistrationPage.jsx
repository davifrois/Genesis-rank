import React, { useState, useMemo } from 'react';
import { Search, CheckCircle2, Clock, XCircle, Download, Share2, Edit3, Shield, User, Award, Calendar, AlertCircle, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useStore } from '../hooks/useStore';
import { publicRegistrationService } from '../services/publicRegistrationService';
import { REGISTRATION_STATUS, normalizeRegistrationStatus } from '../utils/registrationStatus';
import './MyRegistrationPage.css';

export default function MyRegistrationPage() {
  const { events, athletes, memberProfiles } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [searched, setSearched] = useState(false);
  const [showEditModal, setShowEditModal] = useState(null);
  const [editNotes, setEditNotes] = useState('');
  const [editSuccess, setEditSuccess] = useState(false);

  // Search across athletes and registrations
  const results = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const term = searchTerm.toLowerCase().replace(/[^a-zA-Z0-9]/g, '');

    const matches = (athletes || []).filter(a => {
      const aName = (a.nome || '').toLowerCase().replace(/[^a-zA-Z0-9]/g, '');
      const aCpf = (a.cpf || a.document || '').toLowerCase().replace(/[^a-zA-Z0-9]/g, '');
      const aEmail = (a.email || '').toLowerCase();
      const aId = String(a.id || '');
      const aReqId = String(a.clientRequestId || '');

      return aName.includes(term) || aCpf.includes(term) || aEmail.includes(searchTerm.toLowerCase().trim()) || aId === term || aReqId.includes(term);
    });

    return matches;
  }, [searchTerm, athletes]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      setSearched(true);
    }
  };

  const handlePrint = (athlete) => {
    window.print();
  };

  const handleShareWhatsapp = (athlete, event) => {
    const text = `*COMPROVANTE DE INSCRIÇÃO - GENESIS SPORTS*\n\n`
      + `🏆 *Evento:* ${event?.name || 'Campeonato Genesis'}\n`
      + `🥋 *Atleta:* ${athlete.nome}\n`
      + `🏢 *Academia:* ${athlete.academia || 'Gênesis'}\n`
      + `🏷️ *Categoria:* ${athlete.categoria || 'Adulto'} | Faixa ${athlete.faixa || 'Branca'}\n`
      + `⚖️ *Peso:* ${athlete.peso || 'Leve'}\n`
      + `🟢 *Status:* CONFIRMADO E PAGO\n\n`
      + `Apresente este comprovante e documento oficial na pesagem!`;

    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="my-reg-page">
      <div className="my-reg-container">
        {/* Header */}
        <div className="my-reg-header">
          <Link to="/" className="my-reg-back">
            <ArrowLeft size={16} /> Voltar ao Início
          </Link>
          <h1>Consulta de Inscrição &amp; Comprovante Digital</h1>
          <p>Digite seu CPF, E-mail ou Nome para consultar o status da sua inscrição, emitir seu comprovante ou solicitar alterações.</p>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSearch} className="my-reg-search-form">
          <div className="my-reg-search-wrap">
            <Search size={20} className="my-reg-search-icon" />
            <input
              type="text"
              placeholder="Digite seu CPF, E-mail ou Nome completo..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="my-reg-input"
            />
          </div>
          <button type="submit" className="my-reg-search-btn">
            Buscar Inscrição
          </button>
        </form>

        {/* Results */}
        {searched && (
          <div className="my-reg-results">
            {results.length === 0 ? (
              <div className="my-reg-empty">
                <AlertCircle size={40} color="#f59e0b" />
                <h3>Nenhuma inscrição encontrada</h3>
                <p>Verifique se digitou o CPF ou E-mail corretamente como cadastrado no momento do pagamento.</p>
              </div>
            ) : (
              results.map(athlete => {
                const event = (events || []).find(e => String(e.id) === String(athlete.eventId));
                const isApproved = normalizeRegistrationStatus(athlete.status) === REGISTRATION_STATUS.PAYMENT_CONFIRMED;

                return (
                  <div key={athlete.id} className="my-reg-card">
                    <div className="my-reg-card-top">
                      <div>
                        <span className="my-reg-event-badge">🏆 {event?.name || 'Campeonato Oficial'}</span>
                        <h2 className="my-reg-athlete-name">{athlete.nome}</h2>
                        <div className="my-reg-meta">
                          <span>🏢 {athlete.academia || 'Academia Genesis'}</span>
                          <span>•</span>
                          <span>🥋 Faixa {athlete.faixa || 'Branca'}</span>
                        </div>
                      </div>

                      <div className={`my-reg-status-badge ${isApproved ? 'status--approved' : 'status--pending'}`}>
                        {isApproved ? (
                          <>
                            <CheckCircle2 size={16} /> CONFIRMADO &amp; PAGO
                          </>
                        ) : (
                          <>
                            <Clock size={16} /> PAGAMENTO PENDENTE
                          </>
                        )}
                      </div>
                    </div>

                    <div className="my-reg-details-grid">
                      <div className="my-reg-detail-item">
                        <span className="my-reg-detail-label">Modalidade</span>
                        <span className="my-reg-detail-val">{athlete.modalidade || 'Gi (Com Kimono)'}</span>
                      </div>
                      <div className="my-reg-detail-item">
                        <span className="my-reg-detail-label">Categoria de Idade</span>
                        <span className="my-reg-detail-val">{athlete.categoria || 'Adulto'}</span>
                      </div>
                      <div className="my-reg-detail-item">
                        <span className="my-reg-detail-label">Divisão de Peso</span>
                        <span className="my-reg-detail-val">{athlete.peso || 'Peso Leve'}</span>
                      </div>
                      <div className="my-reg-detail-item">
                        <span className="my-reg-detail-label">ID da Inscrição</span>
                        <span className="my-reg-detail-val" style={{ fontFamily: 'monospace' }}>#{String(athlete.id).slice(-8)}</span>
                      </div>
                    </div>

                    <div className="my-reg-actions">
                      <button 
                        type="button" 
                        className="my-reg-btn my-reg-btn--primary" 
                        onClick={() => handlePrint(athlete)}
                      >
                        <Download size={16} /> Baixar Comprovante PDF
                      </button>

                      <button 
                        type="button" 
                        className="my-reg-btn my-reg-btn--whatsapp" 
                        onClick={() => handleShareWhatsapp(athlete, event)}
                      >
                        <Share2 size={16} /> Enviar no WhatsApp
                      </button>

                      <button 
                        type="button" 
                        className="my-reg-btn my-reg-btn--outline" 
                        onClick={() => {
                          setShowEditModal(athlete);
                          setEditSuccess(false);
                        }}
                      >
                        <Edit3 size={16} /> Solicitar Troca de Categoria
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Modal de Solicitação de Troca de Categoria */}
        {showEditModal && (
          <div className="my-reg-modal-backdrop" onClick={() => setShowEditModal(null)}>
            <div className="my-reg-modal-content" onClick={e => e.stopPropagation()}>
              <h3>Solicitar Alteração de Categoria ou Peso</h3>
              <p>Envie sua solicitação para a comissão organizadora. Alterações são permitidas até o encerramento do prazo de checagem geral.</p>

              {editSuccess ? (
                <div style={{ padding: '20px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '12px', color: '#10b981', textAlign: 'center' }}>
                  <CheckCircle2 size={32} style={{ margin: '0 auto 8px' }} />
                  <h4>Solicitação enviada com sucesso!</h4>
                  <p style={{ margin: 0, fontSize: '0.85rem' }}>A comissão revisará seus dados antes da divulgação das chaves.</p>
                  <button 
                    type="button" 
                    onClick={() => setShowEditModal(null)} 
                    style={{ marginTop: '16px', padding: '10px 20px', background: '#10b981', color: '#000', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Fechar
                  </button>
                </div>
              ) : (
                <form onSubmit={(e) => {
                  e.preventDefault();
                  setEditSuccess(true);
                }}>
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#94a3b8', marginBottom: '6px' }}>
                      Descreva a alteração desejada (Nova faixa, novo peso ou categoria):
                    </label>
                    <textarea
                      required
                      rows="4"
                      value={editNotes}
                      onChange={e => setEditNotes(e.target.value)}
                      placeholder="Ex: Gostaria de alterar meu peso de Leve para Médio (estou com 78kg) ou trocar de categoria..."
                      style={{ width: '100%', padding: '12px 14px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: '#fff', fontSize: '0.95rem', resize: 'vertical', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                    <button 
                      type="button" 
                      onClick={() => setShowEditModal(null)} 
                      style={{ padding: '10px 18px', background: 'rgba(255,255,255,0.08)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                    >
                      Cancelar
                    </button>
                    <button 
                      type="submit" 
                      style={{ padding: '10px 20px', background: '#00c2cb', color: '#000', border: 'none', borderRadius: '8px', fontWeight: 800, cursor: 'pointer' }}
                    >
                      Enviar Solicitação
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
