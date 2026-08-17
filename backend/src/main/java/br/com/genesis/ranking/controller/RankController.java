package br.com.genesis.ranking.controller;

import java.util.List;
import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import br.com.genesis.ranking.dto.AcademyRankingDto;
import br.com.genesis.ranking.dto.RankingResponse;
import br.com.genesis.ranking.dto.TeamRankingDto;
import br.com.genesis.ranking.service.AcademyRankingService;
import br.com.genesis.ranking.service.RankingService;

@RestController
@RequestMapping("/api/ranking")
// Controlador de Rank
// Este controlador fornece as classificações (rankings) gerais e por equipes.
public class RankController {
    private final RankingService rankingService;
    private final AcademyRankingService academyRankingService;

    public RankController(RankingService rankingService, AcademyRankingService academyRankingService) {
        this.rankingService = rankingService;
        this.academyRankingService = academyRankingService;
    }

  // Busca a classificação geral dos atletas com base em filtros opcionais
  @GetMapping
  public RankingResponse getRanking(
      @RequestParam(name = "eventId", required = false) String eventId,
      @RequestParam(name = "mode", required = false, defaultValue = "GERAL") String mode
  ) {
    return rankingService.buildRanking(eventId, mode);
  }

  // Busca a classificação por academias/equipes com base em um evento opcional
  @GetMapping("/teams")
  public Map<String, List<TeamRankingDto>> getTeamRanking(
      @RequestParam(name = "eventId", required = false) String eventId
  ) {
    return rankingService.buildTeamRanking(eventId);
  }

  // Busca a classificação de academias (Guerra das Academias) por evento específico
  @GetMapping("/academy/{eventId}")
  public List<AcademyRankingDto> getAcademyRankingByEvent(@PathVariable("eventId") String eventId) {
      return academyRankingService.getAcademyRankingByEvent(eventId);
  }
}

