import React from 'react';
import { Calendar, UserCheck, Trophy, Swords, CheckCircle2, Clock } from 'lucide-react';
import './EventTimelineMilestones.css';

export default function EventTimelineMilestones({ event }) {
  if (!event) return null;

  const now = new Date();
  const eventDate = event.date ? new Date(event.date) : null;
  const regEnd = event.registrationEndDate ? new Date(event.registrationEndDate) : (eventDate ? new Date(eventDate.getTime() - 4 * 86400000) : null);
  const checkinEnd = regEnd ? new Date(regEnd.getTime() + 1 * 86400000) : null;
  const bracketsDate = regEnd ? new Date(regEnd.getTime() + 2 * 86400000) : null;

  // Determinar o status atual da timeline
  let activeStep = 1; // 1: Inscrições, 2: Checagem, 3: Chaves, 4: Dia do Evento
  if (eventDate && now >= eventDate) {
    activeStep = 4;
  } else if (bracketsDate && now >= bracketsDate) {
    activeStep = 3;
  } else if (regEnd && now >= regEnd) {
    activeStep = 2;
  } else {
    activeStep = 1;
  }

  const formatDate = (d) => {
    if (!d) return 'Em breve';
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  const steps = [
    {
      number: 1,
      icon: UserCheck,
      title: 'Inscrições Abertas',
      subtitle: regEnd ? `Até ${formatDate(regEnd)}` : 'Em andamento',
      desc: 'Lotes promocionais e cadastro de atletas',
      isCompleted: activeStep > 1,
      isCurrent: activeStep === 1
    },
    {
      number: 2,
      icon: Clock,
      title: 'Checagem Geral',
      subtitle: checkinEnd ? `${formatDate(checkinEnd)}` : 'Após inscrições',
      desc: 'Prazo limite para troca de peso e categoria',
      isCompleted: activeStep > 2,
      isCurrent: activeStep === 2
    },
    {
      number: 3,
      icon: Swords,
      title: 'Chaves & Cronograma',
      subtitle: bracketsDate ? `${formatDate(bracketsDate)}` : '48h antes',
      desc: 'Divulgação oficial das lutas e tatames',
      isCompleted: activeStep > 3,
      isCurrent: activeStep === 3
    },
    {
      number: 4,
      icon: Trophy,
      title: 'Dia do Campeonato',
      subtitle: eventDate ? `${formatDate(eventDate)}` : 'Data oficial',
      desc: 'Pesagem e combates no ginásio',
      isCompleted: activeStep === 4,
      isCurrent: activeStep === 4
    }
  ];

  return (
    <div className="etm-card">
      <div className="etm-header">
        <div className="etm-title-wrap">
          <Calendar size={18} color="#00c2cb" />
          <h4>Linha do Tempo Oficial do Evento</h4>
        </div>
        <span className="etm-badge-active">
          {activeStep === 1 && <><span className="etm-dot etm-dot--green" />Inscrições em Andamento</>}
          {activeStep === 2 && <><span className="etm-dot etm-dot--yellow" />Período de Checagem Geral</>}
          {activeStep === 3 && <><span className="etm-dot etm-dot--blue" />Chaves &amp; Cronograma Publicados</>}
          {activeStep === 4 && <><span className="etm-dot etm-dot--red" />Dia do Evento</>}
        </span>
      </div>

      <div className="etm-grid">
        {steps.map((step, idx) => {
          const IconComponent = step.icon;
          return (
            <div 
              key={step.number} 
              className={`etm-step ${step.isCompleted ? 'etm-step--completed' : ''} ${step.isCurrent ? 'etm-step--current' : ''}`}
            >
              <div className="etm-step-top">
                <div className="etm-step-indicator">
                  {step.isCompleted ? (
                    <CheckCircle2 size={16} color="#10b981" />
                  ) : (
                    <span>{step.number}</span>
                  )}
                </div>
                {idx < steps.length - 1 && <div className="etm-step-line" />}
              </div>

              <div className="etm-step-content">
                <div className="etm-step-title-row">
                  <IconComponent size={15} className="etm-step-icon" />
                  <span className="etm-step-title">{step.title}</span>
                </div>
                <div className="etm-step-subtitle">{step.subtitle}</div>
                <div className="etm-step-desc">{step.desc}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
