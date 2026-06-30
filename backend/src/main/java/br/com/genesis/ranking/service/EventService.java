package br.com.genesis.ranking.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import br.com.genesis.ranking.dto.EventBatchDto;
import br.com.genesis.ranking.dto.EventRequest;
import br.com.genesis.ranking.dto.EventResponse;
import br.com.genesis.ranking.dto.SuperFightDto;
import br.com.genesis.ranking.model.Event;
import br.com.genesis.ranking.repository.EventRepository;

@Service
public class EventService {
  private static final String DEFAULT_PIX_KEY = "594.343.682-00 (LEAN AUGUSTO CHAVES PEREIRA)";
  private static final double DEFAULT_FEE_UNDER_15 = 120.0;
  private static final double DEFAULT_FEE_OVER_15 = 140.0;
  private static final double DEFAULT_FEE_COMBO = 240.0;
  private static final double DEFAULT_FEE_ABSOLUTE = 30.0;
  private static final String DEFAULT_BELT_REGISTRATION_TITLE = "Cinturao";

  private final EventRepository eventRepository;
  private final EventAnnouncementEmailService eventAnnouncementEmailService;
  private final ObjectMapper objectMapper;

  public EventService(
      EventRepository eventRepository,
      EventAnnouncementEmailService eventAnnouncementEmailService,
      ObjectMapper objectMapper
  ) {
    this.eventRepository = eventRepository;
    this.eventAnnouncementEmailService = eventAnnouncementEmailService;
    this.objectMapper = objectMapper;
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
    return create(request, true);
  }

  public EventResponse create(EventRequest request, boolean notifySubscribers) {
    Event event = new Event();
    if (request.getId() != null && !request.getId().isBlank()) {
      event.setId(request.getId().trim());
    }
    apply(event, request);
    Event createdEvent = eventRepository.save(event);
    EventAnnouncementEmailService.AnnouncementReport announcementReport = EventAnnouncementEmailService.AnnouncementReport.skipped();
    if (notifySubscribers) {
      announcementReport = eventAnnouncementEmailService.sendNewEventAnnouncement(createdEvent);
    }
    EventResponse response = toResponse(createdEvent);
    response.setAnnouncementAttempted(announcementReport.isAttempted());
    response.setAnnouncementRecipients(announcementReport.getRecipients());
    response.setAnnouncementSent(announcementReport.getSent());
    response.setAnnouncementFailed(announcementReport.getFailed());
    return response;
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
        .orElseThrow(() -> new IllegalArgumentException("Evento não encontrado."));
  }

