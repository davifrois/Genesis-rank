package br.com.genesis.ranking.service;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import br.com.genesis.ranking.dto.EventRequest;
import br.com.genesis.ranking.dto.EventResponse;
import br.com.genesis.ranking.model.Event;
import br.com.genesis.ranking.repository.EventRepository;

@Service
public class EventService {
  private static final String DEFAULT_PIX_KEY = "594.343.682-00 (LEAN AUGUSTO CHAVES PEREIRA)";
  private static final double DEFAULT_FEE_UNDER_15 = 120.0;
  private static final double DEFAULT_FEE_OVER_15 = 140.0;
  private static final double DEFAULT_FEE_COMBO = 240.0;
  private static final double DEFAULT_FEE_ABSOLUTE = 30.0;

  private final EventRepository eventRepository;

  public EventService(EventRepository eventRepository) {
    this.eventRepository = eventRepository;
  }

  public List<EventResponse> listAll() {
    return eventRepository.findAll().stream()
        .map(this::toResponse)
        .collect(Collectors.toList());
  }

  public EventResponse getById(String id) {
    return toResponse(getOrThrow(id));
  }

  public EventResponse create(EventRequest request) {
    Event event = new Event();
    if (request.getId() != null && !request.getId().isBlank()) {
      event.setId(request.getId().trim());
    }
    apply(event, request);
    return toResponse(eventRepository.save(event));
  }

  public EventResponse update(String id, EventRequest request) {
    Event event = getOrThrow(id);
    apply(event, request);
    return toResponse(eventRepository.save(event));
  }

  public void delete(String id) {
    Event event = getOrThrow(id);
    eventRepository.delete(event);
  }

  public Event getOrThrow(String id) {
    return eventRepository.findById(id)
        .orElseThrow(() -> new IllegalArgumentException("Evento nao encontrado."));
  }

  private void apply(Event event, EventRequest request) {
    event.setName(request.getName().trim());
    event.setLocation(request.getLocation() == null ? null : request.getLocation().trim());
    event.setPosterUrl(request.getPosterUrl() == null ? null : request.getPosterUrl().trim());
    event.setRegistrationUrl(request.getRegistrationUrl() == null ? null : request.getRegistrationUrl().trim());
    String pixKey = request.getPixKey() == null ? "" : request.getPixKey().trim();
    event.setPixKey(pixKey.isBlank() ? DEFAULT_PIX_KEY : pixKey);
    event.setFeeUnder15(resolveFee(request.getFeeUnder15(), DEFAULT_FEE_UNDER_15));
    event.setFeeOver15(resolveFee(request.getFeeOver15(), DEFAULT_FEE_OVER_15));
    event.setFeeCombo(resolveFee(request.getFeeCombo(), DEFAULT_FEE_COMBO));
    event.setFeeAbsolute(resolveFee(request.getFeeAbsolute(), DEFAULT_FEE_ABSOLUTE));
    event.setRegistrationOpen(request.getRegistrationOpen() == null ? true : request.getRegistrationOpen());
    event.setInternalRegistration(request.getInternalRegistration() == null ? true : request.getInternalRegistration());
    event.setDate(parseDate(request.getDate()));
  }

  private LocalDate parseDate(String value) {
    if (value == null || value.isBlank()) return null;
    try {
      return LocalDate.parse(value.trim());
    } catch (DateTimeParseException ex) {
      throw new IllegalArgumentException("Data invalida. Use formato YYYY-MM-DD.");
    }
  }

  public EventResponse toResponse(Event event) {
    EventResponse response = new EventResponse();
    response.setId(event.getId());
    response.setName(event.getName());
    response.setLocation(event.getLocation());
    response.setDate(event.getDate() != null ? event.getDate().toString() : null);
    response.setPosterUrl(event.getPosterUrl());
    response.setRegistrationUrl(event.getRegistrationUrl());
    response.setPixKey((event.getPixKey() == null || event.getPixKey().isBlank()) ? DEFAULT_PIX_KEY : event.getPixKey());
    response.setFeeUnder15(resolveFee(event.getFeeUnder15(), DEFAULT_FEE_UNDER_15));
    response.setFeeOver15(resolveFee(event.getFeeOver15(), DEFAULT_FEE_OVER_15));
    response.setFeeCombo(resolveFee(event.getFeeCombo(), DEFAULT_FEE_COMBO));
    response.setFeeAbsolute(resolveFee(event.getFeeAbsolute(), DEFAULT_FEE_ABSOLUTE));
    response.setRegistrationOpen(event.isRegistrationOpen());
    response.setInternalRegistration(event.isInternalRegistration());
    return response;
  }

  private Double resolveFee(Double value, double fallback) {
    if (value == null || !Double.isFinite(value) || value < 0) {
      return fallback;
    }
    return Math.round(value * 100.0) / 100.0;
  }
}
