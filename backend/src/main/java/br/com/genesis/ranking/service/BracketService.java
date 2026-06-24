package br.com.genesis.ranking.service;

import java.time.Instant;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import br.com.genesis.ranking.dto.BracketLiveMatchDto;
import br.com.genesis.ranking.dto.BracketRequest;
import br.com.genesis.ranking.dto.BracketResponse;
import br.com.genesis.ranking.dto.BracketSeedInfoDto;
import br.com.genesis.ranking.dto.PodiumDto;
import br.com.genesis.ranking.model.Athlete;
import br.com.genesis.ranking.model.Bracket;
import br.com.genesis.ranking.model.BracketPodium;
import br.com.genesis.ranking.model.BracketSeed;
import br.com.genesis.ranking.model.Event;
import br.com.genesis.ranking.realtime.BracketLivePublisher;
import br.com.genesis.ranking.repository.BracketRepository;

@Service
public class BracketService {
  private static final TypeReference<List<String>> STRING_LIST_TYPE = new TypeReference<>() {};
  private static final TypeReference<List<BracketLiveMatchDto>> LIVE_MATCH_LIST_TYPE = new TypeReference<>() {};

  private final BracketRepository bracketRepository;
  private final EventService eventService;
  private final AthleteService athleteService;
  private final ObjectMapper objectMapper;
  private final BracketLivePublisher livePublisher;

  public BracketService(
      BracketRepository bracketRepository,
      EventService eventService,
      AthleteService athleteService,
      ObjectMapper objectMapper,
      BracketLivePublisher livePublisher
  ) {
    this.bracketRepository = bracketRepository;
    this.eventService = eventService;
    this.athleteService = athleteService;
    this.objectMapper = objectMapper;
    this.livePublisher = livePublisher;
  }

  public List<BracketResponse> listAll(String eventId) {
    List<Bracket> brackets = eventId == null || eventId.isBlank()
        ? bracketRepository.findAll()
        : bracketRepository.findByEvent_Id(eventId);
    return brackets.stream().map(this::toResponse).collect(Collectors.toList());
  }

  public List<BracketResponse> listPublished(String eventId) {
    List<Bracket> brackets = eventId == null || eventId.isBlank()
        ? bracketRepository.findByPublishedTrue()
        : bracketRepository.findByEvent_IdAndPublishedTrue(eventId);
    return brackets.stream().map(this::toResponse).collect(Collectors.toList());
  }

  public BracketResponse getOnePublished(String id) {
    Bracket bracket = getOrThrow(id);
    if (!bracket.isPublished()) {
      throw new IllegalArgumentException("As chaves deste evento ainda nao foram publicadas.");
    }
    return toResponse(bracket);
  }

  public BracketResponse getOne(String id) {
    return toResponse(getOrThrow(id));
  }

  public BracketResponse create(BracketRequest request) {
    Bracket bracket = new Bracket();
    if (request.getId() != null && !request.getId().isBlank()) {
      bracket.setId(request.getId().trim());
    }
    bracket.setPublished(false);
    apply(bracket, request);
    BracketResponse response = toResponse(bracketRepository.save(bracket));
    livePublisher.publishUpdated(response);
    return response;
  }

  public BracketResponse update(String id, BracketRequest request) {
    Bracket bracket = getOrThrow(id);
    apply(bracket, request);
    BracketResponse response = toResponse(bracketRepository.save(bracket));
    livePublisher.publishUpdated(response);
    return response;
  }

  public BracketResponse updatePodiumOnly(String id, PodiumDto podium, String appliedAtRaw) {
    Bracket bracket = getOrThrow(id);
    applyPodium(bracket, podium);

    Instant appliedAt = parseInstant(appliedAtRaw);
    if (appliedAt != null) {
      bracket.setAppliedAt(appliedAt);
    }

    BracketResponse response = toResponse(bracketRepository.save(bracket));
    livePublisher.publishUpdated(response);
    return response;
  }

