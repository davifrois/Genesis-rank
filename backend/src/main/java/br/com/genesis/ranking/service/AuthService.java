package br.com.genesis.ranking.service;

import java.time.Instant;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import br.com.genesis.ranking.config.JwtUtil;
import br.com.genesis.ranking.dto.AuthResponse;
import br.com.genesis.ranking.dto.LoginRequest;
import br.com.genesis.ranking.dto.UserResponse;
import br.com.genesis.ranking.model.User;
import br.com.genesis.ranking.repository.UserRepository;

@Service
public class AuthService {
  private final UserRepository userRepository;
  private final PasswordEncoder passwordEncoder;
  private final JwtUtil jwtUtil;
  private final UserService userService;

  public AuthService(
      UserRepository userRepository,
      PasswordEncoder passwordEncoder,
      JwtUtil jwtUtil,
      UserService userService
  ) {
    this.userRepository = userRepository;
    this.passwordEncoder = passwordEncoder;
    this.jwtUtil = jwtUtil;
    this.userService = userService;
  }

  public AuthResponse login(LoginRequest request) {
    String username = userService.normalizeUsername(request.getUsername());
    User user = userRepository.findByUsernameIgnoreCase(username)
        .orElseThrow(() -> new IllegalArgumentException("Usuário não encontrado."));

    if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
      throw new IllegalArgumentException("Senha incorreta.");
    }

    user.setLastLogin(Instant.now());
    userRepository.save(user);

    String token = jwtUtil.generateToken(user);
    UserResponse response = userService.toResponse(user);
    return new AuthResponse(token, response);
  }
}
