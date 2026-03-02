package br.com.genesis.ranking.controller;

import java.util.List;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import br.com.genesis.ranking.dto.UserCreateRequest;
import br.com.genesis.ranking.dto.UserResponse;
import br.com.genesis.ranking.service.UserService;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/admin/users")
@Validated
@PreAuthorize("hasRole('ADMIN')")
public class UserAdminController {
  private final UserService userService;

  public UserAdminController(UserService userService) {
    this.userService = userService;
  }

  @GetMapping
  public List<UserResponse> listUsers() {
    return userService.listUsers();
  }

  @PostMapping
  public UserResponse createUser(@Valid @RequestBody UserCreateRequest request) {
    return userService.createUser(request);
  }
}
