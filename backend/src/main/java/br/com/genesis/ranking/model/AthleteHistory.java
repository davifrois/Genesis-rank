package br.com.genesis.ranking.model;

import java.time.Instant;

import br.com.genesis.ranking.model.enums.HistoryType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "athlete_history")
public class AthleteHistory extends BaseEntity {
  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "athlete_id", nullable = false)
  private Athlete athlete;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  private HistoryType type;

  private Integer points;

  private Integer position;

  @Column(length = 40)
  private String source;

  @Column(length = 60)
  private String bracketId;

  private Instant timestamp;

  public Athlete getAthlete() {
    return athlete;
  }

  public void setAthlete(Athlete athlete) {
    this.athlete = athlete;
  }

  public HistoryType getType() {
    return type;
  }

  public void setType(HistoryType type) {
    this.type = type;
  }

  public Integer getPoints() {
    return points;
  }

  public void setPoints(Integer points) {
    this.points = points;
  }

  public Integer getPosition() {
    return position;
  }

  public void setPosition(Integer position) {
    this.position = position;
  }

  public String getSource() {
    return source;
  }

  public void setSource(String source) {
    this.source = source;
  }

  public String getBracketId() {
    return bracketId;
  }

  public void setBracketId(String bracketId) {
    this.bracketId = bracketId;
  }

  public Instant getTimestamp() {
    return timestamp;
  }

  public void setTimestamp(Instant timestamp) {
    this.timestamp = timestamp;
  }
}
