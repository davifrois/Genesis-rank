import React, { useState, useEffect } from 'react';

export default function GerenteTreinador({ usuarioLogado, campeonatoAtivo, academyAthletes = [] }) {
  // Trava de segurança: Se não for o professor responsável, barra o acesso imediatamente
  if (!usuarioLogado.isProfessor || !usuarioLogado.academiaId) {
    return (
      <div className="genesis-error-lockscreen">
        <div className="error-box-content">
          <i className="icon-alert-triangle"></i>
          <h3>Escolha academia / clube</h3>
          <p>Você não é treinador de qualquer clube em Genesis esporte.</p>
        </div>
      </div>
    );
  }

  // Lista de atletas aprovados vinculados à academia do mestre
  const [atletasRoster, setAtletasRoster] = useState([]);

  useEffect(() => {
    const mapped = academyAthletes.map(a => ({
      id: a.id,
      nome: a.fullName || a.firstName + ' ' + a.lastName,
      idade: a.age || '-',
      graduacao: a.belt || 'Branca',
      pesoSelecionado: a.weight || '',
      querAbsoluto: false,
      querCinturao: false,
      valorBase: campeonatoAtivo?.taxaBase || 140.00
    }));
    setAtletasRoster(mapped);
  }, [academyAthletes, campeonatoAtivo]);

  const [atletasSelecionados, setAtletasSelecionados] = useState([]);

  // Alternar seleção de atleta para o lote
  const toggleSelectAtleta = (id) => {
    if (atletasSelecionados.includes(id)) {
      setAtletasSelecionados(atletasSelecionados.filter(item => item !== id));
    } else {
      setAtletasSelecionados([...atletasSelecionados, id]);
    }
  };

  // Alterar parâmetros de competição (Peso, Absoluto, Cinturão)
  const atualizarParametro = (id, campo, valor) => {
    setAtletasRoster(atletasRoster.map(atleta => {
      if (atleta.id === id) {
        return { ...atleta, [campo]: valor };
      }
      return atleta;
    }));
  };

  // Cálculo do Checkout Unificado considerando adicionais de absoluto ou cinturão se aplicável
  const calcularTotalLote = () => {
    return atletasRoster.reduce((total, atleta) => {
      if (atletasSelecionados.includes(atleta.id)) {
        let adicional = 0;
        if (atleta.querAbsoluto) adicional += 40.00; // Exemplo de taxa de absoluto
        if (atleta.querCinturao) adicional += 60.00;  // Exemplo de taxa de disputa de cinturão
        return total + atleta.valorBase + adicional;
      }
      return total;
    }, 0);
  };

  return (
    <div className="gerente-treinador-panel view-fade-in">
      <h2>Gerente de Treinador</h2>
      <p className="panel-subtitle">Inscreva a equipe em lote, calcule valores por idade/lote e feche um pagamento único.</p>

      {/* Grid de Atletas Filiados Aprovados */}
      <div className="roster-section-wrapper">
        <label className="genesis-input-label">2. Atletas filiados aprovados</label>
        
        <table className="genesis-custom-table">
          <thead>
            <tr>
              <th style={{ width: '40px' }}>SEL.</th>
              <th>ATLETA</th>
              <th>IDADE</th>
              <th>GRADUAÇÃO</th>
              <th>CATEGORIA DE PESO</th>
              {campeonatoAtivo.temCinturaoAtivo && <th>DISPUTAR CINTURÃO?</th>}
              <th>PARTICIPAR DO ABSOLUTO?</th>
              <th style={{ textAlign: 'right' }}>SUBTOTAL</th>
            </tr>
          </thead>
          <tbody>
            {atletasRoster.map(atleta => (
              <tr key={atleta.id} className={atletasSelecionados.includes(atleta.id) ? "row-selected-highlight" : ""}>
                <td>
                  <input 
                    type="checkbox" 
                    checked={atletasSelecionados.includes(atleta.id)}
                    onChange={() => toggleSelectAtleta(atleta.id)}
                    className="genesis-checkbox-input"
                  />
                </td>
                <td>
                  <div className="athlete-meta-cell">
                    <strong>{atleta.nome}</strong>
                    <span>Templum Fight</span>
                  </div>
                </td>
                <td>{atleta.idade}</td>
                <td>{atleta.graduacao}</td>
                <td>
                  <select 
                    className="table-inline-select"
                    disabled={!atletasSelecionados.includes(atleta.id)}
                    value={atleta.pesoSelecionado}
                    onChange={(e) => atualizarParametro(atleta.id, 'pesoSelecionado', e.target.value)}
                  >
                    <option value="">-- Escolha a Categoria --</option>
                    <option value="leve">Leve</option>
                    <option value="medio">Médio</option>
                    <option value="pesado">Pesado</option>
                  </select>
                </td>
                
                {/* Coluna Condicional: Só aparece se o campeonato tiver o cinturão ativo */}
                {campeonatoAtivo.temCinturaoAtivo && (
                  <td>
                    <label className="genesis-toggle-container">
                      <input 
                        type="checkbox"
                        disabled={!atletasSelecionados.includes(atleta.id)}
                        checked={atleta.querCinturao}
                        onChange={(e) => atualizarParametro(atleta.id, 'querCinturao', e.target.checked)}
                      />
                      <span className="toggle-label-text">Disputar Cinturão</span>
                    </label>
                  </td>
                )}

                {/* Coluna do Absoluto */}
                <td>
                  <label className="genesis-toggle-container">
                    <input 
                      type="checkbox"
                      disabled={!atletasSelecionados.includes(atleta.id)}
                      checked={atleta.querAbsoluto}
                      onChange={(e) => atualizarParametro(atleta.id, 'querAbsoluto', e.target.checked)}
                    />
                    <span className="toggle-label-text">Sim, lutar Absoluto</span>
                  </label>
                </td>

                <td style={{ textAlign: 'right' }}>
                  <strong>
                    R$ {(atleta.valorBase + (atleta.querAbsoluto ? 40 : 0) + (atleta.querCinturao ? 60 : 0)).toFixed(2)}
                  </strong>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Rodapé de Checkout */}
      <div className="coach-checkout-footer">
        <div className="total-summary-box">
          <span>Atletas Selecionados: <strong>{atletasSelecionados.length}</strong></span>
          <h4>Checkout Unificado: <span className="text-blue-glow">R$ {calcularTotalLote().toFixed(2)}</span></h4>
        </div>
        <button className="btn-gerar-pix" disabled={atletasSelecionados.length === 0}>
          📇 Gerar Pix da Equipe
        </button>
      </div>
    </div>
  );
}
