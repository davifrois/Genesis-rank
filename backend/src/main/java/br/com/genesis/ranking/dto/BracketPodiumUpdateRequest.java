package br.com.genesis.ranking.dto;

public class BracketPodiumUpdateRequest {
  private PodiumDto podium;
  private String appliedAt;

  public PodiumDto getPodium() {
    return podium;
  }

  public void setPodium(PodiumDto podium) {
    this.podium = podium;
  }

  public String getAppliedAt() {
    return appliedAt;
  }

  public void setAppliedAt(String appliedAt) {
    this.appliedAt = appliedAt;
  }
}
