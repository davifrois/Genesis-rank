package br.com.genesis.ranking.dto;

import java.util.ArrayList;
import java.util.List;

public class RankingResponse {
  private List<CategoryRankingDto> categories = new ArrayList<>();
  private List<RankEntryDto> overallWinners = new ArrayList<>();

  public List<CategoryRankingDto> getCategories() {
    return categories;
  }

  public void setCategories(List<CategoryRankingDto> categories) {
    this.categories = categories;
  }

  public List<RankEntryDto> getOverallWinners() {
    return overallWinners;
  }

  public void setOverallWinners(List<RankEntryDto> overallWinners) {
    this.overallWinners = overallWinners;
  }
}
