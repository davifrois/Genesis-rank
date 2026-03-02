package br.com.genesis.ranking.model;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "event_registrations")
public class EventRegistration extends BaseEntity {
  @ManyToOne(fetch = FetchType.EAGER, optional = false)
  @JoinColumn(name = "event_id", nullable = false)
  private Event event;

  @Column(nullable = false, length = 180)
  private String nome;

  @Column(length = 180)
  private String email;

  @Column(length = 40)
  private String phone;

  @Column(length = 160)
  private String academia;

  @Column(length = 80)
  private String faixa;

  @Column(length = 80)
  private String peso;

  @Column(length = 120)
  private String categoria;

  @Column(length = 40)
  private String genero;

  @Column(length = 20)
  private String modalidade;

  @Column(length = 40)
  private String status;

  @Column(columnDefinition = "LONGTEXT")
  private String notes;

  @Column(columnDefinition = "TEXT")
  private String paymentReviewNotes;

  @Column(length = 120)
  private String paymentReviewedBy;

  private Instant paymentReviewedAt;

  public Event getEvent() {
    return event;
  }

  public void setEvent(Event event) {
    this.event = event;
  }

  public String getNome() {
    return nome;
  }

  public void setNome(String nome) {
    this.nome = nome;
  }

  public String getEmail() {
    return email;
  }

  public void setEmail(String email) {
    this.email = email;
  }

  public String getPhone() {
    return phone;
  }

  public void setPhone(String phone) {
    this.phone = phone;
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

  public String getModalidade() {
    return modalidade;
  }

  public void setModalidade(String modalidade) {
    this.modalidade = modalidade;
  }

  public String getStatus() {
    return status;
  }

  public void setStatus(String status) {
    this.status = status;
  }

  public String getNotes() {
    return notes;
  }

  public void setNotes(String notes) {
    this.notes = notes;
  }

  public String getPaymentReviewNotes() {
    return paymentReviewNotes;
  }

  public void setPaymentReviewNotes(String paymentReviewNotes) {
    this.paymentReviewNotes = paymentReviewNotes;
  }

  public String getPaymentReviewedBy() {
    return paymentReviewedBy;
  }

  public void setPaymentReviewedBy(String paymentReviewedBy) {
    this.paymentReviewedBy = paymentReviewedBy;
  }

  public Instant getPaymentReviewedAt() {
    return paymentReviewedAt;
  }

  public void setPaymentReviewedAt(Instant paymentReviewedAt) {
    this.paymentReviewedAt = paymentReviewedAt;
  }
}
