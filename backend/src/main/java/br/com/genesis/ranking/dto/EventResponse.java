package br.com.genesis.ranking.dto;

public class EventResponse {
  private String id;
  private String name;
  private String date;
  private String location;
  private String posterUrl;
  private String registrationUrl;
  private String pixKey;
  private Double feeUnder15;
  private Double feeOver15;
  private Double feeCombo;
  private Double feeAbsolute;
  private boolean registrationOpen;
  private boolean internalRegistration;
  private Integer announcementRecipients;
  private Integer announcementSent;
  private Integer announcementFailed;
  private Boolean announcementAttempted;

  public String getId() {
    return id;
  }

  public void setId(String id) {
    this.id = id;
  }

  public String getName() {
    return name;
  }

  public void setName(String name) {
    this.name = name;
  }

  public String getDate() {
    return date;
  }

  public void setDate(String date) {
    this.date = date;
  }

  public String getLocation() {
    return location;
  }

  public void setLocation(String location) {
    this.location = location;
  }

  public String getPosterUrl() {
    return posterUrl;
  }

  public void setPosterUrl(String posterUrl) {
    this.posterUrl = posterUrl;
  }

  public String getRegistrationUrl() {
    return registrationUrl;
  }

  public void setRegistrationUrl(String registrationUrl) {
    this.registrationUrl = registrationUrl;
  }

  public String getPixKey() {
    return pixKey;
  }

  public void setPixKey(String pixKey) {
    this.pixKey = pixKey;
  }

  public Double getFeeUnder15() {
    return feeUnder15;
  }

  public void setFeeUnder15(Double feeUnder15) {
    this.feeUnder15 = feeUnder15;
  }

  public Double getFeeOver15() {
    return feeOver15;
  }

  public void setFeeOver15(Double feeOver15) {
    this.feeOver15 = feeOver15;
  }

  public Double getFeeCombo() {
    return feeCombo;
  }

  public void setFeeCombo(Double feeCombo) {
    this.feeCombo = feeCombo;
  }

  public Double getFeeAbsolute() {
    return feeAbsolute;
  }

  public void setFeeAbsolute(Double feeAbsolute) {
    this.feeAbsolute = feeAbsolute;
  }

  public boolean isRegistrationOpen() {
    return registrationOpen;
  }

  public void setRegistrationOpen(boolean registrationOpen) {
    this.registrationOpen = registrationOpen;
  }

  public boolean isInternalRegistration() {
    return internalRegistration;
  }

  public void setInternalRegistration(boolean internalRegistration) {
    this.internalRegistration = internalRegistration;
  }

  public Integer getAnnouncementRecipients() {
    return announcementRecipients;
  }

  public void setAnnouncementRecipients(Integer announcementRecipients) {
    this.announcementRecipients = announcementRecipients;
  }

  public Integer getAnnouncementSent() {
    return announcementSent;
  }

  public void setAnnouncementSent(Integer announcementSent) {
    this.announcementSent = announcementSent;
  }

  public Integer getAnnouncementFailed() {
    return announcementFailed;
  }

  public void setAnnouncementFailed(Integer announcementFailed) {
    this.announcementFailed = announcementFailed;
  }

  public Boolean getAnnouncementAttempted() {
    return announcementAttempted;
  }

  public void setAnnouncementAttempted(Boolean announcementAttempted) {
    this.announcementAttempted = announcementAttempted;
  }
}
