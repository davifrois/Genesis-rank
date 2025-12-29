import React, { useMemo, useState } from 'react';
import { Medal, Search } from 'lucide-react';
import { useStore } from '../hooks/useStore';
import { rankAthletes } from '../services/scoringService';

const normalizeGroupPart = (value) => (
    (value || '').toString().trim().toLowerCase().replace(/\s+/g, ' ')
);

const buildGroupDescriptor = (athlete) => {
    const categoria = athlete.categoria || 'Categoria';
    const faixa = athlete.faixa || 'Faixa';
    const peso = athlete.peso || (athlete.isAbsolute ? 'Absoluto' : 'Peso');
    const genero = athlete.genero || athlete.sexo || 'Masculino';
    const baseParts = [categoria, faixa, peso, genero];
    const labelParts = athlete.isAbsolute ? ['ABS', ...baseParts] : baseParts;
    const keyParts = [
        ...baseParts,
        athlete.isAbsolute ? 'ABS' : 'STD',
        athlete.isNoGi ? 'NO-GI' : 'GI'
    ];

    return {
        key: keyParts.map(normalizeGroupPart).join('::'),
        label: labelParts.join(' - ')
    };
};

const Ranking = () => {
    const { athletes } = useStore();
    const [activeTab, setActiveTab] = useState('GI');

    const tabs = [
        { id: 'GI', label: 'Categoria de Peso GI (COM Pano)' },
        { id: 'NO-GI', label: 'Categoria de Peso NO-GI (SEM Pano)' },
        { id: 'ABS-GI', label: 'Absoluto GI (COM Pano)' },
        { id: 'ABS-NO-GI', label: 'Absoluto NO-GI (SEM Pano)' },
        { id: 'GERAL', label: 'GERAL' }
    ];

    const filteredAthletes = useMemo(() => {
        return athletes.filter((athlete) => {
            if (activeTab === 'GI') return !athlete.isNoGi && !athlete.isAbsolute;
            if (activeTab === 'NO-GI') return athlete.isNoGi && !athlete.isAbsolute;
            if (activeTab === 'ABS-GI') return !athlete.isNoGi && athlete.isAbsolute;
            if (activeTab === 'ABS-NO-GI') return athlete.isNoGi && athlete.isAbsolute;
            return true;
        });
    }, [athletes, activeTab]);

    const { groupedAthletes, overallWinners } = useMemo(() => {
        const groups = {};
        filteredAthletes.forEach((athlete) => {
            const { key, label } = buildGroupDescriptor(athlete);
            if (!groups[key]) groups[key] = { label, entries: [] };
            groups[key].entries.push(athlete);
        });

        const grouped = Object.values(groups)
            .map((group) => ({
                label: group.label,
                entries: rankAthletes(group.entries)
            }))
            .sort((a, b) => a.label.localeCompare(b.label));

        if (activeTab !== 'GERAL') {
            return { groupedAthletes: grouped, overallWinners: [] };
        }

        const winners = grouped.map((group) => ({
            label: group.label,
            athlete: group.entries[0]
        }));
        const sorted = rankAthletes(winners.map((item) => item.athlete));
        const winnersById = new Map(winners.map((item) => [item.athlete.id, item]));

        return {
            groupedAthletes: grouped,
            overallWinners: sorted.map((athlete) => winnersById.get(athlete.id)).filter(Boolean)
        };
    }, [filteredAthletes, activeTab]);

    const renderMedal = (index) => {
        if (index === 0) return <Medal className="medal medal--gold" size={20} />;
        if (index === 1) return <Medal className="medal medal--silver" size={20} />;
        if (index === 2) return <Medal className="medal medal--bronze" size={20} />;
        if (index === 3) return <Medal className="medal medal--fourth" size={20} />;
        return <span className="medal-rank">{index + 1}</span>;
    };

    return (
        <div className="ranking-minimal">
            <div className="correction-banner">
                <button type="button" className="correction-link">Solicitar Correcao</button>
            </div>

            <div className="tab-container minimal-tabs">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="rank-header">
                <span>Atleta</span>
                <span>Pontos</span>
            </div>

            <div className="rank-groups">
                {activeTab === 'GERAL' ? (
                    overallWinners.map((item, index) => (
                        <div key={`${item.athlete.id}-${item.label}`} className="rank-row-min">
                            <div className="rank-left">
                                <div className="rank-medal">{renderMedal(index)}</div>
                                <div>
                                    <div className="rank-name-min">{item.athlete.nome}</div>
                                    <div className="rank-academy">{item.athlete.academia}</div>
                                    <div className="rank-meta-min">
                                        <span className={`rank-mode ${item.athlete.isNoGi ? 'is-nogi' : 'is-gi'}`}>
                                            {item.athlete.isNoGi ? 'NO-GI' : 'GI'}
                                        </span>
                                        <span>{item.label}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="rank-points">
                                <span>{item.athlete.pontos}</span>
                                <Search size={14} className="rank-search-icon" />
                            </div>
                        </div>
                    ))
                ) : (
                    groupedAthletes.map((group) => (
                        <div key={group.label} className="rank-group">
                            <div className="rank-group-header">
                                <h3 className="rank-group-title">{group.label}</h3>
                                <div className="rank-group-sub">Total de Atletas: {group.entries.length}</div>
                            </div>
                            {group.entries.map((athlete, index) => (
                                <div key={athlete.id} className="rank-row-min">
                                    <div className="rank-left">
                                        <div className="rank-medal">{renderMedal(index)}</div>
                                        <div>
                                            <div className="rank-name-min">{athlete.nome}</div>
                                            <div className="rank-academy">{athlete.academia}</div>
                                            <div className="rank-meta-min">
                                                <span className={`rank-mode ${athlete.isNoGi ? 'is-nogi' : 'is-gi'}`}>
                                                    {athlete.isNoGi ? 'NO-GI' : 'GI'}
                                                </span>
                                                <span>
                                                    {athlete.faixa || 'Faixa'} / {athlete.peso || 'Peso'} / {athlete.categoria || 'Categoria'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="rank-points">
                                        <span>{athlete.pontos}</span>
                                        <Search size={14} className="rank-search-icon" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ))
                )}

                {activeTab === 'GERAL'
                    ? overallWinners.length === 0 && <div className="rank-empty">Nenhum vencedor encontrado.</div>
                    : groupedAthletes.length === 0 && <div className="rank-empty">Nenhum atleta encontrado nesta categoria.</div>}
            </div>
        </div>
    );
};

export default Ranking;
