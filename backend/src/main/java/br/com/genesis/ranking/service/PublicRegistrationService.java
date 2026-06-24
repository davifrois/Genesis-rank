package br.com.genesis.ranking.service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.genesis.ranking.dto.PublicRegistrationRequest;
import br.com.genesis.ranking.dto.PublicRegistrationResponse;
import br.com.genesis.ranking.dto.RegistrationDetailsUpdateRequest;
import br.com.genesis.ranking.dto.RegistrationPaymentStatusRequest;
import br.com.genesis.ranking.dto.RegistrationPaymentStatusRequest;
import br.com.genesis.ranking.model.Athlete;
import br.com.genesis.ranking.model.Event;
import br.com.genesis.ranking.model.EventRegistration;
import br.com.genesis.ranking.model.enums.RegistrationPaymentStatus;
import br.com.genesis.ranking.repository.AthleteRepository;
import br.com.genesis.ranking.repository.EventRegistrationRepository;
import br.com.genesis.ranking.repository.EventRepository;

@Service
public class PublicRegistrationService {
  private static final String DEFAULT_PIX_KEY = "594.343.682-00 (LEAN AUGUSTO CHAVES PEREIRA)";
  private static final double DEFAULT_FEE_UNDER_15 = 120.0;
  private static final double DEFAULT_FEE_OVER_15 = 140.0;
  private static final double DEFAULT_FEE_COMBO = 240.0;
  private static final double DEFAULT_FEE_ABSOLUTE = 30.0;

  private final EventRepository eventRepository;
  private final EventRegistrationRepository registrationRepository;
  private final AthleteRepository athleteRepository;
  private final RegistrationEmailService registrationEmailService;

  public PublicRegistrationService(
      EventRepository eventRepository,
      EventRegistrationRepository registrationRepository,
      AthleteRepository athleteRepository,
      RegistrationEmailService registrationEmailService
  ) {
    this.eventRepository = eventRepository;
    this.registrationRepository = registrationRepository;
    this.athleteRepository = athleteRepository;
    this.registrationEmailService = registrationEmailService;
  }

  public PublicRegistrationResponse register(PublicRegistrationRequest request) {
    String eventId = clean(request.getEventId());
    if (eventId.isBlank()) {
      throw new IllegalArgumentException("Evento inválido.");
    }
    String clientRequestId = clean(request.getClientRequestId());
    if (!clientRequestId.isBlank()) {
      Optional<EventRegistration> existingRegistration = registrationRepository.findByClientRequestId(clientRequestId);
      if (existingRegistration.isPresent()) {
        EventRegistration existing = existingRegistration.get();
        return toResponse(existing, resolveAthleteIdIfConfirmed(existing, new HashMap<>()));
      }
    }

    Event event = resolveEvent(eventId, request);
    if (event != null && !event.getRegistrationOpen()) {
      throw new IllegalArgumentException("Inscrições fechadas para este evento.");
    }

    String profileId = clean(request.getProfileId());
    String sourceAthleteId = clean(request.getAthleteId());
    String nome = required(request.getNome(), "Nome completo obrigatório.");
    String email = clean(request.getEmail());
    String academia = clean(request.getAcademia());
    Optional<EventRegistration> duplicateInSameEvent = findDuplicateRegistration(
        event.getId(),
        profileId,
        sourceAthleteId,
        nome,
        email,
        academia
    );
    if (duplicateInSameEvent.isPresent()) {
      throw new IllegalArgumentException("Este atleta ja esta inscrito neste campeonato.");
    }

    EventRegistration registration = new EventRegistration();
    registration.setEvent(event);
    registration.setProfileId(profileId);
    registration.setSourceAthleteId(sourceAthleteId);
    registration.setNome(required(request.getNome(), "Nome completo é obrigatório."));
    registration.setEmail(clean(request.getEmail()));
    registration.setPhone(clean(request.getPhone()));
    registration.setAcademia(clean(request.getAcademia()));
    registration.setFaixa(clean(request.getFaixa()));
    registration.setPeso(clean(request.getPeso()));
    registration.setCategoria(clean(request.getCategoria()));
    registration.setGenero(clean(request.getGenero()));
    registration.setModalidade(normalizeMode(request.getModalidade()));
    registration.setClientRequestId(clientRequestId.isBlank() ? null : clientRequestId);
    registration.setNotes(clean(request.getNotes()));
    registration.setStatus(RegistrationPaymentStatus.PENDING.name());

    try {
      EventRegistration saved = registrationRepository.save(registration);
      registrationEmailService.sendRegistrationReceivedEmail(saved);
      return toResponse(saved, null);
    } catch (DataIntegrityViolationException ex) {
      if (!clientRequestId.isBlank()) {
        Optional<EventRegistration> existingRegistration = registrationRepository.findByClientRequestId(clientRequestId);
        if (existingRegistration.isPresent()) {
          EventRegistration existing = existingRegistration.get();
          return toResponse(existing, resolveAthleteIdIfConfirmed(existing, new HashMap<>()));
        }
      }
      throw ex;
    }
  }

