package br.com.genesis.ranking.service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import br.com.genesis.ranking.dto.CategoryRankingDto;
import br.com.genesis.ranking.dto.RankEntryDto;
import br.com.genesis.ranking.dto.RankingResponse;
import br.com.genesis.ranking.dto.TeamRankingDto;
import br.com.genesis.ranking.model.Athlete;
import br.com.genesis.ranking.model.AthleteHistory;
import br.com.genesis.ranking.repository.AthleteRepository;

@Service
public class RankingService {
  private final AthleteRepository athleteRepository;
  private final ScoringService scoringService;

  public RankingService(AthleteRepository athleteRepository, ScoringService scoringService) {
    this.athleteRepository = athleteRepository;
    this.scoringService = scoringService;
  }

  public RankingResponse buildRanking(String eventId, String mode) {
    List<Athlete> athletes = fetchAthletes(eventId);
    List<Athlete> filtered = filterByMode(athletes, mode);

    Map<String, CategoryBucket> buckets = new HashMap<>();
    for (Athlete athlete : filtered) {
      CategoryDescriptor descriptor = buildCategoryDescriptor(athlete);
      CategoryBucket bucket = buckets.computeIfAbsent(descriptor.key, key -> new CategoryBucket(descriptor.label));
      bucket.entries.add(athlete);
    }

    List<CategoryRankingDto> categories = buckets.values().stream()
        .map(bucket -> {
          List<Athlete> ranked = rankAthletes(bucket.entries);
          CategoryRankingDto dto = new CategoryRankingDto();
          dto.setLabel(bucket.label);
          dto.setEntries(buildRankEntries(ranked));
          return dto;
        })
        .sorted(Comparator.comparing(CategoryRankingDto::getLabel))
        .collect(Collectors.toList());

    RankingResponse response = new RankingResponse();
    response.setCategories(categories);

    if ("GERAL".equalsIgnoreCase(mode)) {
      List<Athlete> winners = categories.stream()
          .filter(category -> !category.getEntries().isEmpty())
          .map(category -> findAthleteById(filtered, category.getEntries().get(0).getId()))
          .filter(item -> item != null)
          .collect(Collectors.toList());

      List<Athlete> rankedWinners = rankAthletes(winners);
      response.setOverallWinners(buildRankEntries(rankedWinners));
    }

    return response;
  }

  private String resolveAgeGroup(String category) {
    if (category == null || category.isBlank()) return "ADULTO";
    String upper = category.toUpperCase(Locale.ROOT);
    if (upper.contains("CRIANÇA") || upper.contains("KIDS") || upper.contains("MIRIM") || upper.contains("INFANTIL") && !upper.contains("JUVENIL")) {
      return "KIDS";
    }
    if (upper.contains("JUVENIL")) {
      return "JUVENIL";
    }
    if (upper.contains("MASTER") || upper.contains("SENIOR")) {
      return "MASTER";
    }
    return "ADULTO";
  }

