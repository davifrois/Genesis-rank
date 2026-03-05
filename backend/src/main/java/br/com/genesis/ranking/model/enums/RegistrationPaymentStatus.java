package br.com.genesis.ranking.model.enums;

import java.util.Locale;

public enum RegistrationPaymentStatus {
  PENDING,
  PAYMENT_CONFIRMED,
  PAYMENT_ERROR;

  public static RegistrationPaymentStatus fromStored(String value) {
    String normalized = normalize(value);
    for (RegistrationPaymentStatus status : values()) {
      if (status.name().equals(normalized)) {
        return status;
      }
    }
    return PENDING;
  }

  public static RegistrationPaymentStatus fromExternal(String value) {
    String normalized = normalize(value);
    if (
        "PENDENTE".equals(normalized)
        || "PENDING_REVIEW".equals(normalized)
        || "PENDING".equals(normalized)
    ) {
      return PENDING;
    }
    if (
        "PAGO".equals(normalized)
        || "CONFIRMADO".equals(normalized)
        || "PAGAMENTO_CONFIRMADO".equals(normalized)
        || "PAYMENT_CONFIRMED".equals(normalized)
    ) {
      return PAYMENT_CONFIRMED;
    }
    if (
        "ERRO".equals(normalized)
        || "RECUSADO".equals(normalized)
        || "PAGAMENTO_ERRO".equals(normalized)
        || "PAYMENT_ERROR".equals(normalized)
    ) {
      return PAYMENT_ERROR;
    }
    throw new IllegalArgumentException("Status de pagamento inválido.");
  }

  private static String normalize(String value) {
    return (value == null ? "" : value.trim())
        .toUpperCase(Locale.ROOT)
        .replace('-', '_')
        .replace(' ', '_');
  }
}
