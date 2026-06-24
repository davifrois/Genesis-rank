package br.com.genesis.ranking.dto;

public class BracketLiveMatchDto {
  private String id;
  private String slotAId;
  private String slotBId;
  private String winnerId;
  private String status;
  private String area;
  private Integer fightNumber;
  private String scheduledAt;
  private Integer scoreA;
  private Integer scoreB;

  public String getId() {
    return id;
  }

  public void setId(String id) {
    this.id = id;
  }

  public String getSlotAId() {
    return slotAId;
  }

  public void setSlotAId(String slotAId) {
    this.slotAId = slotAId;
  }

  public String getSlotBId() {
    return slotBId;
  }

  public void setSlotBId(String slotBId) {
    this.slotBId = slotBId;
  }

  public String getWinnerId() {
    return winnerId;
  }

  public void setWinnerId(String winnerId) {
    this.winnerId = winnerId;
  }

  public String getStatus() {
    return status;
  }

  public void setStatus(String status) {
    this.status = status;
  }

  public String getArea() {
    return area;
  }

  public void setArea(String area) {
    this.area = area;
  }

  public Integer getFightNumber() {
    return fightNumber;
  }

  public void setFightNumber(Integer fightNumber) {
    this.fightNumber = fightNumber;
  }

  public String getScheduledAt() {
    return scheduledAt;
  }

  public void setScheduledAt(String scheduledAt) {
    this.scheduledAt = scheduledAt;
  }

  public Integer getScoreA() {
    return scoreA;
  }

  public void setScoreA(Integer scoreA) {
    this.scoreA = scoreA;
  }

  public Integer getScoreB() {
    return scoreB;
  }

  public void setScoreB(Integer scoreB) {
    this.scoreB = scoreB;
  }
}