  public Map<String, List<TeamRankingDto>> buildTeamRanking(String eventId) {
    List<Athlete> athletes = fetchAthletes(eventId);
    // ageGroup -> (normalizeGroupPart(academy) -> TeamStats)
    Map<String, Map<String, TeamStats>> groupedTeams = new HashMap<>();
    groupedTeams.put("KIDS", new HashMap<>());
    groupedTeams.put("JUVENIL", new HashMap<>());
    groupedTeams.put("ADULTO", new HashMap<>());
    groupedTeams.put("MASTER", new HashMap<>());

    for (Athlete athlete : athletes) {
      String academy = athlete.getAcademia() == null || athlete.getAcademia().isBlank()
          ? "Sem academia"
          : athlete.getAcademia().trim();
      String key = normalizeGroupPart(academy);
      String ageGroup = resolveAgeGroup(athlete.getCategoria());

      Map<String, TeamStats> teams = groupedTeams.get(ageGroup);
      if (teams == null) teams = groupedTeams.get("ADULTO");

      TeamStats stats = teams.computeIfAbsent(key, k -> new TeamStats(academy));
      ScoringService.ScoreBreakdown breakdown = scoringService.buildBreakdown(athlete.getHistorico());

      stats.campeao += breakdown.podium1;
      stats.vice += breakdown.podium2;
      stats.terceiro += breakdown.podium3;
      stats.pontos += athlete.getPontos() == null ? 0 : athlete.getPontos();
      stats.atletas += 1;
    }

    Map<String, List<TeamRankingDto>> result = new HashMap<>();

    for (String ageGroup : groupedTeams.keySet()) {
      List<TeamStats> ordered = new ArrayList<>(groupedTeams.get(ageGroup).values());
      ordered.sort((a, b) -> {
        if (b.pontos != a.pontos) return Integer.compare(b.pontos, a.pontos);
        if (b.campeao != a.campeao) return Integer.compare(b.campeao, a.campeao);
        if (b.vice != a.vice) return Integer.compare(b.vice, a.vice);
        if (b.terceiro != a.terceiro) return Integer.compare(b.terceiro, a.terceiro);
        return a.academy.compareToIgnoreCase(b.academy);
      });

      List<TeamRankingDto> response = new ArrayList<>();
      int rank = 1;
      for (TeamStats stats : ordered) {
        if (stats.pontos == 0 && stats.atletas == 0) continue; // Skip empty
        TeamRankingDto dto = new TeamRankingDto();
        dto.setAcademy(stats.academy);
        dto.setCampeao(stats.campeao);
        dto.setVice(stats.vice);
        dto.setTerceiro(stats.terceiro);
        dto.setPontos(stats.pontos);
        dto.setAtletas(stats.atletas);
        dto.setRank(rank++);
        response.add(dto);
      }
      result.put(ageGroup, response);
    }

    return result;
  }

  private List<Athlete> fetchAthletes(String eventId) {
    if (eventId == null || eventId.isBlank() || "all".equalsIgnoreCase(eventId)) {
      return athleteRepository.findAll();
    }
    if ("none".equalsIgnoreCase(eventId)) {
      return athleteRepository.findAll().stream()
          .filter(athlete -> athlete.getEvent() == null)
          .collect(Collectors.toList());
    }
    return athleteRepository.findByEvent_Id(eventId);
  }

  private List<Athlete> filterByMode(List<Athlete> athletes, String mode) {
    if (mode == null || mode.isBlank() || "GERAL".equalsIgnoreCase(mode)) {
      return athletes;
    }
    return athletes.stream().filter(athlete -> matchesMode(athlete, mode)).collect(Collectors.toList());
  }

  private boolean matchesMode(Athlete athlete, String mode) {
    boolean noGi = athlete.isNoGi();
    boolean absolute = athlete.isAbsolute();
    String normalized = mode.trim().toUpperCase(Locale.ROOT);
    if ("GI".equals(normalized)) return !noGi && !absolute;
    if ("NO-GI".equals(normalized)) return noGi && !absolute;
    if ("ABS-GI".equals(normalized)) return !noGi && absolute;
    if ("ABS-NO-GI".equals(normalized)) return noGi && absolute;
    return true;
  }

  private List<Athlete> rankAthletes(List<Athlete> athletes) {
    return athletes.stream()
        .sorted(this::compareAthletes)
        .collect(Collectors.toList());
  }

  private int compareAthletes(Athlete a, Athlete b) {
    RankMeta metaA = buildRankMeta(a);
    RankMeta metaB = buildRankMeta(b);

    if (metaA.pontos != metaB.pontos) return Integer.compare(metaB.pontos, metaA.pontos);
    if (metaA.podium1 != metaB.podium1) return Integer.compare(metaB.podium1, metaA.podium1);
    if (metaA.wins != metaB.wins) return Integer.compare(metaB.wins, metaA.wins);
    return metaA.name.compareTo(metaB.name);
  }

  private RankMeta buildRankMeta(Athlete athlete) {
    List<AthleteHistory> history = athlete.getHistorico();
    ScoringService.ScoreBreakdown breakdown = scoringService.buildBreakdown(history);
    int pontos = athlete.getPontos() == null ? 0 : athlete.getPontos();
    if (history != null && !history.isEmpty()) {
      pontos = breakdown.total;
    }
    return new RankMeta(pontos, breakdown.podium1, breakdown.wins, normalizeName(athlete.getNome()));
  }

