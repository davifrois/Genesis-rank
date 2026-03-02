package br.com.genesis.ranking.service;

import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import br.com.genesis.ranking.dto.UserCreateRequest;
import br.com.genesis.ranking.dto.UserResponse;
import br.com.genesis.ranking.model.User;
import br.com.genesis.ranking.model.enums.Role;
import br.com.genesis.ranking.repository.UserRepository;

@Service
public class UserService {
  private final UserRepository userRepository;
  private final PasswordEncoder passwordEncoder;

  public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
    this.userRepository = userRepository;
    this.passwordEncoder = passwordEncoder;
  }

  public UserResponse createUser(UserCreateRequest request) {
    String username = normalizeUsername(request.getUsername());
    if (userRepository.existsByUsernameIgnoreCase(username)) {
      throw new IllegalArgumentException("Usuario ja cadastrado.");
    }

    User user = new User();
    user.setUsername(username);
    user.setName(request.getName().trim());
    user.setRole(parseRole(request.getRole()));
    user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
    user.setLastLogin(Instant.now());

    User saved = userRepository.save(user);
    return toResponse(saved);
  }

  public List<UserResponse> listUsers() {
    return userRepository.findAll().stream()
        .map(this::toResponse)
        .collect(Collectors.toList());
  }

  public UserResponse toResponse(User user) {
    UserResponse response = new UserResponse();
    response.setId(user.getId());
    response.setUsername(user.getUsername());
    response.setName(user.getName());
    response.setRole(user.getRole().name());
    response.setLastLogin(user.getLastLogin() != null ? user.getLastLogin().toString() : null);
    return response;
  }

  public Role parseRole(String value) {
    if (value == null || value.isBlank()) {
      return Role.ATHLETE;
    }
    String normalized = value.trim().toUpperCase(Locale.ROOT);
    try {
      return Role.valueOf(normalized);
    } catch (IllegalArgumentException ex) {
      return Role.ATHLETE;
    }
  }

  public String normalizeUsername(String username) {
    return username == null ? "" : username.trim().toLowerCase(Locale.ROOT);
  }
}
