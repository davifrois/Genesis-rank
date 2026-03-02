package br.com.genesis.ranking.model.enums;

public enum Role {
  ADMIN,
  ATHLETE,
  STAFF,
  COACH;

  public String asAuthority() {
    return "ROLE_" + name();
  }
}
