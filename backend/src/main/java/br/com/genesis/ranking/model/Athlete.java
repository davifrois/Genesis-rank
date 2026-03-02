package br.com.genesis.ranking.model;

import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;

@Entity
@Table(name = "athletes")
public class Athlete extends BaseEntity {
  @Column(nullable = false, length = 180)
  private String nome;

  @Column(length = 80)
  private String faixa;

  @Column(length = 80)
  private String peso;

  @Column(length = 120)
  private String categoria;

  @Column(length = 160)
  private String academia;

  @Column(length = 40)
  private String genero;

  private boolean isNoGi;

  private boolean isAbsolute;

  private Integer pontos;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "event_id")
  private Event event;

  @OneToMany(mappedBy = "athlete", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
  private List<AthleteHistory> historico = new ArrayList<>();

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

  public boolean isNoGi() {
    return isNoGi;
  }

  public void setNoGi(boolean noGi) {
    isNoGi = noGi;
  }

  public boolean isAbsolute() {
    return isAbsolute;
  }

  public void setAbsolute(boolean absolute) {
    isAbsolute = absolute;
  }

  public Integer getPontos() {
    return pontos;
  }

  public void setPontos(Integer pontos) {
    this.pontos = pontos;
  }

  public Event getEvent() {
    return event;
  }

  public void setEvent(Event event) {
    this.event = event;
  }

  public List<AthleteHistory> getHistorico() {
    return historico;
  }

  public void setHistorico(List<AthleteHistory> historico) {
    this.historico = historico;
  }
}