  private void apply(Event event, EventRequest request) {
    event.setName(request.getName().trim());
    event.setLocation(request.getLocation() == null ? null : request.getLocation().trim());
    event.setAccommodationEnabled(Boolean.TRUE.equals(request.getAccommodationEnabled()));
    event.setAccommodationTitle(trimOrFallback(request.getAccommodationTitle(), "Onde Ficar"));
    event.setAccommodationDescription(trimOrNull(request.getAccommodationDescription()));
    event.setAccommodationSearchLocation(trimOrNull(request.getAccommodationSearchLocation()));
    event.setPosterUrl(request.getPosterUrl() == null ? null : request.getPosterUrl().trim());
    event.setRegistrationUrl(request.getRegistrationUrl() == null ? null : request.getRegistrationUrl().trim());
    String pixKey = request.getPixKey() == null ? "" : request.getPixKey().trim();
    event.setPixKey(pixKey.isBlank() ? DEFAULT_PIX_KEY : pixKey);
    event.setFeeUnder15(resolveFee(request.getFeeUnder15(), DEFAULT_FEE_UNDER_15));
    event.setFeeOver15(resolveFee(request.getFeeOver15(), DEFAULT_FEE_OVER_15));
    event.setFeeCombo(resolveFee(request.getFeeCombo(), DEFAULT_FEE_COMBO));
    event.setFeeAbsolute(resolveFee(request.getFeeAbsolute(), DEFAULT_FEE_ABSOLUTE));
    event.setBeltRegistrationEnabled(Boolean.TRUE.equals(request.getBeltRegistrationEnabled()));
    event.setBeltRegistrationTitle(trimOrFallback(request.getBeltRegistrationTitle(), DEFAULT_BELT_REGISTRATION_TITLE));
    event.setBeltRegistrationPrice(resolveFee(request.getBeltRegistrationPrice(), 0.0));
    event.setBeltRegistrationDescription(trimOrNull(request.getBeltRegistrationDescription()));
    event.setBeltRegistrationPhone(trimOrNull(request.getBeltRegistrationPhone()));
    event.setMaxAthletes(request.getMaxAthletes());
    event.setCloseOnCapacity(Boolean.TRUE.equals(request.getCloseOnCapacity()));
    event.setEventDescription(trimOrNull(request.getEventDescription()));
    event.setBatchesJson(writeBatches(normalizeBatches(
        request.getBatches(),
        event.getFeeUnder15(),
        event.getFeeOver15(),
        event.getFeeCombo(),
        event.getFeeAbsolute()
    )));
    event.setSuperFightsJson(writeSuperFights(request.getSuperFights()));
    event.setSuperFightsPublished(Boolean.TRUE.equals(request.getSuperFightsPublished()));
    event.setRegistrationOpen(request.getRegistrationOpen() == null ? true : request.getRegistrationOpen());
    event.setInternalRegistration(request.getInternalRegistration() == null ? true : request.getInternalRegistration());
    event.setDate(parseDate(request.getDate()));
    event.setEndDate(parseDate(request.getEndDate()));
  }

  private LocalDate parseDate(String value) {
    if (value == null || value.isBlank()) return null;
    try {
      return LocalDate.parse(value.trim());
    } catch (DateTimeParseException ex) {
      throw new IllegalArgumentException("Data inválida. Use o formato YYYY-MM-DD.");
    }
  }

  public EventResponse toResponse(Event event) {
    EventResponse response = new EventResponse();
    response.setId(event.getId());
    response.setName(event.getName());
    response.setLocation(event.getLocation());
    response.setDate(event.getDate() != null ? event.getDate().toString() : null);
    response.setEndDate(event.getEndDate() != null ? event.getEndDate().toString() : null);
    response.setAccommodationEnabled(Boolean.TRUE.equals(event.getAccommodationEnabled()));
    response.setAccommodationTitle(trimOrFallback(event.getAccommodationTitle(), "Onde Ficar"));
    response.setAccommodationDescription(trimOrNull(event.getAccommodationDescription()));
    response.setAccommodationSearchLocation(trimOrNull(event.getAccommodationSearchLocation()));
    response.setPosterUrl(event.getPosterUrl());
    response.setRegistrationUrl(event.getRegistrationUrl());
    response.setPixKey((event.getPixKey() == null || event.getPixKey().isBlank()) ? DEFAULT_PIX_KEY : event.getPixKey());
    response.setFeeUnder15(resolveFee(event.getFeeUnder15(), DEFAULT_FEE_UNDER_15));
    response.setFeeOver15(resolveFee(event.getFeeOver15(), DEFAULT_FEE_OVER_15));
    response.setFeeCombo(resolveFee(event.getFeeCombo(), DEFAULT_FEE_COMBO));
    response.setFeeAbsolute(resolveFee(event.getFeeAbsolute(), DEFAULT_FEE_ABSOLUTE));
    response.setBeltRegistrationEnabled(Boolean.TRUE.equals(event.getBeltRegistrationEnabled()));
    response.setBeltRegistrationTitle(trimOrFallback(event.getBeltRegistrationTitle(), DEFAULT_BELT_REGISTRATION_TITLE));
    response.setBeltRegistrationPrice(resolveFee(event.getBeltRegistrationPrice(), 0.0));
    response.setBeltRegistrationDescription(trimOrNull(event.getBeltRegistrationDescription()));
    response.setBeltRegistrationPhone(trimOrNull(event.getBeltRegistrationPhone()));
    response.setMaxAthletes(event.getMaxAthletes());
    response.setCloseOnCapacity(Boolean.TRUE.equals(event.getCloseOnCapacity()));
    response.setEventDescription(trimOrNull(event.getEventDescription()));
    List<EventBatchDto> batches = resolveBatchStates(readBatches(event.getBatchesJson()), LocalDateTime.now());
    EventBatchDto activeBatch = batches.stream()
        .filter(batch -> Boolean.TRUE.equals(batch.getActive()))
        .findFirst()
        .orElse(null);
    response.setBatches(batches);
    response.setActiveBatch(activeBatch);
    response.setCurrentRegistrationPrice(
        activeBatch != null && activeBatch.getPrice() != null
            ? resolveFee(activeBatch.getPrice(), DEFAULT_FEE_OVER_15)
            : response.getFeeOver15()
    );
    response.setNextBatchChangeAt(resolveNextBatchChangeAt(batches));
    response.setSuperFights(readSuperFights(event.getSuperFightsJson()));
    response.setSuperFightsPublished(Boolean.TRUE.equals(event.getSuperFightsPublished()));
    response.setRegistrationOpen(Boolean.TRUE.equals(event.getRegistrationOpen()));
    response.setInternalRegistration(Boolean.TRUE.equals(event.getInternalRegistration()));
    return response;
  }

