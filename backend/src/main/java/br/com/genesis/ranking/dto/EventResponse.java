package br.com.genesis.ranking.dto;

import java.util.List;

public class EventResponse {
  private String id;
  private String name;
    private String date;
  private String endDate;
  private String location;
  private Boolean accommodationEnabled;
  private String accommodationTitle;
  private String accommodationDescription;
  private String accommodationSearchLocation;
  private String posterUrl;
  private String registrationUrl;
  private String pixKey;
  private Double feeUnder15;
  private Double feeOver15;
  private Double feeCombo;
  private Double feeAbsolute;
  private Boolean beltRegistrationEnabled;
  private String beltRegistrationTitle;
  private Double beltRegistrationPrice;
    private String beltRegistrationDescription;
  private String beltRegistrationPhone;
  private Integer maxAthletes;
  private Boolean closeOnCapacity;
  private String eventDescription;
  private List<EventBatchDto> batches;
  private List<SuperFightDto> superFights;
  private Boolean superFightsPublished;
  private EventBatchDto activeBatch;
  private Double currentRegistrationPrice;
  private String nextBatchChangeAt;
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

  public Boolean getAccommodationEnabled() {
    return accommodationEnabled;
  }

  public void setAccommodationEnabled(Boolean accommodationEnabled) {
    this.accommodationEnabled = accommodationEnabled;
  }

  public String getAccommodationTitle() {
    return accommodationTitle;
  }

  public void setAccommodationTitle(String accommodationTitle) {
    this.accommodationTitle = accommodationTitle;
  }

  public String getAccommodationDescription() {
    return accommodationDescription;
  }

  public void setAccommodationDescription(String accommodationDescription) {
    this.accommodationDescription = accommodationDescription;
  }

  public String getAccommodationSearchLocation() {
    return accommodationSearchLocation;
  }

  public void setAccommodationSearchLocation(String accommodationSearchLocation) {
    this.accommodationSearchLocation = accommodationSearchLocation;
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

  public Boolean getBeltRegistrationEnabled() {
    return beltRegistrationEnabled;
  }

  public void setBeltRegistrationEnabled(Boolean beltRegistrationEnabled) {
    this.beltRegistrationEnabled = beltRegistrationEnabled;
  }

  public String getBeltRegistrationTitle() {
    return beltRegistrationTitle;
  }

  public void setBeltRegistrationTitle(String beltRegistrationTitle) {
    this.beltRegistrationTitle = beltRegistrationTitle;
  }

  public Double getBeltRegistrationPrice() {
    return beltRegistrationPrice;
  }

  public void setBeltRegistrationPrice(Double beltRegistrationPrice) {
    this.beltRegistrationPrice = beltRegistrationPrice;
  }

  public String getBeltRegistrationDescription() {
    return beltRegistrationDescription;
  }

  public void setBeltRegistrationDescription(String beltRegistrationDescription) {
    this.beltRegistrationDescription = beltRegistrationDescription;
  }

  public List<EventBatchDto> getBatches() {
    return batches;
  }

  public void setBatches(List<EventBatchDto> batches) {
    this.batches = batches;
  }

  public List<SuperFightDto> getSuperFights() {
    return superFights;
  }

  public void setSuperFights(List<SuperFightDto> superFights) {
    this.superFights = superFights;
  }

  public Boolean getSuperFightsPublished() {
    return superFightsPublished;
  }

  public void setSuperFightsPublished(Boolean superFightsPublished) {
    this.superFightsPublished = superFightsPublished;
  }

  public EventBatchDto getActiveBatch() {
    return activeBatch;
  }

  public void setActiveBatch(EventBatchDto activeBatch) {
    this.activeBatch = activeBatch;
  }

  public Double getCurrentRegistrationPrice() {
    return currentRegistrationPrice;
  }

  public void setCurrentRegistrationPrice(Double currentRegistrationPrice) {
    this.currentRegistrationPrice = currentRegistrationPrice;
  }

  public String getNextBatchChangeAt() {
    return nextBatchChangeAt;
  }

  public void setNextBatchChangeAt(String nextBatchChangeAt) {
    this.nextBatchChangeAt = nextBatchChangeAt;
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

  public String getEndDate() {
    return endDate;
  }

  public void setEndDate(String endDate) {
    this.endDate = endDate;
  }

  public Integer getMaxAthletes() {
    return maxAthletes;
  }

  public void setMaxAthletes(Integer maxAthletes) {
    this.maxAthletes = maxAthletes;
  }

  public Boolean getCloseOnCapacity() {
    return closeOnCapacity;
  }

  public void setCloseOnCapacity(Boolean closeOnCapacity) {
    this.closeOnCapacity = closeOnCapacity;
  }

  public String getBeltRegistrationPhone() {
    return beltRegistrationPhone;
  }

  public void setBeltRegistrationPhone(String beltRegistrationPhone) {
    this.beltRegistrationPhone = beltRegistrationPhone;
  }

  public String getEventDescription() {
    return eventDescription;
  }

  public void setEventDescription(String eventDescription) {
    this.eventDescription = eventDescription;
  }
}
