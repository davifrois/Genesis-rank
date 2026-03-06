package br.com.genesis.ranking.controller;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import br.com.genesis.ranking.dto.PublicRegistrationResponse;
import br.com.genesis.ranking.dto.RegistrationPaymentStatusRequest;
import br.com.genesis.ranking.service.PublicRegistrationService;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/admin/registrations")
@Validated
@PreAuthorize("hasRole('ADMIN')")
public class AdminRegistrationController {
  private final PublicRegistrationService registrationService;

  public AdminRegistrationController(PublicRegistrationService registrationService) {
    this.registrationService = registrationService;
  }

  @PatchMapping("/{registrationId}/payment")
  public PublicRegistrationResponse updatePaymentStatus(
      @PathVariable String registrationId,
      @Valid @RequestBody RegistrationPaymentStatusRequest request
  ) {
    return registrationService.updatePaymentStatus(registrationId, request);
  }
}