  public BracketResponse updateLiveStateOnly(String id, List<BracketLiveMatchDto> liveMatches, List<String> walkovers) {
    Bracket bracket = getOrThrow(id);
    if (liveMatches != null) {
      bracket.setLiveMatchesJson(writeJson(sanitizeLiveMatches(liveMatches)));
    }
    if (walkovers != null) {
      List<String> sanitizedWalkovers = walkovers.stream()
          .map(this::trimOrNull)
          .filter(value -> value != null && !value.isBlank())
          .distinct()
          .collect(Collectors.toList());
      bracket.setWalkoversJson(writeJson(sanitizedWalkovers));
    }
    BracketResponse response = toResponse(bracketRepository.save(bracket));
    livePublisher.publishUpdated(response);
    return response;
  }

  public void delete(String id) {
    Bracket bracket = getOrThrow(id);
    String eventId = bracket.getEvent() != null ? bracket.getEvent().getId() : null;
    bracketRepository.delete(bracket);
    livePublisher.publishDeleted(id, eventId);
  }

  public int setPublishedForEvent(String eventId, boolean isPublished) {
    if (eventId == null || eventId.isBlank()) {
      throw new IllegalArgumentException("Evento nao informado.");
    }

    List<Bracket> brackets = bracketRepository.findByEvent_Id(eventId);
    if (brackets.isEmpty()) {
      livePublisher.publishEventVisibilityChanged(eventId, isPublished, 0);
      return 0;
    }

    brackets.forEach(bracket -> bracket.setPublished(isPublished));
    List<Bracket> saved = bracketRepository.saveAll(brackets);
    List<BracketResponse> responses = saved.stream()
        .map(this::toResponse)
        .collect(Collectors.toList());

    responses.forEach(livePublisher::publishUpdated);
    livePublisher.publishEventVisibilityChanged(eventId, isPublished, responses.size());
    return responses.size();
  }

  public Bracket getOrThrow(String id) {
    return bracketRepository.findById(id)
        .orElseThrow(() -> new IllegalArgumentException("Chave nao encontrada."));
  }