  @Scheduled(cron = "0 0 0 * * *")
  public void refreshBatchStatesAtMidnight() {
    LocalDateTime now = LocalDateTime.now();
    List<Event> events = eventRepository.findAll();
    for (Event event : events) {
      List<EventBatchDto> current = readBatches(event.getBatchesJson());
      if (current.isEmpty()) continue;
      event.setBatchesJson(writeBatches(resolveBatchStates(current, now)));
      eventRepository.save(event);
    }
  }

  private List<EventBatchDto> normalizeBatches(
      List<EventBatchDto> batches,
      Double feeUnder15Fallback,
      Double feeOver15Fallback,
      Double feeComboFallback,
      Double feeAbsoluteFallback
  ) {
    if (batches == null) return List.of();
    List<EventBatchDto> normalized = new ArrayList<>();
    for (int index = 0; index < batches.size(); index += 1) {
      EventBatchDto source = batches.get(index);
      if (source == null) continue;
      EventBatchDto batch = new EventBatchDto();
      batch.setId(trimOrFallback(source.getId(), "batch-" + (index + 1)));
      batch.setName(trimOrFallback(source.getName(), "Lote " + (index + 1)));
      batch.setStartDate(trimOrNull(source.getStartDate()));
      batch.setEndDate(trimOrNull(source.getEndDate()));
      double under15 = resolveFee(source.getFeeUnder15(), resolveFee(feeUnder15Fallback, DEFAULT_FEE_UNDER_15));
      double over15 = resolveFee(
          source.getFeeOver15(),
          resolveFee(source.getPrice(), resolveFee(feeOver15Fallback, DEFAULT_FEE_OVER_15))
      );
      batch.setFeeUnder15(under15);
      batch.setFeeOver15(over15);
      batch.setFeeCombo(resolveFee(source.getFeeCombo(), resolveFee(feeComboFallback, DEFAULT_FEE_COMBO)));
      batch.setFeeAbsolute(resolveFee(source.getFeeAbsolute(), resolveFee(feeAbsoluteFallback, DEFAULT_FEE_ABSOLUTE)));
      batch.setPrice(over15);
      batch.setActive(Boolean.TRUE.equals(source.getActive()));
      normalized.add(batch);
    }
    return resolveBatchStates(normalized, LocalDateTime.now());
  }

