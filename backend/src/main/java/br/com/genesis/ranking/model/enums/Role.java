package br.com.genesis.ranking.model.enums;

public enum Role {
  ADMIN,
  MESARIO,
  ATHLETE,
  STAFF,
  COACH;

  public String asAuthority() {
    return "ROLE_" + name();
  }
}
