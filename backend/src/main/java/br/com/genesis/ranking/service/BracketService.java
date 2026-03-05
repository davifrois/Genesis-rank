package br.com.genesis.ranking.service;

import java.time.Instant;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import br.com.genesis.ranking.dto.BracketRequest;
import br.com.genesis.ranking.dto.BracketResponse;
import br.com.genesis.ranking.dto.PodiumDto;
import br.com.genesis.ranking.model.Athlete;
import br.com.genesis.ranking.model.Bracket;
import br.com.genesis.ranking.model.BracketPodium;
import br.com.genesis.ranking.model.BracketSeed;
import br.com.genesis.ranking.model.Event;
import br.com.genesis.ranking.repository.BracketRepository;

@Service
public class BracketService {
  private final BracketRepository bracketRepository;
  private final EventService eventService;
  private final AthleteService athleteService;

  public BracketService(
      BracketRepository bracketRepository,
      EventService eventService,
      AthleteService athleteService
  ) {
    this.bracketRepository = bracketRepository;
    this.eventService = eventService;
    this.athleteService = athleteService;
  }

  public List<BracketResponse> listAll(String eventId) {
    List<Bracket> brackets = eventId == null || eventId.isBlank()
        ? bracketRepository.findAll()
        : bracketRepository.findByEvent_Id(eventId);

    return brackets.stream().map(this::toResponse).collect(Collectors.toList());
  }

  public BracketResponse create(BracketRequest request) {
    Bracket bracket = new Bracket();
    if (request.getId() != null && !request.getId().isBlank()) {
      bracket.setId(request.getId().trim());
    }
    apply(bracket, request);
    return toResponse(bracketRepository.save(bracket));
  }

  public BracketResponse update(String id, BracketRequest request) {
    Bracket bracket = getOrThrow(id);
    apply(bracket, request);
    return toResponse(bracketRepository.save(bracket));
  }

  public void delete(String id) {
    Bracket bracket = getOrThrow(id);
    bracketRepository.delete(bracket);
  }

  public Bracket getOrThrow(String id) {
    return bracketRepository.findById(id)
        .orElseThrow(() -> new IllegalArgumentException("Chave não encontrada."));
  }

  private void apply(Bracket bracket, BracketRequest request) {
    bracket.setNumber(request.getNumber());
    bracket.setCategoryKey(trimOrNull(request.getCategoryKey()));
    bracket.setLabel(trimOrNull(request.getLabel()));
    bracket.setMode(trimOrNull(request.getMode()));
    bracket.setSize(request.getSize());
    bracket.setAppliedAt(parseInstant(request.getAppliedAt()));
    bracket.setEvent(resolveEvent(request.getEventId()));

    bracket.getSeeds().clear();
    List<String> seedIds = request.getSeedIds();
    if (seedIds != null) {
      int order = 0;
      for (String seedId : seedIds) {
        if (seedId == null || seedId.isBlank()) continue;
        Athlete athlete = athleteService.getOrThrow(seedId.trim());
        BracketSeed seed = new BracketSeed();
        seed.setBracket(bracket);
        seed.setAthlete(athlete);
        seed.setSeedOrder(order++);
        bracket.getSeeds().add(seed);
      }
    }

    if (request.getPodium() != null) {
      BracketPodium podium = bracket.getPodium();
      if (podium == null) {
        podium = new BracketPodium();
        podium.setBracket(bracket);
      }
      PodiumDto payload = request.getPodium();
      podium.setGold(resolveAthlete(payload.getGoldId()));
      podium.setSilver(resolveAthlete(payload.getSilverId()));
      podium.setBronze(resolveAthlete(payload.getBronzeId()));
      bracket.setPodium(podium);
    }
  }

  private Event resolveEvent(String eventId) {
    if (eventId == null || eventId.isBlank()) return null;
    return eventService.getOrThrow(eventId.trim());
  }

  private Athlete resolveAthlete(String athleteId) {
    if (athleteId == null || athleteId.isBlank()) return null;
    return athleteService.getOrThrow(athleteId.trim());
  }

  private Instant parseInstant(String value) {
    if (value == null || value.isBlank()) return null;
    try {
      return Instant.parse(value);
    } catch (DateTimeParseException ex) {
      return null;
    }
  }

  private String trimOrNull(String value) {
    if (value == null) return null;
    String trimmed = value.trim();
    return trimmed.isBlank() ? null : trimmed;
  }

  public BracketResponse toResponse(Bracket bracket) {
    BracketResponse response = new BracketResponse();
    response.setId(bracket.getId());
    response.setNumber(bracket.getNumber());
    response.setEventId(bracket.getEvent() != null ? bracket.getEvent().getId() : null);
    response.setCategoryKey(bracket.getCategoryKey());
    response.setLabel(bracket.getLabel());
    response.setMode(bracket.getMode());
    response.setSize(bracket.getSize());
    response.setAppliedAt(bracket.getAppliedAt() != null ? bracket.getAppliedAt().toString() : null);

    List<String> seedIds = bracket.getSeeds().stream()
        .sorted((a, b) -> Integer.compare(
            a.getSeedOrder() == null ? 0 : a.getSeedOrder(),
            b.getSeedOrder() == null ? 0 : b.getSeedOrder()
        ))
        .map(seed -> seed.getAthlete().getId())
        .collect(Collectors.toList());
    response.setSeedIds(seedIds);

    if (bracket.getPodium() != null) {
      PodiumDto podium = new PodiumDto();
      podium.setGoldId(bracket.getPodium().getGold() != null ? bracket.getPodium().getGold().getId() : null);
      podium.setSilverId(bracket.getPodium().getSilver() != null ? bracket.getPodium().getSilver().getId() : null);
      podium.setBronzeId(bracket.getPodium().getBronze() != null ? bracket.getPodium().getBronze().getId() : null);
      response.setPodium(podium);
    }

    return response;
  }
}
