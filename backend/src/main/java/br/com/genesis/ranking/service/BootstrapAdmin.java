package br.com.genesis.ranking.service;

import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
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

  @Value("${app.bootstrap.seed-default-panel-users:false}")
  private boolean seedDefaultPanelUsers;

  private static final List<BootstrapUserSeed> DEFAULT_PANEL_USERS = List.of(
      new BootstrapUserSeed("simone", "simone123", "Simone", "ADMIN"),
      new BootstrapUserSeed("davifrois", "davifrois324@", "Davi oliveira frois", "ADMIN"),
      new BootstrapUserSeed("mesario1", "mesario123", "Mesario 1", "MESARIO")
  );

  public BootstrapAdmin(UserRepository userRepository, PasswordEncoder passwordEncoder, UserService userService) {
    this.userRepository = userRepository;
    this.passwordEncoder = passwordEncoder;
    this.userService = userService;
  }

  @jakarta.annotation.PostConstruct
  public void ensureAdminUser() {
    ensureUser(adminUsername, adminPassword, adminName, adminRole);
    if (!seedDefaultPanelUsers) {
      return;
    }
    for (BootstrapUserSeed seed : DEFAULT_PANEL_USERS) {
      ensureUser(seed.username(), seed.password(), seed.name(), seed.role());
    }
  }

  private void ensureUser(String rawUsername, String rawPassword, String rawName, String rawRole) {
    String username = userService.normalizeUsername(rawUsername);
    if (username.isBlank()) {
      return;
    }
    if (userRepository.existsByUsernameIgnoreCase(username)) {
      return;
    }
    String safeName = rawName == null || rawName.isBlank() ? username : rawName.trim();
    String safePassword = rawPassword == null || rawPassword.isBlank() ? "admin123" : rawPassword;

    User user = new User();
    user.setUsername(username);
    user.setName(safeName);
    user.setRole(parseRole(rawRole));
    user.setPasswordHash(passwordEncoder.encode(safePassword));
    try {
      userRepository.save(user);
    } catch (DataIntegrityViolationException ex) {
      // Ignore bootstrap users incompatible with legacy constraints.
    }
  }

  private Role parseRole(String role) {
    try {
      return Role.valueOf(role == null ? "ADMIN" : role.trim().toUpperCase());
    } catch (IllegalArgumentException ex) {
      return Role.ADMIN;
    }
  }

  private record BootstrapUserSeed(String username, String password, String name, String role) {}
}