  @Transactional(readOnly = true)
  public List<PublicRegistrationResponse> listRegistrations(String eventId) {
    String normalizedEventId = clean(eventId);
    List<EventRegistration> registrations = normalizedEventId.isBlank()
        ? registrationRepository.findAllByOrderByCreatedAtDesc()
        : registrationRepository.findByEvent_IdOrderByCreatedAtDesc(normalizedEventId);

    Map<String, List<Athlete>> athletesByEvent = new HashMap<>();
    return registrations.stream()
        .map((registration) -> {
          RegistrationPaymentStatus status = RegistrationPaymentStatus.fromStored(registration.getStatus());
          String athleteId = null;
          if (RegistrationPaymentStatus.PAYMENT_CONFIRMED.equals(status)) {
            athleteId = resolveAthleteId(registration, athletesByEvent);
          }
          return toResponse(registration, athleteId);
        })
        .collect(Collectors.toList());
  }

  public PublicRegistrationResponse updatePaymentStatus(
      String registrationId,
      RegistrationPaymentStatusRequest request
  ) {
    String normalizedRegistrationId = clean(registrationId);
    if (normalizedRegistrationId.isBlank()) {
      throw new IllegalArgumentException("Inscrição não encontrada.");
    }

    EventRegistration registration = registrationRepository.findById(normalizedRegistrationId)
        .orElseThrow(() -> new IllegalArgumentException("Inscrição não encontrada."));

    RegistrationPaymentStatus previousStatus = RegistrationPaymentStatus.fromStored(registration.getStatus());
    RegistrationPaymentStatus normalizedStatus = RegistrationPaymentStatus.fromExternal(request.getStatus());
    registration.setStatus(normalizedStatus.name());
    registration.setPaymentReviewNotes(clean(request.getReviewNotes()));
    registration.setPaymentReviewedBy(clean(request.getReviewedBy()));
    registration.setPaymentReviewedAt(Instant.now());

    EventRegistration saved = registrationRepository.save(registration);
    String athleteId = null;
    if (RegistrationPaymentStatus.PAYMENT_CONFIRMED.equals(normalizedStatus)) {
      Athlete athlete = ensureAthlete(saved);
      athleteId = athlete != null ? athlete.getId() : null;
      if (athleteId == null) {
        athleteId = resolveAthleteId(saved, new HashMap<>());
      }
      if (!RegistrationPaymentStatus.PAYMENT_CONFIRMED.equals(previousStatus)) {
        registrationEmailService.sendPaymentConfirmedEmail(saved);
      }
    }
    return toResponse(saved, athleteId);
  }

