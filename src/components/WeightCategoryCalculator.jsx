import React, { useState, useMemo } from 'react';
import { Scale, Calendar, User, Shield, CheckCircle, AlertTriangle, ArrowRight, X, Sparkles, Award } from 'lucide-react';
import './WeightCategoryCalculator.css';

const CURRENT_YEAR = new Date().getFullYear();

const AGE_DIVISIONS = [
  { minAge: 4, maxAge: 5, label: 'Pré-Mirim (4-5 anos)', group: 'kids' },
  { minAge: 6, maxAge: 7, label: 'Mirim (6-7 anos)', group: 'kids' },
  { minAge: 8, maxAge: 9, label: 'Infantil A (8-9 anos)', group: 'kids' },
  { minAge: 10, maxAge: 11, label: 'Infantil B (10-11 anos)', group: 'kids' },
  { minAge: 12, maxAge: 13, label: 'Infanto-Juvenil A (12-13 anos)', group: 'kids' },
  { minAge: 14, maxAge: 15, label: 'Infanto-Juvenil B (14-15 anos)', group: 'kids' },
  { minAge: 16, maxAge: 17, label: 'Juvenil (16-17 anos)', group: 'juvenil' },
  { minAge: 18, maxAge: 29, label: 'Adulto (18-29 anos)', group: 'adulto' },
  { minAge: 30, maxAge: 35, label: 'Master 1 (30-35 anos)', group: 'master' },
  { minAge: 36, maxAge: 40, label: 'Master 2 (36-40 anos)', group: 'master' },
  { minAge: 41, maxAge: 45, label: 'Master 3 (41-45 anos)', group: 'master' },
  { minAge: 46, maxAge: 50, label: 'Master 4 (46-50 anos)', group: 'master' },
  { minAge: 51, maxAge: 55, label: 'Master 5 (51-55 anos)', group: 'master' },
  { minAge: 56, maxAge: 120, label: 'Master 6 (56+ anos)', group: 'master' }
];

const WEIGHT_TABLES = {
  adulto_master_masculino_gi: [
    { name: 'Galo', maxWeight: 57.5 },
    { name: 'Pluma', maxWeight: 64.0 },
    { name: 'Pena', maxWeight: 70.0 },
    { name: 'Leve', maxWeight: 76.0 },
    { name: 'Médio', maxWeight: 82.3 },
    { name: 'Meio-Pesado', maxWeight: 88.3 },
    { name: 'Pesado', maxWeight: 94.3 },
    { name: 'Super-Pesado', maxWeight: 100.5 },
    { name: 'Pesadíssimo', maxWeight: Infinity }
  ],
  adulto_master_feminino_gi: [
    { name: 'Galo', maxWeight: 48.5 },
    { name: 'Pluma', maxWeight: 53.5 },
    { name: 'Pena', maxWeight: 58.5 },
    { name: 'Leve', maxWeight: 64.0 },
    { name: 'Médio', maxWeight: 69.0 },
    { name: 'Meio-Pesado', maxWeight: 74.0 },
    { name: 'Pesado', maxWeight: 79.3 },
    { name: 'Super-Pesado', maxWeight: 84.3 },
    { name: 'Pesadíssimo', maxWeight: Infinity }
  ],
  adulto_master_masculino_nogi: [
    { name: 'Galo', maxWeight: 55.5 },
    { name: 'Pluma', maxWeight: 61.5 },
    { name: 'Pena', maxWeight: 67.5 },
    { name: 'Leve', maxWeight: 73.5 },
    { name: 'Médio', maxWeight: 79.5 },
    { name: 'Meio-Pesado', maxWeight: 85.5 },
    { name: 'Pesado', maxWeight: 91.5 },
    { name: 'Super-Pesado', maxWeight: 97.5 },
    { name: 'Pesadíssimo', maxWeight: Infinity }
  ],
  adulto_master_feminino_nogi: [
    { name: 'Galo', maxWeight: 46.5 },
    { name: 'Pluma', maxWeight: 51.5 },
    { name: 'Pena', maxWeight: 56.5 },
    { name: 'Leve', maxWeight: 61.5 },
    { name: 'Médio', maxWeight: 66.5 },
    { name: 'Meio-Pesado', maxWeight: 71.5 },
    { name: 'Pesado', maxWeight: 76.5 },
    { name: 'Super-Pesado', maxWeight: 81.5 },
    { name: 'Pesadíssimo', maxWeight: Infinity }
  ],
  juvenil_masculino_gi: [
    { name: 'Galo', maxWeight: 53.5 },
    { name: 'Pluma', maxWeight: 58.5 },
    { name: 'Pena', maxWeight: 64.0 },
    { name: 'Leve', maxWeight: 69.0 },
    { name: 'Médio', maxWeight: 74.0 },
    { name: 'Meio-Pesado', maxWeight: 79.3 },
    { name: 'Pesado', maxWeight: 84.3 },
    { name: 'Super-Pesado', maxWeight: 89.3 },
    { name: 'Pesadíssimo', maxWeight: Infinity }
  ],
  juvenil_feminino_gi: [
    { name: 'Galo', maxWeight: 44.3 },
    { name: 'Pluma', maxWeight: 48.3 },
    { name: 'Pena', maxWeight: 52.3 },
    { name: 'Leve', maxWeight: 56.5 },
    { name: 'Médio', maxWeight: 60.5 },
    { name: 'Meio-Pesado', maxWeight: 65.0 },
    { name: 'Pesado', maxWeight: 69.0 },
    { name: 'Super-Pesado', maxWeight: 74.0 },
    { name: 'Pesadíssimo', maxWeight: Infinity }
  ],
  kids_default: [
    { name: 'Galo', maxWeight: 24.0 },
    { name: 'Pluma', maxWeight: 28.0 },
    { name: 'Pena', maxWeight: 32.0 },
    { name: 'Leve', maxWeight: 36.0 },
    { name: 'Médio', maxWeight: 40.0 },
    { name: 'Meio-Pesado', maxWeight: 45.0 },
    { name: 'Pesado', maxWeight: 50.0 },
    { name: 'Super-Pesado', maxWeight: 55.0 },
    { name: 'Pesadíssimo', maxWeight: Infinity }
  ]
};

