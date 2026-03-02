package br.com.genesis.ranking.service;

import java.time.Instant;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import br.com.genesis.ranking.dto.AthleteRequest;
import br.com.genesis.ranking.dto.AthleteResponse;
import br.com.genesis.ranking.dto.HistoryItemDto;
import br.com.genesis.ranking.model.Athlete;
import br.com.genesis.ranking.model.AthleteHistory;
import br.com.genesis.ranking.model.Event;
import br.com.genesis.ranking.model.enums.HistoryType;
import br.com.genesis.ranking.repository.AthleteRepository;

@Service
public class AthleteService {
  private final AthleteRepository athleteRepository;
  private final EventService eventService;
  private final ScoringService scoringService;

  public AthleteService(AthleteRepository athleteRepository, EventService eventService, ScoringService scoringService) {
    this.athleteRepository = athleteRepository;
    this.eventService = eventService;
    this.scoringService = scoringService;
  }

  public List<AthleteResponse> listAll(String eventId) {
    List<Athlete> athletes = eventId == null || eventId.isBlank()
        ? athleteRepository.findAll()
        : athleteRepository.findByEvent_Id(eventId);

    return athletes.stream().map(this::toResponse).collect(Collectors.toList());
  }

  public AthleteResponse create(AthleteRequest request) {
    Athlete athlete = new Athlete();
    if (request.getId() != null && !request.getId().isBlank()) {
      athlete.setId(request.getId().trim());
    }
    apply(athlete, request);
    return toResponse(athleteRepository.save(athlete));
  }

  public AthleteResponse update(String id, AthleteRequest request) {
    Athlete athlete = getOrThrow(id);
    apply(athlete, request);
    return toResponse(athleteRepository.save(athlete));
  }

  public void delete(String id) {
    Athlete athlete = getOrThrow(id);
    athleteRepository.delete(athlete);
  }

  public Athlete getOrThrow(String id) {
    return athleteRepository.findById(id)
        .orElseThrow(() -> new IllegalArgumentException("Atleta nao encontrado."));
  }

  private void apply(Athlete athlete, AthleteRequest request) {
    athlete.setNome(request.getNome().trim());
    athlete.setFaixa(trimOrNull(request.getFaixa()));
    athlete.setPeso(trimOrNull(request.getPeso()));
    athlete.setCategoria(trimOrNull(request.getCategoria()));
    athlete.setAcademia(trimOrNull(request.getAcademia()));
    athlete.setGenero(resolveGender(request));
    athlete.setNoGi(request.isNoGi());
    athlete.setAbsolute(request.isAbsolute());
    athlete.setEvent(resolveEvent(request.getEventId()));

    List<AthleteHistory> nextHistory = mapHistory(request.getHistorico(), athlete);
    athlete.getHistorico().clear();
    athlete.getHistorico().addAll(nextHistory);

    int pontos = request.getPontos() == null ? 0 : request.getPontos();
    if (!nextHistory.isEmpty()) {
      pontos = scoringService.calculateTotalPoints(nextHistory);
    }
    athlete.setPontos(pontos);
  }

  private Event resolveEvent(String eventId) {
    if (eventId == null || eventId.isBlank()) return null;
    return eventService.getOrThrow(eventId.trim());
  }

  private String resolveGender(AthleteRequest request) {
    String genero = trimOrNull(request.getGenero());
    if (genero != null && !genero.isBlank()) return genero;
    return trimOrNull(request.getSexo());
  }

  private String trimOrNull(String value) {
    if (value == null) return null;
    String trimmed = value.trim();
    return trimmed.isBlank() ? null : trimmed;
  }

  private List<AthleteHistory> mapHistory(List<HistoryItemDto> items, Athlete athlete) {
    if (items == null) return new ArrayList<>();
    List<AthleteHistory> history = new ArrayList<>();

    for (HistoryItemDto item : items) {
      if (item == null || item.getType() == null) continue;
      HistoryType type = parseType(item.getType());
      if (type == null) continue;

      AthleteHistory record = new AthleteHistory();
      record.setAthlete(athlete);
      record.setType(type);
      record.setPoints(item.getPoints());
      record.setPosition(item.getPosition());
      record.setSource(trimOrNull(item.getSource()));
      record.setBracketId(trimOrNull(item.getBracketId()));
      record.setTimestamp(parseInstant(item.getTimestamp()));
      history.add(record);
    }

    return history;
  }

  private HistoryType parseType(String value) {
    String normalized = value.trim().toUpperCase(Locale.ROOT);
    if (normalized.equals("WIN")) return HistoryType.WIN;
    if (normalized.equals("SEED")) return HistoryType.SEED;
    if (normalized.equals("PODIUM")) return HistoryType.PODIUM;
    return null;
  }

  private Instant parseInstant(String value) {
    if (value == null || value.isBlank()) return null;
    try {
      return Instant.parse(value);
    } catch (DateTimeParseException ex) {
      return null;
    }
  }

  public AthleteResponse toResponse(Athlete athlete) {
    AthleteResponse response = new AthleteResponse();
    response.setId(athlete.getId());
    response.setNome(athlete.getNome());
    response.setFaixa(athlete.getFaixa());
    response.setPeso(athlete.getPeso());
    response.setCategoria(athlete.getCategoria());
    response.setAcademia(athlete.getAcademia());
    response.setGenero(athlete.getGenero());
    response.setNoGi(athlete.isNoGi());
    response.setAbsolute(athlete.isAbsolute());
    response.setPontos(athlete.getPontos());
    response.setEventId(athlete.getEvent() != null ? athlete.getEvent().getId() : null);

    List<HistoryItemDto> history = athlete.getHistorico().stream().map(item -> {
      HistoryItemDto dto = new HistoryItemDto();
      dto.setType(item.getType().name().toLowerCase(Locale.ROOT));
      dto.setPoints(item.getPoints());
      dto.setPosition(item.getPosition());
      dto.setSource(item.getSource());
      dto.setBracketId(item.getBracketId());
      dto.setTimestamp(item.getTimestamp() != null ? item.getTimestamp().toString() : null);
      return dto;
    }).collect(Collectors.toList());

    response.setHistorico(history);
    return response;
  }
}