  public PublicRegistrationResponse updateRegistrationDetails(
      String registrationId,
      RegistrationDetailsUpdateRequest request
  ) {
    String normalizedRegistrationId = clean(registrationId);
    if (normalizedRegistrationId.isBlank()) {
      throw new IllegalArgumentException("Inscrição não encontrada.");
    }

    EventRegistration registration = registrationRepository.findById(normalizedRegistrationId)
        .orElseThrow(() -> new IllegalArgumentException("Inscrição não encontrada."));

    registration.setCategoria(required(request.getCategoria(), "Categoria é obrigatória."));
    registration.setFaixa(required(request.getFaixa(), "Faixa é obrigatória."));
    registration.setPeso(required(request.getPeso(), "Peso é obrigatório."));
    
    if (request.getGenero() != null) {
        registration.setGenero(clean(request.getGenero()));
    }
    if (request.getModalidade() != null) {
        registration.setModalidade(normalizeMode(request.getModalidade()));
    }

    EventRegistration saved = registrationRepository.save(registration);
    
    // Updates the athlete if it is already approved and sent to bracket
    String athleteId = null;
    RegistrationPaymentStatus status = RegistrationPaymentStatus.fromStored(saved.getStatus());
    if (RegistrationPaymentStatus.PAYMENT_CONFIRMED.equals(status)) {
        athleteId = resolveAthleteId(saved, new HashMap<>());
        if (athleteId != null) {
            Athlete athlete = athleteRepository.findById(athleteId).orElse(null);
            if (athlete != null) {
                athlete.setCategoria(saved.getCategoria());
                athlete.setFaixa(saved.getFaixa());
                athlete.setPeso(saved.getPeso());
                if (request.getGenero() != null) {
                    athlete.setGenero(saved.getGenero());
                }
                if (request.getModalidade() != null) {
                    athlete.setNoGi("NO-GI".equalsIgnoreCase(normalizeMode(request.getModalidade())));
                }
                if (request.getIsAbsolute() != null) {
                    athlete.setAbsolute(request.getIsAbsolute());
                }
                athleteRepository.save(athlete);
            }
        }
    }
    
    return toResponse(saved, athleteId);
  }

  public EventRegistration approveRegistration(String registrationId, String transactionId) {
    String normalizedRegistrationId = clean(registrationId);
    if (normalizedRegistrationId.isBlank()) {
      return null;
    }

    Optional<EventRegistration> optionalReg = registrationRepository.findById(normalizedRegistrationId);
    if (optionalReg.isEmpty()) {
      return null;
    }

    EventRegistration registration = optionalReg.get();
    RegistrationPaymentStatus previousStatus = RegistrationPaymentStatus.fromStored(registration.getStatus());
    
    // Se já estiver confirmado, apenas atualiza a transação
    if (RegistrationPaymentStatus.PAYMENT_CONFIRMED.equals(previousStatus)) {
        registration.setPaymentTransactionId(transactionId);
        return registrationRepository.save(registration);
    }

    registration.setStatus(RegistrationPaymentStatus.PAYMENT_CONFIRMED.name());
    registration.setPaymentTransactionId(transactionId);
    registration.setPaymentReviewNotes("Aprovado via Webhook");
    registration.setPaymentReviewedBy("SISTEMA");
    registration.setPaymentReviewedAt(Instant.now());

    EventRegistration saved = registrationRepository.save(registration);
    
    ensureAthlete(saved); // Creates the athlete if not exists
    registrationEmailService.sendPaymentConfirmedEmail(saved);
    
    return saved;
  }

  private Event resolveEvent(String eventId, PublicRegistrationRequest request) {
    Optional<Event> existing = eventRepository.findById(eventId);
    if (existing.isPresent()) return existing.get();

    Event event = new Event();
    event.setId(eventId);
    event.setName(required(request.getEventName(), "Nome do evento não informado."));
    event.setDate(parseDate(request.getEventDate()));
    event.setLocation(clean(request.getEventLocation()));
    event.setRegistrationOpen(true);
    event.setInternalRegistration(true);
    event.setPixKey(DEFAULT_PIX_KEY);
    event.setFeeUnder15(DEFAULT_FEE_UNDER_15);
    event.setFeeOver15(DEFAULT_FEE_OVER_15);
    event.setFeeCombo(DEFAULT_FEE_COMBO);
    event.setFeeAbsolute(DEFAULT_FEE_ABSOLUTE);
    return eventRepository.save(event);
  }

