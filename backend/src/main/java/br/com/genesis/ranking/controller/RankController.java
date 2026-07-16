package br.com.genesis.ranking.controller;

import java.util.List;
import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import br.com.genesis.ranking.dto.RankingResponse;
import br.com.genesis.ranking.dto.TeamRankingDto;
import br.com.genesis.ranking.service.RankingService;

@RestController
@RequestMapping("/api/ranking")
// Controlador de Rank
// Este controlador fornece as classificações (rankings) gerais e por equipes.
public class RankController {
  private final RankingService rankingService;

  public RankController(RankingService rankingService) {
    this.rankingService = rankingService;
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
}

