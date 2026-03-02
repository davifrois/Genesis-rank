package br.com.genesis.ranking.model;

import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "bracket_podium")
public class BracketPodium extends BaseEntity {
  @OneToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "bracket_id", nullable = false)
  private Bracket bracket;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "gold_id")
  private Athlete gold;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "silver_id")
  private Athlete silver;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "bronze_id")
  private Athlete bronze;

  public Bracket getBracket() {
    return bracket;
  }

  public void setBracket(Bracket bracket) {
    this.bracket = bracket;
  }

  public Athlete getGold() {
    return gold;
  }

  public void setGold(Athlete gold) {
    this.gold = gold;
  }

  public Athlete getSilver() {
    return silver;
  }

  public void setSilver(Athlete silver) {
    this.silver = silver;
  }

  public Athlete getBronze() {
    return bronze;
  }

  public void setBronze(Athlete bronze) {
    this.bronze = bronze;
  }
}
