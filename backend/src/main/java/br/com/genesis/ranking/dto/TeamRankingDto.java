package br.com.genesis.ranking.dto;

public class TeamRankingDto {
  private String academy;
  private Integer campeao;
  private Integer vice;
  private Integer terceiro;
  private Integer pontos;
  private Integer atletas;
  private Integer rank;

  public String getAcademy() {
    return academy;
  }

  public void setAcademy(String academy) {
    this.academy = academy;
  }

  public Integer getCampeao() {
    return campeao;
  }

  public void setCampeao(Integer campeao) {
    this.campeao = campeao;
  }

  public Integer getVice() {
    return vice;
  }

  public void setVice(Integer vice) {
    this.vice = vice;
  }

  public Integer getTerceiro() {
    return terceiro;
  }

  public void setTerceiro(Integer terceiro) {
    this.terceiro = terceiro;
  }

  public Integer getPontos() {
    return pontos;
  }

  public void setPontos(Integer pontos) {
    this.pontos = pontos;
  }

  public Integer getAtletas() {
    return atletas;
  }

  public void setAtletas(Integer atletas) {
    this.atletas = atletas;
  }

  public Integer getRank() {
    return rank;
  }

  public void setRank(Integer rank) {
    this.rank = rank;
  }
}
