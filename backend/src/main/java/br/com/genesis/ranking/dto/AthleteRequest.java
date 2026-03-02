package br.com.genesis.ranking.dto;

import java.util.ArrayList;
import java.util.List;

import jakarta.validation.constraints.NotBlank;
import com.fasterxml.jackson.annotation.JsonProperty;

public class AthleteRequest {
  private String id;

  @NotBlank
  private String nome;

  private String faixa;
  private String peso;
  private String categoria;
  private String academia;
  private String genero;
  private String sexo;
  @JsonProperty("isNoGi")
  private boolean isNoGi;
  @JsonProperty("isAbsolute")
  private boolean isAbsolute;
  private Integer pontos;
  private String eventId;
  private List<HistoryItemDto> historico = new ArrayList<>();

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

  public String getAcademia() {
    return academia;
  }

  public void setAcademia(String academia) {
    this.academia = academia;
  }

  public String getGenero() {
    return genero;
  }

  public void setGenero(String genero) {
    this.genero = genero;
  }

  public String getSexo() {
    return sexo;
  }

  public void setSexo(String sexo) {
    this.sexo = sexo;
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

  public String getEventId() {
    return eventId;
  }

  public void setEventId(String eventId) {
    this.eventId = eventId;
  }

  public List<HistoryItemDto> getHistorico() {
    return historico;
  }

  public void setHistorico(List<HistoryItemDto> historico) {
    this.historico = historico;
  }
}
