package br.com.genesis.ranking.dto;

import jakarta.validation.constraints.NotBlank;

public class UserUpdateRequest {
  @NotBlank
  private String username;

  @NotBlank
  private String name;

  private String role;

  public String getUsername() {
    return username;
  }

  public void setUsername(String username) {
    this.username = username;
  }

  public String getName() {
    return name;
  }

  public void setName(String name) {
    this.name = name;
  }

  public String getRole() {
    return role;
  }

  public void setRole(String role) {
    this.role = role;
  }
}
