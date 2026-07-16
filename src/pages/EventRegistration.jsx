import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useStore } from '../hooks/useStore';
import InscricaoCampeonatoFluxo from '../components/InscricaoCampeonatoFluxo';
import { resolveEventLifecycle } from '../utils/eventLifecycle';
import { publicRegistrationService } from '../services/publicRegistrationService';

const EventRegistration = () => {
  const { eventId } = useParams();
  const { events = [] } = useStore() || {};
  const [registrationCount, setRegistrationCount] = useState(0);

  const event = useMemo(() => events.find((item) => item.id === eventId), [events, eventId]);

  useEffect(() => {
    if (!event?.id) return;
    let cancelled = false;
    publicRegistrationService.listRegistrations(event.id)
      .then((rows) => {
        if (!cancelled) setRegistrationCount(Array.isArray(rows) ? rows.length : 0);
      })
      .catch(() => {
        if (!cancelled) setRegistrationCount(0);
      });
    return () => {
      cancelled = true;
    };
  }, [event?.id]);

  if (!event) {
    return (
      <div className="registration-flow">
        <div className="registration-step__header">
          <h2>Evento nao encontrado</h2>
          <p>Nao foi possivel localizar o campeonato solicitado.</p>
        </div>
      </div>
    );
  }

  const now = new Date();
  const lifecycle = resolveEventLifecycle(event, now);
  const registrationCloseDate = event.registrationCloseDate ? new Date(`${event.registrationCloseDate}T23:59:59`) : null;
  const isDateClosed = registrationCloseDate && !Number.isNaN(registrationCloseDate.getTime()) && now > registrationCloseDate;
  const maxAthletes = Number(event.maxAthletes || 0);
  const isCapacityClosed = event.closeOnCapacity === true && maxAthletes > 0 && registrationCount >= maxAthletes;
  const isRegistrationClosed = lifecycle.isPast || event.registrationOpen === false || isDateClosed || isCapacityClosed;

  if (isRegistrationClosed) {
    return (
      <div className="registration-flow">
        <div className="registration-step__header">
          <h2>Inscricoes encerradas</h2>
          <p>
            {isCapacityClosed
              ? `O limite de ${maxAthletes} atletas foi atingido.`
              : lifecycle.isPast
                ? 'Este evento ja foi finalizado e saiu da lista de proximos campeonatos.'
                : isDateClosed
                  ? 'O prazo de inscricao deste evento terminou.'
                  : 'A organizacao fechou as inscricoes deste evento.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container--event-pro">
      <InscricaoCampeonatoFluxo
        event={event}
        onComplete={() => {
          console.log('Inscricao finalizada com sucesso!');
        }}
      />
    </div>
  );
};

export default EventRegistration;
