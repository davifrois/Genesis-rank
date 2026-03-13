package br.com.genesis.ranking.service;

import java.time.Instant;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.genesis.ranking.dto.AthleteRequest;
import br.com.genesis.ranking.dto.BracketRequest;
import br.com.genesis.ranking.dto.EventRequest;
import br.com.genesis.ranking.dto.ImportPayloadDto;
import br.com.genesis.ranking.dto.ImportResultDto;
import br.com.genesis.ranking.dto.RankHistoryEntryDto;
import br.com.genesis.ranking.model.Athlete;
import br.com.genesis.ranking.model.RankHistory;
import br.com.genesis.ranking.repository.AthleteHistoryRepository;
import br.com.genesis.ranking.repository.AthleteRepository;
import br.com.genesis.ranking.repository.BracketPodiumRepository;
import br.com.genesis.ranking.repository.BracketRepository;
import br.com.genesis.ranking.repository.BracketSeedRepository;
import br.com.genesis.ranking.repository.EventRepository;
import br.com.genesis.ranking.repository.RankHistoryRepository;

@Service
public class ImportService {
  private final EventService eventService;
  private final AthleteService athleteService;
  private final BracketService bracketService;
  private final EventRepository eventRepository;
  private final AthleteRepository athleteRepository;
  private final BracketRepository bracketRepository;
  private final BracketSeedRepository bracketSeedRepository;
  private final BracketPodiumRepository bracketPodiumRepository;
  private final AthleteHistoryRepository athleteHistoryRepository;
  private final RankHistoryRepository rankHistoryRepository;

  public ImportService(
      EventService eventService,
      AthleteService athleteService,
      BracketService bracketService,
      EventRepository eventRepository,
      AthleteRepository athleteRepository,
      BracketRepository bracketRepository,
      BracketSeedRepository bracketSeedRepository,
      BracketPodiumRepository bracketPodiumRepository,
      AthleteHistoryRepository athleteHistoryRepository,
      RankHistoryRepository rankHistoryRepository
  ) {
    this.eventService = eventService;
    this.athleteService = athleteService;
    this.bracketService = bracketService;
    this.eventRepository = eventRepository;
    this.athleteRepository = athleteRepository;
    this.bracketRepository = bracketRepository;
    this.bracketSeedRepository = bracketSeedRepository;
    this.bracketPodiumRepository = bracketPodiumRepository;
    this.athleteHistoryRepository = athleteHistoryRepository;
    this.rankHistoryRepository = rankHistoryRepository;
  }

  @Transactional
  public ImportResultDto importFromLocalStorage(ImportPayloadDto payload, boolean replaceExisting) {
    if (payload == null) {
      throw new IllegalArgumentException("Payload vazio.");
    }

    if (replaceExisting) {
      bracketSeedRepository.deleteAll();
      bracketPodiumRepository.deleteAll();
      bracketRepository.deleteAll();
      athleteHistoryRepository.deleteAll();
      rankHistoryRepository.deleteAll();
      athleteRepository.deleteAll();
      eventRepository.deleteAll();
    }

    int eventCount = 0;
    for (EventRequest eventRequest : safeList(payload.getEvents())) {
      if (eventRequest == null) continue;
      if (eventRequest.getId() != null && eventRepository.existsById(eventRequest.getId())) {
        eventService.update(eventRequest.getId(), eventRequest);
      } else {
        eventService.create(eventRequest, false);
      }
      eventCount += 1;
    }

    int athleteCount = 0;
    for (AthleteRequest athleteRequest : safeList(payload.getAthletes())) {
      if (athleteRequest == null) continue;
      if (athleteRequest.getId() != null && athleteRepository.existsById(athleteRequest.getId())) {
        athleteService.update(athleteRequest.getId(), athleteRequest);
      } else {
        athleteService.create(athleteRequest);
      }
      athleteCount += 1;
    }

    int bracketCount = 0;
    for (BracketRequest bracketRequest : safeList(payload.getBrackets())) {
      if (bracketRequest == null) continue;
      if (bracketRequest.getId() != null && bracketRepository.existsById(bracketRequest.getId())) {
        bracketService.update(bracketRequest.getId(), bracketRequest);
      } else {
        bracketService.create(bracketRequest);
      }
      bracketCount += 1;
    }

    int rankHistoryCount = 0;
    Map<String, List<RankHistoryEntryDto>> historyMap = payload.getRankHistory();
    if (historyMap != null) {
      for (Map.Entry<String, List<RankHistoryEntryDto>> entry : historyMap.entrySet()) {
        String athleteId = entry.getKey();
        if (athleteId == null || athleteId.isBlank()) continue;
        Athlete athlete = athleteRepository.findById(athleteId).orElse(null);
        if (athlete == null) continue;
        for (RankHistoryEntryDto historyEntry : safeList(entry.getValue())) {
          if (historyEntry == null) continue;
          RankHistory rankHistory = new RankHistory();
          rankHistory.setAthlete(athlete);
          rankHistory.setRank(historyEntry.getRank());
          rankHistory.setPontos(historyEntry.getPontos());
          rankHistory.setTimestamp(parseInstant(historyEntry.getTimestamp()));
          rankHistoryRepository.save(rankHistory);
          rankHistoryCount += 1;
        }
      }
    }

    ImportResultDto result = new ImportResultDto();
    result.setEvents(eventCount);
    result.setAthletes(athleteCount);
    result.setBrackets(bracketCount);
    result.setRankHistory(rankHistoryCount);
    return result;
  }

  private <T> List<T> safeList(List<T> list) {
    return list == null ? List.of() : list;
  }

  private Instant parseInstant(String value) {
    if (value == null || value.isBlank()) return null;
    try {
      return Instant.parse(value);
    } catch (DateTimeParseException ex) {
      return null;
    }
  }
}
