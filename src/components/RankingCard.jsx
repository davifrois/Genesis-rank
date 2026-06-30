import React, { useState } from 'react';
import { Trophy } from 'lucide-react';
import './RankingCard.css';

const RankingCard = ({ athlete, rank, photoUrl, flagIcon, pointsLabel, winsLabel, lossesLabel, wins, losses }) => {
    const [brightness, setBrightness] = useState(1);

    const handleSliderChange = (e) => {
        setBrightness(e.target.value);
    };

    const hasTrophies = wins > 5; // Simulating trophy logic for visual effect

    return (
        <div 
            className="ranking-card-wrapper" 
            style={{ '--card-brightness': brightness }}
        >
            <div className="ranking-card__bg"></div>
            
            {/* Slider */}
            <div className="ranking-card__slider-container" title="Brilho/Opacidade">
                <input 
                    type="range" 
                    min="0" 
                    max="1" 
                    step="0.05" 
                    value={brightness} 
                    onChange={handleSliderChange}
                    className="ranking-card__slider"
                />
            </div>

            <div className="ranking-card__content">
                <div className="ranking-card__top">
                    <span className="ranking-card__rank">#{rank}</span>
                    {hasTrophies && (
                        <div className="ranking-card__trophies">
                            <Trophy size={14} className="ranking-card__trophy" />
                        </div>
                    )}
                </div>

                <div className="ranking-card__photo-container">
                    {photoUrl ? (
                        <img src={photoUrl} alt={athlete.nome} className="ranking-card__photo" loading="lazy" />
                    ) : (
                        <div className="ranking-card__photo" style={{ backgroundColor: '#222' }}></div>
                    )}
                    <div className="ranking-card__flag">
                        {flagIcon}
                    </div>
                </div>

                <div className="ranking-card__name" title={athlete.nome}>
                    {athlete.nome}
                </div>

                <div className="ranking-card__footer">
                    <div className="ranking-card__points">
                        {athlete.pontos} {pointsLabel}
                    </div>
                    <div className="ranking-card__stats">
                        <span className="ranking-card__stat--win">V: {wins || 0}</span>
                        <span className="ranking-card__stat--loss">D: {losses || 0}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RankingCard;
