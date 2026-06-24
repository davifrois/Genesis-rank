import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X as FiX, CheckCircle as FiCheckCircle } from 'lucide-react';
import { Users, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../hooks/useStore';
import './AthleteCheckinModal.css';

const AthleteCheckinModal = ({ isOpen, onClose, athlete, athleteAge, onSave }) => {
    const { updateAthlete, athletes } = useStore();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        peso: '',
        categoria: '',
        faixa: ''
    });

    useEffect(() => {
        if (athlete) {
            setFormData({
                peso: athlete.peso || '',
                categoria: athlete.categoria || '',
                faixa: athlete.faixa || ''
            });
        }
    }, [athlete]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (athlete && athlete.id) {
            updateAthlete(athlete.id, formData);
            if (onSave) {
                onSave(formData);
            }
            onClose();
            if (athlete.eventId) {
                navigate(`/eventos/${athlete.eventId}?tab=athletes`);
            }
        }
    };

    // Calculate age restrictions
    const age = Number(athleteAge) || 18; // Default to adult if unknown
    
    const isAllowed = (cat) => {
        if (!athleteAge) return true; // if no age provided, allow all for safety
        
        if (cat === 'Pré-Mirim') return age <= 6;
        if (cat === 'Mirim') return age >= 7 && age <= 9;
        if (cat === 'Infantil') return age >= 10 && age <= 13;
        if (cat === 'Infanto-Juvenil') return age === 14 || age === 15;
        if (cat === 'Juvenil') return age === 16 || age === 17;
        if (cat === 'Adulto') return age >= 18;

        // Masters
        if (cat === 'Master 1') return age >= 30;
        if (cat === 'Master 2') return age >= 36;
        if (cat === 'Master 3') return age >= 41;
        if (cat === 'Master 4') return age >= 46;
        if (cat === 'Master 5') return age >= 51;
        if (cat === 'Master 6') return age >= 56;
        if (cat === 'Master 7') return age >= 61;

        return false;
    };

    // Calculate opponents preview
    const opponents = athletes.filter(a => 
        a.eventId === athlete?.eventId && 
        a.categoria === formData.categoria && 
        a.faixa === formData.faixa && 
        a.peso === formData.peso && 
        a.id !== athlete?.id
    );

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div 
                className="checkin-modal-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                <motion.div 
                    className="checkin-modal-content"
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 50, opacity: 0 }}
                >
                    <div className="checkin-modal-header">
                        <h3>Check-in / Editar Inscrição</h3>
                        <button onClick={onClose} className="close-btn" aria-label="Fechar">
                            <FiX />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="checkin-form">
                        <div className="form-info-card">
                            <p><strong>Atleta:</strong> {athlete?.nome}</p>
                            <p><strong>Equipe:</strong> {athlete?.academia || 'Sem equipe'}</p>
                        </div>

                        <div className="form-group">
                            <label htmlFor="faixa">Faixa</label>
                            <select 
                                id="faixa"
                                name="faixa"
                                value={formData.faixa}
                                onChange={handleChange}
                                className="form-control"
                            >
                                <option value="">Selecione a faixa</option>
                                <option value="Branca">Branca</option>
                                <option value="Cinza">Cinza</option>
                                <option value="Amarela">Amarela</option>
                                <option value="Laranja">Laranja</option>
                                <option value="Verde">Verde</option>
                                <option value="Azul">Azul</option>
                                <option value="Roxa">Roxa</option>
                                <option value="Marrom">Marrom</option>
                                <option value="Preta">Preta</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label htmlFor="categoria">Idade / Categoria</label>
                            <select
                                id="categoria"
                                name="categoria"
                                value={formData.categoria}
                                onChange={handleChange}
                                className="form-control"
                            >
                                <option value="" disabled>Selecione a categoria</option>
                                <option value="Pré-Mirim" disabled={!isAllowed('Pré-Mirim')}>Pré-Mirim {age > 6 ? '(Até 6 anos)' : ''}</option>
                                <option value="Mirim" disabled={!isAllowed('Mirim')}>Mirim {age < 7 || age > 9 ? '(Apenas 7-9 anos)' : ''}</option>
                                <option value="Infantil" disabled={!isAllowed('Infantil')}>Infantil {age < 10 || age > 13 ? '(Apenas 10-13 anos)' : ''}</option>
                                <option value="Infanto-Juvenil" disabled={!isAllowed('Infanto-Juvenil')}>Infanto-Juvenil {age < 14 || age > 15 ? '(Apenas 14-15 anos)' : ''}</option>
                                <option value="Juvenil" disabled={!isAllowed('Juvenil')}>Juvenil {age < 16 || age > 17 ? '(Apenas 16-17 anos)' : ''}</option>
                                <option value="Adulto" disabled={!isAllowed('Adulto')}>Adulto {age < 18 ? '(Apenas 18+)' : ''}</option>
                                <option value="Master 1" disabled={!isAllowed('Master 1')}>Master 1 {age < 30 ? '(Apenas 30+)' : ''}</option>
                                <option value="Master 2" disabled={!isAllowed('Master 2')}>Master 2 {age < 36 ? '(Apenas 36+)' : ''}</option>
                                <option value="Master 3" disabled={!isAllowed('Master 3')}>Master 3 {age < 41 ? '(Apenas 41+)' : ''}</option>
                                <option value="Master 4" disabled={!isAllowed('Master 4')}>Master 4 {age < 46 ? '(Apenas 46+)' : ''}</option>
                                <option value="Master 5" disabled={!isAllowed('Master 5')}>Master 5 {age < 51 ? '(Apenas 51+)' : ''}</option>
                                <option value="Master 6" disabled={!isAllowed('Master 6')}>Master 6 {age < 56 ? '(Apenas 56+)' : ''}</option>
                                <option value="Master 7" disabled={!isAllowed('Master 7')}>Master 7 {age < 61 ? '(Apenas 61+)' : ''}</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label htmlFor="peso">Categoria de Peso</label>
                            <select
                                id="peso"
                                name="peso"
                                value={formData.peso}
                                onChange={handleChange}
                                className="form-control"
                            >
                                <option value="">Selecione o peso</option>
                                <option value="Galo">Galo</option>
                                <option value="Pluma">Pluma</option>
                                <option value="Pena">Pena</option>
                                <option value="Leve">Leve</option>
                                <option value="Médio">Médio</option>
                                <option value="Meio-Pesado">Meio-Pesado</option>
                                <option value="Pesado">Pesado</option>
                                <option value="Super-Pesado">Super-Pesado</option>
                                <option value="Pesadíssimo">Pesadíssimo</option>
                            </select>
                        </div>

                        {formData.categoria && formData.faixa && formData.peso && (
                            <div className="opponents-preview">
                                <h4><Users size={14} /> Atletas na mesma chave</h4>
                                {opponents.length > 0 ? (
                                    <ul className="opponents-list">
                                        {opponents.map(opp => (
                                            <li key={opp.id}>
                                                <span className="opp-name">{opp.nome}</span>
                                                <span className="opp-academy">{opp.academia || 'Sem equipe'}</span>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <div className="opponents-empty">
                                        <AlertCircle size={14} />
                                        <span>Você será o único atleta nesta chave por enquanto.</span>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="checkin-actions">
                            <button type="button" className="btn-secondary" onClick={onClose}>
                                Cancelar
                            </button>
                            <button type="submit" className="btn-primary">
                                <FiCheckCircle style={{ marginRight: '8px' }} />
                                Salvar e Ver Inscrição
                            </button>
                        </div>
                    </form>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default AthleteCheckinModal;
