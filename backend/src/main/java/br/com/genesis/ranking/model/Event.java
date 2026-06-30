package br.com.genesis.ranking.model;

import java.time.LocalDate;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Lob;
import jakarta.persistence.Table;

@Entity
@Table(name = "events")
public class Event extends BaseEntity {
  @Column(nullable = false, length = 160)
  private String name;

  private LocalDate date;

  @Column(length = 180)
  private String location;

  @Column(columnDefinition = "boolean default false")
  private Boolean accommodationEnabled = false;

  @Column(length = 140)
  private String accommodationTitle;

  @Lob
  @Column(name = "accommodation_description")
  private String accommodationDescription;

  @Column(length = 220)
  private String accommodationSearchLocation;

  @Column(length = 600)
  private String posterUrl;

  @Column(length = 600)
  private String registrationUrl;

  @Column(length = 220)
  private String pixKey;

  private Double feeUnder15;

  private Double feeOver15;

  private Double feeCombo;

  private Double feeAbsolute;

  @Column(columnDefinition = "boolean default false")
  private Boolean beltRegistrationEnabled = false;

  @Column(length = 140)
  private String beltRegistrationTitle;

  private Double beltRegistrationPrice;

  @Column(length = 600)
  private String beltRegistrationDescription;

  @Lob
  @Column(name = "batches_json")
  private String batchesJson;

  private LocalDate endDate;

  private Integer maxAthletes;

  @Column(columnDefinition = "boolean default false")
  private Boolean closeOnCapacity = false;

  @Column(length = 30)
  private String beltRegistrationPhone;

  @Lob
  @Column(name = "event_description")
  private String eventDescription;

  @Lob
  @Column(name = "super_fights_json")
  private String superFightsJson;

  @Column(columnDefinition = "boolean default false")
  private Boolean superFightsPublished = false;

  @Column(length = 40)
  private String eventPhase;

  @Column(columnDefinition = "boolean default true")
  private Boolean publicPublished = true;

  @Column(columnDefinition = "boolean default true")
  private Boolean registrationOpen = true;

  @Column(columnDefinition = "boolean default true")
  private Boolean internalRegistration = true;

  public String getName() {
    return name;
  }

  public void setName(String name) {
    this.name = name;
  }

  public LocalDate getDate() {
    return date;
  }

  public void setDate(LocalDate date) {
    this.date = date;
  }

  public String getLocation() {
    return location;
  }

  public void setLocation(String location) {
    this.location = location;
  }

  public Boolean getAccommodationEnabled() {
    return accommodationEnabled != null ? accommodationEnabled : false;
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
    return beltRegistrationEnabled != null ? beltRegistrationEnabled : false;
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

  public String getBatchesJson() {
    return batchesJson;
  }

  public void setBatchesJson(String batchesJson) {
    this.batchesJson = batchesJson;
  }

  public Boolean getRegistrationOpen() {
    return registrationOpen != null ? registrationOpen : true;
  }

  public void setRegistrationOpen(Boolean registrationOpen) {
    this.registrationOpen = registrationOpen;
  }

  public Boolean getInternalRegistration() {
    return internalRegistration != null ? internalRegistration : true;
  }

  public void setInternalRegistration(Boolean internalRegistration) {
    this.internalRegistration = internalRegistration;
  }

  public LocalDate getEndDate() {
    return endDate;
  }

  public void setEndDate(LocalDate endDate) {
    this.endDate = endDate;
  }

  public Integer getMaxAthletes() {
    return maxAthletes;
  }

  public void setMaxAthletes(Integer maxAthletes) {
    this.maxAthletes = maxAthletes;
  }

  public Boolean getCloseOnCapacity() {
    return closeOnCapacity != null ? closeOnCapacity : false;
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

  public String getSuperFightsJson() {
    return superFightsJson;
  }

  public void setSuperFightsJson(String superFightsJson) {
    this.superFightsJson = superFightsJson;
  }

  public Boolean getSuperFightsPublished() {
    return superFightsPublished != null ? superFightsPublished : false;
  }

  public void setSuperFightsPublished(Boolean superFightsPublished) {
    this.superFightsPublished = superFightsPublished;
  }

  public String getEventPhase() {
    return eventPhase;
  }

  public void setEventPhase(String eventPhase) {
    this.eventPhase = eventPhase;
  }

  public Boolean getPublicPublished() {
    return publicPublished != null ? publicPublished : true;
  }

  public void setPublicPublished(Boolean publicPublished) {
    this.publicPublished = publicPublished;
  }
}
