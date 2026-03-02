package br.com.genesis.ranking.dto;

public class RankHistoryEntryDto {
  private String timestamp;
  private Integer rank;
  private Integer pontos;

  public String getTimestamp() {
    return timestamp;
  }

  public void setTimestamp(String timestamp) {
    this.timestamp = timestamp;
  }

  public Integer getRank() {
    return rank;
  }

  public void setRank(Integer rank) {
    this.rank = rank;
  }

  public Integer getPontos() {
    return pontos;
  }

  public void setPontos(Integer pontos) {
    this.pontos = pontos;
  }
}