  private String normalizeName(String value) {
    return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
  }

  private List<RankEntryDto> buildRankEntries(List<Athlete> ranked) {
    List<RankEntryDto> entries = new ArrayList<>();
    int rank = 1;
    for (Athlete athlete : ranked) {
      ScoringService.ScoreBreakdown breakdown = scoringService.buildBreakdown(athlete.getHistorico());
      int pontos = athlete.getPontos() == null ? 0 : athlete.getPontos();
      if (athlete.getHistorico() != null && !athlete.getHistorico().isEmpty()) {
        pontos = breakdown.total;
      }
      RankEntryDto dto = new RankEntryDto();
      dto.setId(athlete.getId());
      dto.setNome(athlete.getNome());
      dto.setAcademia(athlete.getAcademia());
      dto.setFaixa(athlete.getFaixa());
      dto.setPeso(athlete.getPeso());
      dto.setCategoria(athlete.getCategoria());
      dto.setGenero(resolveGenderLabel(athlete));
      dto.setNoGi(athlete.isNoGi());
      dto.setAbsolute(athlete.isAbsolute());
      dto.setPontos(pontos);
      dto.setRank(rank++);
      entries.add(dto);
    }
    return entries;
  }

  private Athlete findAthleteById(List<Athlete> athletes, String id) {
    return athletes.stream().filter(item -> item.getId().equals(id)).findFirst().orElse(null);
  }

  private CategoryDescriptor buildCategoryDescriptor(Athlete athlete) {
    String categoria = athlete.getCategoria() == null || athlete.getCategoria().isBlank()
        ? "Categoria"
        : athlete.getCategoria();
    String faixa = athlete.getFaixa() == null || athlete.getFaixa().isBlank()
        ? "Faixa"
        : athlete.getFaixa();
    String peso = resolvePesoLabel(athlete);
    String genero = resolveGenderLabel(athlete);

    List<String> baseParts = List.of(categoria, faixa, peso, genero);
    List<String> labelParts = new ArrayList<>();
    if (athlete.isAbsolute()) {
      labelParts.add("ABS");
    }
    labelParts.addAll(baseParts);

    List<String> keyParts = new ArrayList<>(baseParts);
    keyParts.add(athlete.isAbsolute() ? "ABS" : "STD");
    keyParts.add(athlete.isNoGi() ? "NO-GI" : "GI");

    String key = keyParts.stream().map(this::normalizeGroupPart).collect(Collectors.joining("::"));
    String label = String.join(" - ", labelParts);

    return new CategoryDescriptor(key, label);
  }

  private String resolveGenderLabel(Athlete athlete) {
    if (athlete.getGenero() != null && !athlete.getGenero().isBlank()) return athlete.getGenero();
    return "Masculino";
  }

  private String resolvePesoLabel(Athlete athlete) {
    if (athlete.getPeso() != null && !athlete.getPeso().isBlank()) return athlete.getPeso();
    return athlete.isAbsolute() ? "Absoluto" : "Peso";
  }

  private String normalizeGroupPart(String value) {
    return value == null ? "" : value.trim().toLowerCase(Locale.ROOT).replaceAll("\\s+", " ");
  }

  private static class RankMeta {
    final int pontos;
    final int podium1;
    final int wins;
    final String name;

    RankMeta(int pontos, int podium1, int wins, String name) {
      this.pontos = pontos;
      this.podium1 = podium1;
      this.wins = wins;
      this.name = name;
    }
  }

  private static class CategoryDescriptor {
    final String key;
    final String label;

    CategoryDescriptor(String key, String label) {
      this.key = key;
      this.label = label;
    }
  }

  private static class CategoryBucket {
    final String label;
    final List<Athlete> entries = new ArrayList<>();

    CategoryBucket(String label) {
      this.label = label;
    }
  }

  private static class TeamStats {
    final String academy;
    int campeao = 0;
    int vice = 0;
    int terceiro = 0;
    int pontos = 0;
    int atletas = 0;

    TeamStats(String academy) {
      this.academy = academy;
    }
  }
}
