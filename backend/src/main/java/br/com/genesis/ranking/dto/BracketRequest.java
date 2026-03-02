package br.com.genesis.ranking.dto;

import java.util.ArrayList;
import java.util.List;

public class BracketRequest {
  private String id;
  private Integer number;
  private String eventId;
  private String categoryKey;
  private String label;
  private String mode;
  private Integer size;
  private List<String> seedIds = new ArrayList<>();
  private PodiumDto podium;
  private String appliedAt;

  public String getId() {
    return id;
  }

  public void setId(String id) {
    this.id = id;
  }

  public Integer getNumber() {
    return number;
  }

  public void setNumber(Integer number) {
    this.number = number;
  }

  public String getEventId() {
    return eventId;
  }

  public void setEventId(String eventId) {
    this.eventId = eventId;
  }

  public String getCategoryKey() {
    return categoryKey;
  }

  public void setCategoryKey(String categoryKey) {
    this.categoryKey = categoryKey;
  }

  public String getLabel() {
    return label;
  }

  public void setLabel(String label) {
    this.label = label;
  }

  public String getMode() {
    return mode;
  }

  public void setMode(String mode) {
    this.mode = mode;
  }

  public Integer getSize() {
    return size;
  }

  public void setSize(Integer size) {
    this.size = size;
  }

  public List<String> getSeedIds() {
    return seedIds;
  }

  public void setSeedIds(List<String> seedIds) {
    this.seedIds = seedIds;
  }

  public PodiumDto getPodium() {
    return podium;
  }

  public void setPodium(PodiumDto podium) {
    this.podium = podium;
  }

  public String getAppliedAt() {
    return appliedAt;
  }

  public void setAppliedAt(String appliedAt) {
    this.appliedAt = appliedAt;
  }
}