  private Athlete ensureAthlete(EventRegistration registration) {
    if (registration == null || registration.getEvent() == null) return null;
    return ensureAthlete(
        registration.getEvent(),
        registration.getNome(),
        registration.getCategoria(),
        registration.getFaixa(),
        registration.getPeso(),
        registration.getAcademia(),
        registration.getGenero(),
        registration.getModalidade()
    );
  }

  private Athlete ensureAthlete(
      Event event,
      String nomeRaw,
      String categoriaRaw,
      String faixaRaw,
      String pesoRaw,
      String academiaRaw,
      String generoRaw,
      String modalidadeRaw
  ) {
    String nome = required(nomeRaw, "Nome completo é obrigatório.");
    String categoria = clean(categoriaRaw);
    String faixa = clean(faixaRaw);
    String peso = clean(pesoRaw);
    String academia = clean(academiaRaw);

    Optional<Athlete> existing = athleteRepository.findByEvent_Id(event.getId()).stream()
        .filter((athlete) -> equalsNormalized(athlete.getNome(), nome))
        .filter((athlete) -> equalsNormalized(athlete.getCategoria(), categoria))
        .filter((athlete) -> equalsNormalized(athlete.getFaixa(), faixa))
        .filter((athlete) -> equalsNormalized(athlete.getPeso(), peso))
        .filter((athlete) -> equalsNormalized(athlete.getAcademia(), academia))
        .findFirst();

    if (existing.isPresent()) {
      return existing.get();
    }

    Athlete athlete = new Athlete();
    athlete.setEvent(event);
    athlete.setNome(nome);
    athlete.setCategoria(categoria);
    athlete.setFaixa(faixa);
    athlete.setPeso(peso);
    athlete.setAcademia(academia);
    athlete.setGenero(clean(generoRaw));
    athlete.setNoGi("NO-GI".equalsIgnoreCase(normalizeMode(modalidadeRaw)));
    athlete.setAbsolute(categoria.toLowerCase(Locale.ROOT).contains("absolut"));
    athlete.setPontos(0);
    return athleteRepository.save(athlete);
  }

  private PublicRegistrationResponse toResponse(EventRegistration registration, String athleteId) {
    PublicRegistrationResponse response = new PublicRegistrationResponse();
    Event event = registration.getEvent();
    response.setId(registration.getId());
    response.setEventId(event != null ? event.getId() : null);
    response.setClientRequestId(registration.getClientRequestId());
    response.setEventName(event != null ? event.getName() : null);
    response.setEventDate(event != null && event.getDate() != null ? event.getDate().toString() : null);
    response.setEventLocation(event != null ? event.getLocation() : null);
    response.setNome(registration.getNome());
    response.setProfileId(registration.getProfileId());
    response.setEmail(registration.getEmail());
    response.setPhone(registration.getPhone());
    response.setAcademia(registration.getAcademia());
    response.setFaixa(registration.getFaixa());
    response.setPeso(registration.getPeso());
    response.setCategoria(registration.getCategoria());
    response.setGenero(registration.getGenero());
    response.setModalidade(registration.getModalidade());
    RegistrationPaymentStatus status = RegistrationPaymentStatus.fromStored(registration.getStatus());
    response.setStatus(status.name());
    response.setNotes(registration.getNotes());
    response.setCreatedAt(registration.getCreatedAt() != null ? registration.getCreatedAt().toString() : null);
    response.setAthleteId(athleteId);
    response.setPaymentReviewNotes(registration.getPaymentReviewNotes());
    response.setPaymentReviewedBy(registration.getPaymentReviewedBy());
    response.setPaymentReviewedAt(
        registration.getPaymentReviewedAt() != null ? registration.getPaymentReviewedAt().toString() : null
    );
    return response;
  }

