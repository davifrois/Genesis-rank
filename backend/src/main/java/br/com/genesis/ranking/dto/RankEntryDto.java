package br.com.genesis.ranking.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public class RankEntryDto {
  private String id;
  private String nome;
  private String academia;
  private String faixa;
  private String peso;
  private String categoria;
  private String genero;
  @JsonProperty("isNoGi")
  private boolean isNoGi;
  @JsonProperty("isAbsolute")
  private boolean isAbsolute;
  private Integer pontos;
  private Integer rank;

  public String getId() {
    return id;
  }

  public void setId(String id) {
    this.id = id;
  }

  public String getNome() {
    return nome;
  }

  public void setNome(String nome) {
    this.nome = nome;
  }

  public String getAcademia() {
    return academia;
  }

  public void setAcademia(String academia) {
    this.academia = academia;
  }

  public String getFaixa() {
    return faixa;
  }

  public void setFaixa(String faixa) {
    this.faixa = faixa;
  }

  public String getPeso() {
    return peso;
  }

  public void setPeso(String peso) {
    this.peso = peso;
  }

  public String getCategoria() {
    return categoria;
  }

  public void setCategoria(String categoria) {
    this.categoria = categoria;
  }

  public String getGenero() {
    return genero;
  }

  public void setGenero(String genero) {
    this.genero = genero;
  }

  @JsonProperty("isNoGi")
  public boolean isNoGi() {
    return isNoGi;
  }

  @JsonProperty("isNoGi")
  public void setNoGi(boolean noGi) {
    isNoGi = noGi;
  }

  @JsonProperty("isAbsolute")
  public boolean isAbsolute() {
    return isAbsolute;
  }

  @JsonProperty("isAbsolute")
  public void setAbsolute(boolean absolute) {
    isAbsolute = absolute;
  }

  public Integer getPontos() {
    return pontos;
  }

  public void setPontos(Integer pontos) {
    this.pontos = pontos;
  }

  public Integer getRank() {
    return rank;
  }

  public void setRank(Integer rank) {
    this.rank = rank;
  }
}
