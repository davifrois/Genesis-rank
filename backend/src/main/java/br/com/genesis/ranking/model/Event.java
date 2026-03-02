package br.com.genesis.ranking.model;

import java.time.LocalDate;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

@Entity
@Table(name = "events")
public class Event extends BaseEntity {
  @Column(nullable = false, length = 160)
  private String name;

  private LocalDate date;

  @Column(length = 180)
  private String location;

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

  @Column(nullable = false)
  private boolean registrationOpen = true;

  @Column(nullable = false)
  private boolean internalRegistration = true;

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
}
