package br.com.genesis.ranking.dto;

public class PodiumDto {
  private String goldId;
  private String silverId;
  private String bronzeId;

  public String getGoldId() {
    return goldId;
  }

  public void setGoldId(String goldId) {
    this.goldId = goldId;
  }

  public String getSilverId() {
    return silverId;
  }

  public void setSilverId(String silverId) {
    this.silverId = silverId;
  }

  public String getBronzeId() {
    return bronzeId;
  }

  public void setBronzeId(String bronzeId) {
    this.bronzeId = bronzeId;
  }
}
