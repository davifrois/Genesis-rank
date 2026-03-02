package br.com.genesis.ranking.dto;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class ImportPayloadDto {
  private List<EventRequest> events = new ArrayList<>();
  private List<AthleteRequest> athletes = new ArrayList<>();
  private List<BracketRequest> brackets = new ArrayList<>();
  private String activeEventId;
  private Map<String, List<RankHistoryEntryDto>> rankHistory = new HashMap<>();

  public List<EventRequest> getEvents() {
    return events;
  }

  public void setEvents(List<EventRequest> events) {
    this.events = events;
  }

  public List<AthleteRequest> getAthletes() {
    return athletes;
  }

  public void setAthletes(List<AthleteRequest> athletes) {
    this.athletes = athletes;
  }

  public List<BracketRequest> getBrackets() {
    return brackets;
  }

  public void setBrackets(List<BracketRequest> brackets) {
    this.brackets = brackets;
  }

  public String getActiveEventId() {
    return activeEventId;
  }

  public void setActiveEventId(String activeEventId) {
    this.activeEventId = activeEventId;
  }

  public Map<String, List<RankHistoryEntryDto>> getRankHistory() {
    return rankHistory;
  }

  public void setRankHistory(Map<String, List<RankHistoryEntryDto>> rankHistory) {
    this.rankHistory = rankHistory;
  }
}