  private void apply(Bracket bracket, BracketRequest request) {
    bracket.setNumber(request.getNumber());
    bracket.setCategoryKey(trimOrNull(request.getCategoryKey()));
    bracket.setLabel(trimOrNull(request.getLabel()));
    bracket.setMode(trimOrNull(request.getMode()));
    bracket.setFormat(trimOrNull(request.getFormat()));
    bracket.setSize(request.getSize());
    bracket.setAppliedAt(parseInstant(request.getAppliedAt()));
    bracket.setEvent(resolveEvent(request.getEventId()));
    if (request.getIsPublished() != null) {
      bracket.setPublished(request.getIsPublished());
    }

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

    List<String> walkovers = request.getWalkovers() == null
        ? new ArrayList<>()
        : request.getWalkovers().stream()
            .map(this::trimOrNull)
            .filter(value -> value != null && !value.isBlank())
            .distinct()
            .collect(Collectors.toList());
    bracket.setWalkoversJson(writeJson(walkovers));

    List<BracketLiveMatchDto> liveMatches = request.getLiveMatches() == null
        ? new ArrayList<>()
        : sanitizeLiveMatches(request.getLiveMatches());
    bracket.setLiveMatchesJson(writeJson(liveMatches));

    applyPodium(bracket, request.getPodium());
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

  private void applyPodium(Bracket bracket, PodiumDto payload) {
    if (payload == null) {
      return;
    }

    Athlete gold = resolveAthlete(payload.getGoldId());
    Athlete silver = resolveAthlete(payload.getSilverId());
    Athlete bronze = resolveAthlete(payload.getBronzeId());

    Set<String> allowedAthleteIds = new HashSet<>(bracket.getSeeds().stream()
        .map(seed -> seed.getAthlete() != null ? seed.getAthlete().getId() : null)
        .filter(id -> id != null && !id.isBlank())
        .collect(Collectors.toSet()));

    ensureAthleteBelongsToBracket(allowedAthleteIds, gold, "ouro");
    ensureAthleteBelongsToBracket(allowedAthleteIds, silver, "prata");
    ensureAthleteBelongsToBracket(allowedAthleteIds, bronze, "bronze");

    BracketPodium podium = bracket.getPodium();
    if (podium == null) {
      podium = new BracketPodium();
      podium.setBracket(bracket);
    }
    podium.setGold(gold);
    podium.setSilver(silver);
    podium.setBronze(bronze);
    bracket.setPodium(podium);
  }

  private void ensureAthleteBelongsToBracket(Set<String> allowedAthleteIds, Athlete athlete, String medal) {
    if (athlete == null) return;
    String athleteId = athlete.getId();
    if (athleteId == null || !allowedAthleteIds.contains(athleteId)) {
      throw new IllegalArgumentException("Atleta de " + medal + " nao pertence a esta chave.");
    }
  }

  private List<BracketLiveMatchDto> sanitizeLiveMatches(List<BracketLiveMatchDto> matches) {
    if (matches == null) return new ArrayList<>();
    return matches.stream()
        .filter(match -> match != null && trimOrNull(match.getId()) != null)
        .map(match -> {
          BracketLiveMatchDto dto = new BracketLiveMatchDto();
          dto.setId(trimOrNull(match.getId()));
          dto.setSlotAId(trimOrNull(match.getSlotAId()));
          dto.setSlotBId(trimOrNull(match.getSlotBId()));
          dto.setWinnerId(trimOrNull(match.getWinnerId()));
          dto.setStatus(trimOrNull(match.getStatus()));
          dto.setArea(trimOrNull(match.getArea()));
          dto.setFightNumber(match.getFightNumber());
          dto.setScheduledAt(trimOrNull(match.getScheduledAt()));
          dto.setScoreA(match.getScoreA());
          dto.setScoreB(match.getScoreB());
          return dto;
        })
        .sorted(Comparator.comparing(
            BracketLiveMatchDto::getFightNumber,
            Comparator.nullsLast(Integer::compareTo)
        ))
        .collect(Collectors.toList());
  }

  private String writeJson(Object value) {
    try {
      return objectMapper.writeValueAsString(value);
    } catch (JsonProcessingException ex) {
      return "[]";
    }
  }

  private List<String> readWalkoversJson(String json) {
    if (json == null || json.isBlank()) return new ArrayList<>();
    try {
      return objectMapper.readValue(json, STRING_LIST_TYPE);
    } catch (JsonProcessingException ex) {
      return new ArrayList<>();
    }
  }

  private List<BracketLiveMatchDto> readLiveMatchesJson(String json) {
    if (json == null || json.isBlank()) return new ArrayList<>();
    try {
      return objectMapper.readValue(json, LIVE_MATCH_LIST_TYPE);
    } catch (JsonProcessingException ex) {
      return new ArrayList<>();
    }
  }

  public BracketResponse toResponse(Bracket bracket) {
    BracketResponse response = new BracketResponse();
    response.setId(bracket.getId());
    response.setNumber(bracket.getNumber());
    response.setEventId(bracket.getEvent() != null ? bracket.getEvent().getId() : null);
    response.setCategoryKey(bracket.getCategoryKey());
    response.setLabel(bracket.getLabel());
    response.setMode(bracket.getMode());
    response.setFormat(bracket.getFormat());
    response.setSize(bracket.getSize());
    response.setIsPublished(bracket.isPublished());
    response.setAppliedAt(bracket.getAppliedAt() != null ? bracket.getAppliedAt().toString() : null);

    List<BracketSeed> orderedSeeds = bracket.getSeeds().stream()
        .sorted((a, b) -> Integer.compare(
            a.getSeedOrder() == null ? 0 : a.getSeedOrder(),
            b.getSeedOrder() == null ? 0 : b.getSeedOrder()
        ))
        .collect(Collectors.toList());

    List<String> seedIds = orderedSeeds.stream()
        .map(seed -> seed.getAthlete() != null ? seed.getAthlete().getId() : null)
        .filter(value -> value != null && !value.isBlank())
        .collect(Collectors.toList());
    response.setSeedIds(seedIds);

    List<BracketSeedInfoDto> seedInfos = orderedSeeds.stream()
        .map(seed -> {
          if (seed.getAthlete() == null) return null;
          BracketSeedInfoDto dto = new BracketSeedInfoDto();
          dto.setAthleteId(seed.getAthlete().getId());
          dto.setAthleteName(seed.getAthlete().getNome());
          dto.setAcademy(seed.getAthlete().getAcademia());
          return dto;
        })
        .filter(dto -> dto != null && dto.getAthleteId() != null)
        .collect(Collectors.toList());
    response.setSeedInfos(seedInfos);

    response.setWalkovers(readWalkoversJson(bracket.getWalkoversJson()));
    response.setLiveMatches(readLiveMatchesJson(bracket.getLiveMatchesJson()));

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
