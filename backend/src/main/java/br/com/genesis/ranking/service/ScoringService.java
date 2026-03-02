package br.com.genesis.ranking.service;

import java.util.List;

import org.springframework.stereotype.Service;

import br.com.genesis.ranking.model.AthleteHistory;
import br.com.genesis.ranking.model.enums.HistoryType;

@Service
public class ScoringService {
  public static final int WIN_POINTS = 0;
  public static final int PODIUM_1ST = 3;
  public static final int PODIUM_2ND = 2;
  public static final int PODIUM_3RD = 1;

  public int calculateTotalPoints(List<AthleteHistory> history) {
    if (history == null) return 0;
    int total = 0;
    for (AthleteHistory record : history) {
      if (record == null || record.getType() == null) continue;
      if (record.getType() == HistoryType.WIN) total += WIN_POINTS;
      if (record.getType() == HistoryType.SEED && record.getPoints() != null) total += record.getPoints();
      if (record.getType() == HistoryType.PODIUM) {
        if (record.getPosition() != null) {
          if (record.getPosition() == 1) total += PODIUM_1ST;
          if (record.getPosition() == 2) total += PODIUM_2ND;
          if (record.getPosition() == 3) total += PODIUM_3RD;
        }
      }
    }
    return total;
  }

  public ScoreBreakdown buildBreakdown(List<AthleteHistory> history) {
    ScoreBreakdown breakdown = new ScoreBreakdown();
    if (history == null) return breakdown;

    for (AthleteHistory record : history) {
      if (record == null || record.getType() == null) continue;
      if (record.getType() == HistoryType.WIN) breakdown.wins += 1;
      if (record.getType() == HistoryType.SEED && record.getPoints() != null) {
        breakdown.seedPoints += record.getPoints();
      }
      if (record.getType() == HistoryType.PODIUM) {
        if (record.getPosition() != null) {
          if (record.getPosition() == 1) breakdown.podium1 += 1;
          if (record.getPosition() == 2) breakdown.podium2 += 1;
          if (record.getPosition() == 3) breakdown.podium3 += 1;
        }
      }
    }

    breakdown.total = calculateTotalPoints(history);
    return breakdown;
  }

  public static class ScoreBreakdown {
    public int total = 0;
    public int wins = 0;
    public int podium1 = 0;
    public int podium2 = 0;
    public int podium3 = 0;
    public int seedPoints = 0;
  }
}
