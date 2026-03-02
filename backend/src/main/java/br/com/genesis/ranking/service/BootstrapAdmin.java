package br.com.genesis.ranking.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import br.com.genesis.ranking.model.User;
import br.com.genesis.ranking.model.enums.Role;
import br.com.genesis.ranking.repository.UserRepository;

@Component
public class BootstrapAdmin {
  private final UserRepository userRepository;
  private final PasswordEncoder passwordEncoder;
  private final UserService userService;

  @Value("${app.bootstrap.admin.username}")
  private String adminUsername;

  @Value("${app.bootstrap.admin.password}")
  private String adminPassword;

  @Value("${app.bootstrap.admin.name}")
  private String adminName;

  @Value("${app.bootstrap.admin.role}")
  private String adminRole;

  public BootstrapAdmin(UserRepository userRepository, PasswordEncoder passwordEncoder, UserService userService) {
    this.userRepository = userRepository;
    this.passwordEncoder = passwordEncoder;
    this.userService = userService;
  }

  @jakarta.annotation.PostConstruct
  public void ensureAdminUser() {
    String username = userService.normalizeUsername(adminUsername);
    if (username.isBlank()) {
      return;
    }
    if (userRepository.existsByUsernameIgnoreCase(username)) {
      return;
    }

    User user = new User();
    user.setUsername(username);
    user.setName(adminName == null || adminName.isBlank() ? "Admin" : adminName.trim());
    user.setRole(parseRole(adminRole));
    user.setPasswordHash(passwordEncoder.encode(adminPassword));
    userRepository.save(user);
  }

  private Role parseRole(String role) {
    try {
      return Role.valueOf(role == null ? "ADMIN" : role.trim().toUpperCase());
    } catch (IllegalArgumentException ex) {
      return Role.ADMIN;
    }
  }
}
