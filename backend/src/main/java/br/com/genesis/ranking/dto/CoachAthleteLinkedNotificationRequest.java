package br.com.genesis.ranking.dto;

import jakarta.validation.constraints.NotBlank;

public class CoachAthleteLinkedNotificationRequest {
  @NotBlank
  private String athleteName;

  private String academyName;
  private String coachEmail;
  private String coachName;
  private String athleteEmail;

  public String getAthleteName() {
    return athleteName;
  }

  public void setAthleteName(String athleteName) {
    this.athleteName = athleteName;
  }

  public String getAcademyName() {
    return academyName;
  }

  public void setAcademyName(String academyName) {
    this.academyName = academyName;
  }

  public String getCoachEmail() {
    return coachEmail;
  }

  public void setCoachEmail(String coachEmail) {
    this.coachEmail = coachEmail;
  }

  public String getCoachName() {
    return coachName;
  }

  public void setCoachName(String coachName) {
    this.coachName = coachName;
  }

  public String getAthleteEmail() {
    return athleteEmail;
  }

  public void setAthleteEmail(String athleteEmail) {
    this.athleteEmail = athleteEmail;
  }
}
