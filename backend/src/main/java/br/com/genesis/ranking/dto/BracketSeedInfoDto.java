package br.com.genesis.ranking.dto;

public class BracketSeedInfoDto {
  private String athleteId;
  private String athleteName;
  private String academy;

  public String getAthleteId() {
    return athleteId;
  }

  public void setAthleteId(String athleteId) {
    this.athleteId = athleteId;
  }

  public String getAthleteName() {
    return athleteName;
  }

  public void setAthleteName(String athleteName) {
    this.athleteName = athleteName;
  }

  public String getAcademy() {
    return academy;
  }

  public void setAcademy(String academy) {
    this.academy = academy;
  }
}
