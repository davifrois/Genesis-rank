package br.com.genesis.ranking.dto;

import jakarta.validation.constraints.NotBlank;

public class RegistrationPaymentStatusRequest {
  @NotBlank(message = "Status de pagamento invalido.")
  private String status;

  private String reviewNotes;
  private String reviewedBy;

  public String getStatus() {
    return status;
  }

  public void setStatus(String status) {
    this.status = status;
  }

  public String getReviewNotes() {
    return reviewNotes;
  }

  public void setReviewNotes(String reviewNotes) {
    this.reviewNotes = reviewNotes;
  }

  public String getReviewedBy() {
    return reviewedBy;
  }

  public void setReviewedBy(String reviewedBy) {
    this.reviewedBy = reviewedBy;
  }
}
