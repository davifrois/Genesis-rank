const fs = require('fs');

let code = fs.readFileSync('backend/src/main/java/br/com/genesis/ranking/service/RankingService.java', 'utf-8');

const buildTeamRankingOld = `  public List<TeamRankingDto> buildTeamRanking(String eventId) {
    List<Athlete> athletes = fetchAthletes(eventId);
    Map<String, TeamStats> teams = new HashMap<>();

    for (Athlete athlete : athletes) {
      String academy = athlete.getAcademia() == null || athlete.getAcademia().isBlank()
          ? "Sem academia"
          : athlete.getAcademia().trim();
      String key = normalizeGroupPart(academy);

      TeamStats stats = teams.computeIfAbsent(key, k -> new TeamStats(academy));
      ScoringService.ScoreBreakdown breakdown = scoringService.buildBreakdown(athlete.getHistorico());

      stats.campeao += breakdown.podium1;
      stats.vice += breakdown.podium2;
      stats.terceiro += breakdown.podium3;
      stats.pontos += athlete.getPontos() == null ? 0 : athlete.getPontos();
      stats.atletas += 1;
    }

    List<TeamStats> ordered = new ArrayList<>(teams.values());
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

    return response;
  }`;

const buildTeamRankingNew = `  private String resolveAgeGroup(String category) {
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
  }`;

code = code.replace(buildTeamRankingOld, buildTeamRankingNew);

fs.writeFileSync('backend/src/main/java/br/com/genesis/ranking/service/RankingService.java', code);
console.log('Successfully updated RankingService.java');