  private Optional<EventRegistration> findDuplicateRegistration(
      String eventId,
      String profileId,
      String sourceAthleteId,
      String nome,
      String email,
      String academia
  ) {
    String normalizedEventId = clean(eventId);
    if (normalizedEventId.isBlank()) return Optional.empty();

    String normalizedProfileId = clean(profileId);
    String normalizedSourceAthleteId = clean(sourceAthleteId);
    String normalizedNome = clean(nome);
    String normalizedEmail = clean(email);
    String normalizedAcademia = clean(academia);

    return registrationRepository.findByEvent_Id(normalizedEventId).stream()
        .filter((registration) -> {
          String existingProfileId = clean(registration.getProfileId());
          if (!normalizedProfileId.isBlank() && !existingProfileId.isBlank()) {
            return existingProfileId.equalsIgnoreCase(normalizedProfileId);
          }

          String existingSourceAthleteId = clean(registration.getSourceAthleteId());
          if (!normalizedSourceAthleteId.isBlank() && !existingSourceAthleteId.isBlank()) {
            return existingSourceAthleteId.equalsIgnoreCase(normalizedSourceAthleteId);
          }

          if (!normalizedEmail.isBlank() && !clean(registration.getEmail()).isBlank()) {
            return equalsNormalized(registration.getEmail(), normalizedEmail)
                && equalsNormalized(registration.getNome(), normalizedNome);
          }

          return equalsNormalized(registration.getNome(), normalizedNome)
              && equalsNormalized(registration.getAcademia(), normalizedAcademia);
        })
        .findFirst();
  }

  private String resolveAthleteIdIfConfirmed(
      EventRegistration registration,
      Map<String, List<Athlete>> athletesByEvent
  ) {
    RegistrationPaymentStatus status = RegistrationPaymentStatus.fromStored(registration.getStatus());
    if (!RegistrationPaymentStatus.PAYMENT_CONFIRMED.equals(status)) return null;
    return resolveAthleteId(registration, athletesByEvent);
  }

  private String resolveAthleteId(EventRegistration registration, Map<String, List<Athlete>> athletesByEvent) {
    String eventId = registration.getEvent() != null ? registration.getEvent().getId() : "";
    if (eventId == null || eventId.isBlank()) return null;

    List<Athlete> eventAthletes = athletesByEvent.computeIfAbsent(eventId, athleteRepository::findByEvent_Id);
    return eventAthletes.stream()
        .filter((athlete) -> equalsNormalized(athlete.getNome(), registration.getNome()))
        .filter((athlete) -> equalsNormalized(athlete.getCategoria(), registration.getCategoria()))
        .filter((athlete) -> equalsNormalized(athlete.getFaixa(), registration.getFaixa()))
        .filter((athlete) -> equalsNormalized(athlete.getPeso(), registration.getPeso()))
        .filter((athlete) -> equalsNormalized(athlete.getAcademia(), registration.getAcademia()))
        .map(Athlete::getId)
        .findFirst()
        .orElse(null);
  }

  private String clean(String value) {
    return value == null ? "" : value.trim();
  }

  private String required(String value, String message) {
    String normalized = clean(value);
    if (normalized.isBlank()) {
      throw new IllegalArgumentException(message);
    }
    return normalized;
  }

  private boolean equalsNormalized(String left, String right) {
    return clean(left).equalsIgnoreCase(clean(right));
  }

  private String normalizeMode(String value) {
    String mode = clean(value).toUpperCase(Locale.ROOT);
    if (mode.isBlank()) return "GI";
    if ("NOGI".equals(mode)) return "NO-GI";
    if ("NO-GI".equals(mode)) return "NO-GI";
    return "GI";
  }

  private LocalDate parseDate(String value) {
    String text = clean(value);
    if (text.isBlank()) return null;
    try {
      return LocalDate.parse(text);
    } catch (DateTimeParseException ex) {
      return null;
    }
  }
}
