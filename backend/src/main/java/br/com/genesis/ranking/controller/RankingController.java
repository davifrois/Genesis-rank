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
public class RankingController {
  private final RankingService rankingService;

  public RankingController(RankingService rankingService) {
    this.rankingService = rankingService;
  }

  @GetMapping
  public RankingResponse getRanking(
      @RequestParam(name = "eventId", required = false) String eventId,
      @RequestParam(name = "mode", required = false, defaultValue = "GERAL") String mode
  ) {
    return rankingService.buildRanking(eventId, mode);
  }

  @GetMapping("/teams")
  public Map<String, List<TeamRankingDto>> getTeamRanking(
      @RequestParam(name = "eventId", required = false) String eventId
  ) {
    return rankingService.buildTeamRanking(eventId);
  }
}

