package br.com.genesis.ranking.model;

import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "bracket_seeds")
public class BracketSeed extends BaseEntity {
  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "bracket_id", nullable = false)
  private Bracket bracket;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "athlete_id", nullable = false)
  private Athlete athlete;

  private Integer seedOrder;

  public Bracket getBracket() {
    return bracket;
  }

  public void setBracket(Bracket bracket) {
    this.bracket = bracket;
  }

  public Athlete getAthlete() {
    return athlete;
  }

  public void setAthlete(Athlete athlete) {
    this.athlete = athlete;
  }

  public Integer getSeedOrder() {
    return seedOrder;
  }

  public void setSeedOrder(Integer seedOrder) {
    this.seedOrder = seedOrder;
  }
}