  private List<EventBatchDto> resolveBatchStates(List<EventBatchDto> batches, LocalDateTime now) {
    if (batches == null || batches.isEmpty()) return List.of();
    EventBatchDto activeByDate = null;
    for (EventBatchDto batch : batches) {
      LocalDateTime start = parseDateStart(batch.getStartDate());
      LocalDateTime end = parseDateEnd(batch.getEndDate());
      boolean started = start == null || !now.isBefore(start);
      boolean notEnded = end == null || !now.isAfter(end);
      if (started && notEnded) {
        activeByDate = batch;
        break;
      }
    }
    EventBatchDto fallbackActive = activeByDate != null
        ? activeByDate
        : batches.stream().filter(batch -> Boolean.TRUE.equals(batch.getActive())).findFirst().orElse(batches.get(0));
    for (EventBatchDto batch : batches) {
      LocalDateTime end = parseDateEnd(batch.getEndDate());
      boolean isActive = batch == fallbackActive;
      batch.setActive(isActive);
      if (isActive) {
        batch.setStatus("ACTIVE");
      } else if (end != null && now.isAfter(end)) {
        batch.setStatus("EXPIRED");
      } else {
        batch.setStatus("UPCOMING");
      }
    }
    return batches;
  }

  private List<EventBatchDto> readBatches(String batchesJson) {
    if (batchesJson == null || batchesJson.isBlank()) return List.of();
    try {
      return objectMapper.readValue(batchesJson, new TypeReference<List<EventBatchDto>>() {});
    } catch (JsonProcessingException ex) {
      return List.of();
    }
  }

  private String writeBatches(List<EventBatchDto> batches) {
    try {
      return objectMapper.writeValueAsString(batches == null ? List.of() : batches);
    } catch (JsonProcessingException ex) {
      throw new IllegalArgumentException("Lotes invalidos para o evento.");
    }
  }

  private List<SuperFightDto> readSuperFights(String superFightsJson) {
    if (superFightsJson == null || superFightsJson.isBlank()) return List.of();
    try {
      return objectMapper.readValue(superFightsJson, new TypeReference<List<SuperFightDto>>() {});
    } catch (JsonProcessingException ex) {
      return List.of();
    }
  }

  private String writeSuperFights(List<SuperFightDto> superFights) {
    try {
      return objectMapper.writeValueAsString(superFights == null ? List.of() : superFights);
    } catch (JsonProcessingException ex) {
      throw new IllegalArgumentException("Lutas Casadas invalidas para o evento.");
    }
  }

  private String resolveNextBatchChangeAt(List<EventBatchDto> batches) {
    if (batches == null) return null;
    return batches.stream()
        .filter(batch -> Boolean.TRUE.equals(batch.getActive()))
        .map(EventBatchDto::getEndDate)
        .filter(value -> value != null && !value.isBlank())
        .findFirst()
        .map(value -> LocalDate.parse(value).atTime(LocalTime.MAX).format(DateTimeFormatter.ISO_LOCAL_DATE_TIME))
        .orElse(null);
  }

  private LocalDateTime parseDateStart(String value) {
    if (value == null || value.isBlank()) return null;
    return LocalDate.parse(value.trim()).atStartOfDay();
  }

  private LocalDateTime parseDateEnd(String value) {
    if (value == null || value.isBlank()) return null;
    return LocalDate.parse(value.trim()).atTime(LocalTime.MAX);
  }

  private String trimOrNull(String value) {
    if (value == null) return null;
    String trimmed = value.trim();
    return trimmed.isBlank() ? null : trimmed;
  }

  private String trimOrFallback(String value, String fallback) {
    String trimmed = trimOrNull(value);
    return trimmed == null ? fallback : trimmed;
  }

  private Double resolveFee(Double value, double fallback) {
    if (value == null || !Double.isFinite(value) || value < 0) {
      return fallback;
    }
    return Math.round(value * 100.0) / 100.0;
  }
}