export default function WeightCategoryCalculator({ isOpen, onClose, onSelectCategory }) {
  const [birthYear, setBirthYear] = useState('2000');
  const [gender, setGender] = useState('masculino');
  const [modality, setModality] = useState('gi');
  const [belt, setBelt] = useState('Azul');
  const [currentWeight, setCurrentWeight] = useState('74.5');

  const athleteAge = useMemo(() => {
    const y = parseInt(birthYear, 10);
    if (!y || isNaN(y) || y < 1920 || y > CURRENT_YEAR) return 0;
    return CURRENT_YEAR - y;
  }, [birthYear]);

  const ageDivision = useMemo(() => {
    if (!athleteAge) return null;
    return AGE_DIVISIONS.find(d => athleteAge >= d.minAge && athleteAge <= d.maxAge) || AGE_DIVISIONS[AGE_DIVISIONS.length - 1];
  }, [athleteAge]);

  const availableBelts = useMemo(() => {
    if (!ageDivision) return ['Branca'];
    if (ageDivision.group === 'kids') {
      return ['Branca', 'Cinza', 'Amarela', 'Laranja', 'Verde'];
    }
    if (ageDivision.group === 'juvenil') {
      return ['Branca', 'Azul', 'Roxa'];
    }
    return ['Branca', 'Azul', 'Roxa', 'Marrom', 'Preta'];
  }, [ageDivision]);

  const weightResult = useMemo(() => {
    const weightNum = parseFloat(currentWeight);
    if (!weightNum || isNaN(weightNum) || weightNum <= 0) return null;
    if (!ageDivision) return null;

    let tableKey = 'adulto_master_masculino_gi';
    if (ageDivision.group === 'kids') {
      tableKey = 'kids_default';
    } else if (ageDivision.group === 'juvenil') {
      tableKey = gender === 'feminino' ? 'juvenil_feminino_gi' : 'juvenil_masculino_gi';
    } else {
      if (gender === 'feminino') {
        tableKey = modality === 'nogi' ? 'adulto_master_feminino_nogi' : 'adulto_master_feminino_gi';
      } else {
        tableKey = modality === 'nogi' ? 'adulto_master_masculino_nogi' : 'adulto_master_masculino_gi';
      }
    }

    const divisionList = WEIGHT_TABLES[tableKey] || WEIGHT_TABLES.adulto_master_masculino_gi;
    
    // Find the category where weightNum <= maxWeight
    let matchedCategory = divisionList.find(d => weightNum <= d.maxWeight) || divisionList[divisionList.length - 1];
    
    const margin = matchedCategory.maxWeight === Infinity 
      ? 0 
      : (matchedCategory.maxWeight - weightNum);

    return {
      categoryName: matchedCategory.name,
      maxWeight: matchedCategory.maxWeight,
      margin: margin,
      isCloseToLimit: margin >= 0 && margin <= 0.6,
      isHeavyweight: matchedCategory.maxWeight === Infinity,
      table: divisionList
    };
  }, [currentWeight, ageDivision, gender, modality]);

  const handleApply = () => {
    if (onSelectCategory && weightResult && ageDivision) {
      onSelectCategory({
        anoNascimento: birthYear,
        idade: athleteAge,
        categoriaEtaria: ageDivision.label.split(' (')[0],
        faixa: belt,
        genero: gender === 'masculino' ? 'Masculino' : 'Feminino',
        modalidade: modality === 'gi' ? 'Gi (Com Kimono)' : 'No-Gi (Sem Kimono)',
        pesoCategoria: weightResult.categoryName,
        pesoLimite: weightResult.maxWeight === Infinity ? 'Sem Limite' : `${weightResult.maxWeight} kg`
      });
      if (onClose) onClose();
    }
  };

  const content = (
    <div className="wcc-container">
      {/* Header */}
      <div className="wcc-header">
        <div className="wcc-header-title">
          <div className="wcc-icon-badge">
            <Scale size={22} color="#00c2cb" />
          </div>
          <div>
            <h3>Simulador Oficial de Categoria & Peso</h3>
            <p>Descubra sua faixa etária, divisão e limite exato na balança em segundos</p>
          </div>
        </div>
        {onClose && (
          <button className="wcc-close-btn" onClick={onClose} aria-label="Fechar">
            <X size={20} />
          </button>
        )}
      </div>

      <div className="wcc-body">
        {/* Form Inputs Grid */}
        <div className="wcc-form-grid">
          {/* 1. Ano de Nascimento */}
          <div className="wcc-field">
            <label>
              <Calendar size={15} /> Ano de Nascimento
            </label>
            <input
              type="number"
              min="1940"
              max={CURRENT_YEAR - 4}
              value={birthYear}
              onChange={e => setBirthYear(e.target.value)}
              placeholder="Ex: 2000"
            />
            {athleteAge > 0 && (
              <span className="wcc-helper-text">
                Idade no ano da competição: <strong>{athleteAge} anos</strong>
              </span>
            )}
          </div>

          {/* 2. Gênero */}
          <div className="wcc-field">
            <label>
              <User size={15} /> Gênero
            </label>
            <div className="wcc-toggle-group">
              <button
                type="button"
                className={`wcc-toggle-btn ${gender === 'masculino' ? 'active' : ''}`}
                onClick={() => setGender('masculino')}
              >
                Masculino
              </button>
              <button
                type="button"
                className={`wcc-toggle-btn ${gender === 'feminino' ? 'active' : ''}`}
                onClick={() => setGender('feminino')}
              >
                Feminino
              </button>
            </div>
          </div>

          {/* 3. Modalidade */}
          <div className="wcc-field">
            <label>
              <Award size={15} /> Modalidade
            </label>
            <div className="wcc-toggle-group">
              <button
                type="button"
                className={`wcc-toggle-btn ${modality === 'gi' ? 'active' : ''}`}
                onClick={() => setModality('gi')}
              >
                🥋 Gi (Com Kimono)
              </button>
              <button
                type="button"
                className={`wcc-toggle-btn ${modality === 'nogi' ? 'active' : ''}`}
                onClick={() => setModality('nogi')}
              >
                👕 No-Gi (Sem Kimono)
              </button>
            </div>
          </div>

          {/* 4. Faixa */}
          <div className="wcc-field">
            <label>
              <Shield size={15} /> Graduação (Faixa)
            </label>
            <select value={belt} onChange={e => setBelt(e.target.value)}>
              {availableBelts.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          {/* 5. Peso na Balança */}
          <div className="wcc-field wcc-field--full">
            <label>
              <Scale size={15} /> Peso Atual na Balança (kg) {modality === 'gi' ? '— (com kimono)' : '— (sem kimono)'}
            </label>
            <div className="wcc-input-unit-wrap">
              <input
                type="number"
                step="0.1"
                min="10"
                max="200"
                value={currentWeight}
                onChange={e => setCurrentWeight(e.target.value)}
                placeholder="Ex: 75.5"
              />
              <span className="wcc-unit">KG</span>
            </div>
            <span className="wcc-helper-text">
              {modality === 'gi' 
                ? '💡 Dica: Pese-se vestindo o kimono e faixa oficiais que usará na luta.'
                : '💡 Dica: Pese-se com a bermuda e rashguard oficiais.'}
            </span>
          </div>
        </div>

        {/* Dynamic Calculation Result Box */}
        {ageDivision && weightResult && (
          <div className="wcc-result-card">
            <div className="wcc-result-top">
              <div className="wcc-result-badge-group">
                <span className="wcc-tag wcc-tag--primary">{ageDivision.label.split(' (')[0]}</span>
                <span className="wcc-tag wcc-tag--secondary">Faixa {belt}</span>
                <span className="wcc-tag wcc-tag--accent">{gender === 'masculino' ? 'Masculino' : 'Feminino'}</span>
              </div>
              <div className="wcc-result-category-highlight">
                <Sparkles size={18} color="#00c2cb" />
                <span>Sua Categoria Oficial:</span>
                <h4>Peso {weightResult.categoryName}</h4>
              </div>
            </div>

            <div className="wcc-result-details">
              <div className="wcc-stat-box">
                <span className="wcc-stat-label">Limite Máximo na Balança</span>
                <span className="wcc-stat-val">
                  {weightResult.isHeavyweight ? 'Sem Limite' : `${weightResult.maxWeight.toFixed(1)} kg`}
                </span>
              </div>
              <div className="wcc-stat-box">
                <span className="wcc-stat-label">Seu Peso Informado</span>
                <span className="wcc-stat-val">{parseFloat(currentWeight).toFixed(1)} kg</span>
              </div>
              <div className="wcc-stat-box">
                <span className="wcc-stat-label">Margem na Balança</span>
                <span className={`wcc-stat-val ${weightResult.isCloseToLimit ? 'wcc-stat-val--warn' : 'wcc-stat-val--ok'}`}>
                  {weightResult.isHeavyweight 
                    ? 'Livre' 
                    : `-${weightResult.margin.toFixed(2)} kg`}
                </span>
              </div>
            </div>

            {/* Safety Margin Indicator */}
            <div className={`wcc-alert ${weightResult.isCloseToLimit ? 'wcc-alert--warning' : 'wcc-alert--success'}`}>
              {weightResult.isCloseToLimit ? (
                <>
                  <AlertTriangle size={18} />
                  <span>
                    <strong>Atenção ao corte:</strong> Você está a apenas <strong>{weightResult.margin.toFixed(2)} kg</strong> do limite da categoria. Não se descure na hidratação!
                  </span>
                </>
              ) : (
                <>
                  <CheckCircle size={18} />
                  <span>
                    <strong>Categoria Perfeita:</strong> Você possui uma margem confortável de <strong>{weightResult.margin.toFixed(2)} kg</strong> abaixo do limite máximo.
                  </span>
                </>
              )}
            </div>

            {onSelectCategory && (
              <button type="button" className="wcc-apply-btn" onClick={handleApply}>
                <span>Usar Esta Categoria na Inscrição</span>
                <ArrowRight size={18} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );

  if (isOpen) {
    return (
      <div className="wcc-modal-backdrop" onClick={onClose}>
        <div className="wcc-modal-content" onClick={e => e.stopPropagation()}>
          {content}
        </div>
      </div>
    );
  }

  return content;
}
