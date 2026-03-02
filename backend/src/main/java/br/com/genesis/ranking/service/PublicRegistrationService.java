package br.com.genesis.ranking.service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.genesis.ranking.dto.PublicRegistrationRequest;
import br.com.genesis.ranking.dto.PublicRegistrationResponse;
import br.com.genesis.ranking.dto.RegistrationPaymentStatusRequest;
import br.com.genesis.ranking.model.Athlete;
import br.com.genesis.ranking.model.Event;
import br.com.genesis.ranking.model.EventRegistration;
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
  private static final String STATUS_PENDING = "PENDING";
  private static final String STATUS_PAYMENT_CONFIRMED = "PAYMENT_CONFIRMED";
  private static final String STATUS_PAYMENT_ERROR = "PAYMENT_ERROR";
  private static final Set<String> VALID_PAYMENT_STATUSES = Set.of(
      STATUS_PENDING,
      STATUS_PAYMENT_CONFIRMED,
      STATUS_PAYMENT_ERROR
  );

  private final EventRepository eventRepository;
  private final EventRegistrationRepository registrationRepository;
  private final AthleteRepository athleteRepository;

  public PublicRegistrationService(
      EventRepository eventRepository,
      EventRegistrationRepository registrationRepository,
      AthleteRepository athleteRepository
  ) {
    this.eventRepository = eventRepository;
    this.registrationRepository = registrationRepository;
    this.athleteRepository = athleteRepository;
  }

  public PublicRegistrationResponse register(PublicRegistrationRequest request) {
    String eventId = clean(request.getEventId());
    if (eventId.isBlank()) {
      throw new IllegalArgumentException("Evento invalido.");
    }

    Event event = resolveEvent(eventId, request);
    if (!event.isRegistrationOpen()) {
      throw new IllegalArgumentException("Inscricoes fechadas para este evento.");
    }

    EventRegistration registration = new EventRegistration();
    registration.setEvent(event);
    registration.setNome(required(request.getNome(), "Nome completo e obrigatorio."));
    registration.setEmail(clean(request.getEmail()));
    registration.setPhone(clean(request.getPhone()));
    registration.setAcademia(clean(request.getAcademia()));
    registration.setFaixa(clean(request.getFaixa()));
    registration.setPeso(clean(request.getPeso()));
    registration.setCategoria(clean(request.getCategoria()));
    registration.setGenero(clean(request.getGenero()));
    registration.setModalidade(normalizeMode(request.getModalidade()));
    registration.setNotes(clean(request.getNotes()));
    registration.setStatus(STATUS_PENDING);

    EventRegistration saved = registrationRepository.save(registration);
    return toResponse(saved, null);
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
          String status = clean(registration.getStatus()).toUpperCase(Locale.ROOT);
          String athleteId = null;
          if (STATUS_PAYMENT_CONFIRMED.equals(status)) {
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
      throw new IllegalArgumentException("Inscricao nao encontrada.");
    }

    EventRegistration registration = registrationRepository.findById(normalizedRegistrationId)
        .orElseThrow(() -> new IllegalArgumentException("Inscricao nao encontrada."));

    String normalizedStatus = normalizePaymentStatus(request.getStatus());
    registration.setStatus(normalizedStatus);
    registration.setPaymentReviewNotes(clean(request.getReviewNotes()));
    registration.setPaymentReviewedBy(clean(request.getReviewedBy()));
    registration.setPaymentReviewedAt(Instant.now());

    EventRegistration saved = registrationRepository.save(registration);
    String athleteId = null;
    if (STATUS_PAYMENT_CONFIRMED.equals(normalizedStatus)) {
      Athlete athlete = ensureAthlete(saved);
      athleteId = athlete != null ? athlete.getId() : null;
      if (athleteId == null) {
        athleteId = resolveAthleteId(saved, new HashMap<>());
      }
    }
    return toResponse(saved, athleteId);
  }

  private Event resolveEvent(String eventId, PublicRegistrationRequest request) {
    Optional<Event> existing = eventRepository.findById(eventId);
    if (existing.isPresent()) return existing.get();

    Event event = new Event();
    event.setId(eventId);
    event.setName(required(request.getEventName(), "Nome do evento nao informado."));
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
    String nome = required(nomeRaw, "Nome completo e obrigatorio.");
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
    response.setEventName(event != null ? event.getName() : null);
    response.setEventDate(event != null && event.getDate() != null ? event.getDate().toString() : null);
    response.setEventLocation(event != null ? event.getLocation() : null);
    response.setNome(registration.getNome());
    response.setEmail(registration.getEmail());
    response.setPhone(registration.getPhone());
    response.setAcademia(registration.getAcademia());
    response.setFaixa(registration.getFaixa());
    response.setPeso(registration.getPeso());
    response.setCategoria(registration.getCategoria());
    response.setGenero(registration.getGenero());
    response.setModalidade(registration.getModalidade());
    String status = clean(registration.getStatus()).toUpperCase(Locale.ROOT);
    response.setStatus(VALID_PAYMENT_STATUSES.contains(status) ? status : STATUS_PENDING);
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

  private String normalizePaymentStatus(String value) {
    String normalized = clean(value)
        .toUpperCase(Locale.ROOT)
        .replace('-', '_')
        .replace(' ', '_');
    if (normalized.isBlank()) {
      throw new IllegalArgumentException("Status de pagamento invalido.");
    }
    if (
        "PENDENTE".equals(normalized)
        || "PENDING_REVIEW".equals(normalized)
        || "PENDING".equals(normalized)
    ) {
      return STATUS_PENDING;
    }
    if (
        "PAGO".equals(normalized)
        || "CONFIRMADO".equals(normalized)
        || "PAGAMENTO_CONFIRMADO".equals(normalized)
        || "PAYMENT_CONFIRMED".equals(normalized)
    ) {
      return STATUS_PAYMENT_CONFIRMED;
    }
    if (
        "ERRO".equals(normalized)
        || "RECUSADO".equals(normalized)
        || "PAGAMENTO_ERRO".equals(normalized)
        || "PAYMENT_ERROR".equals(normalized)
    ) {
      return STATUS_PAYMENT_ERROR;
    }
    throw new IllegalArgumentException("Status de pagamento invalido.");
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
