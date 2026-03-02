package br.com.genesis.ranking.dto;

import java.util.ArrayList;
import java.util.List;

public class CategoryRankingDto {
  private String label;
  private List<RankEntryDto> entries = new ArrayList<>();

  public String getLabel() {
    return label;
  }

  public void setLabel(String label) {
    this.label = label;
  }

  public List<RankEntryDto> getEntries() {
    return entries;
  }

  public void setEntries(List<RankEntryDto> entries) {
    this.entries = entries;
  }
}
