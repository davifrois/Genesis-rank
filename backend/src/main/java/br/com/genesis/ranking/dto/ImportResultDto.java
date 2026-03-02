package br.com.genesis.ranking.dto;

public class ImportResultDto {
  private int events;
  private int athletes;
  private int brackets;
  private int rankHistory;

  public int getEvents() {
    return events;
  }

  public void setEvents(int events) {
    this.events = events;
  }

  public int getAthletes() {
    return athletes;
  }

  public void setAthletes(int athletes) {
    this.athletes = athletes;
  }

  public int getBrackets() {
    return brackets;
  }

  public void setBrackets(int brackets) {
    this.brackets = brackets;
  }

  public int getRankHistory() {
    return rankHistory;
  }

  public void setRankHistory(int rankHistory) {
    this.rankHistory = rankHistory;
  }
}
