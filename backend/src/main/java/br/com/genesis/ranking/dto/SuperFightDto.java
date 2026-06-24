package br.com.genesis.ranking.dto;

import java.util.UUID;

public class SuperFightDto {

  private String id;
  private String category;
  private String athlete1Name;
  private String athlete1Belt;
  private String athlete1Academy;
  private String athlete2Name;
  private String athlete2Belt;
  private String athlete2Academy;
  private String scheduledTime;

  public SuperFightDto() {
    this.id = UUID.randomUUID().toString();
  }

  public String getId() {
    return id;
  }

  public void setId(String id) {
    this.id = id;
  }

  public String getCategory() {
    return category;
  }

  public void setCategory(String category) {
    this.category = category;
  }

  public String getAthlete1Name() {
    return athlete1Name;
  }

  public void setAthlete1Name(String athlete1Name) {
    this.athlete1Name = athlete1Name;
  }

  public String getAthlete1Belt() {
    return athlete1Belt;
  }

  public void setAthlete1Belt(String athlete1Belt) {
    this.athlete1Belt = athlete1Belt;
  }

  public String getAthlete1Academy() {
    return athlete1Academy;
  }

  public void setAthlete1Academy(String athlete1Academy) {
    this.athlete1Academy = athlete1Academy;
  }

  public String getAthlete2Name() {
    return athlete2Name;
  }

  public void setAthlete2Name(String athlete2Name) {
    this.athlete2Name = athlete2Name;
  }

  public String getAthlete2Belt() {
    return athlete2Belt;
  }

  public void setAthlete2Belt(String athlete2Belt) {
    this.athlete2Belt = athlete2Belt;
  }

  public String getAthlete2Academy() {
    return athlete2Academy;
  }

  public void setAthlete2Academy(String athlete2Academy) {
    this.athlete2Academy = athlete2Academy;
  }

  public String getScheduledTime() {
    return scheduledTime;
  }

  public void setScheduledTime(String scheduledTime) {
    this.scheduledTime = scheduledTime;
  }
}
