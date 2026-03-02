package br.com.genesis.ranking.model;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "brackets")
public class Bracket extends BaseEntity {
  private Integer number;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "event_id")
  private Event event;

  @Column(length = 200)
  private String categoryKey;

  @Column(length = 200)
  private String label;

  @Column(length = 20)
  private String mode;

  private Integer size;

  private Instant appliedAt;

  @OneToMany(mappedBy = "bracket", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
  private List<BracketSeed> seeds = new ArrayList<>();

  @OneToOne(mappedBy = "bracket", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
  private BracketPodium podium;

  public Integer getNumber() {
    return number;
  }

  public void setNumber(Integer number) {
    this.number = number;
  }

  public Event getEvent() {
    return event;
  }

  public void setEvent(Event event) {
    this.event = event;
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

  public Instant getAppliedAt() {
    return appliedAt;
  }

  public void setAppliedAt(Instant appliedAt) {
    this.appliedAt = appliedAt;
  }

  public List<BracketSeed> getSeeds() {
    return seeds;
  }

  public void setSeeds(List<BracketSeed> seeds) {
    this.seeds = seeds;
  }

  public BracketPodium getPodium() {
    return podium;
  }

  public void setPodium(BracketPodium podium) {
    this.podium = podium;
  }
}
