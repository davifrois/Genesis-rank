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
import br.com.genesis.ranking.dto.RegistrationDetailsUpdateRequest;

@RestController
@RequestMapping("/api/admin/registrations")
@Validated
@PreAuthorize("hasRole('ADMIN')")
// Controlador de Administração de Inscrições de Campeonato
// Este controlador gerencia as inscrições dos atletas (ex: atualizar status, pagamentos) por parte do admin.
public class InscricaoCampeonatoAdminController {
  private final PublicRegistrationService registrationService;

  public InscricaoCampeonatoAdminController(PublicRegistrationService registrationService) {
    this.registrationService = registrationService;
  }

  // Atualiza o status de pagamento de uma inscrição (ex: marcar como pago)
  @PatchMapping("/{registrationId}/payment")
  public PublicRegistrationResponse updatePaymentStatus(
      @PathVariable String registrationId,
      @Valid @RequestBody RegistrationPaymentStatusRequest request
  ) {
    return registrationService.updatePaymentStatus(registrationId, request);
  }

  // Atualiza os detalhes de uma inscrição (ex: mudança de categoria, peso, faixa)
  @PatchMapping("/{registrationId}/details")
  public PublicRegistrationResponse updateRegistrationDetails(
      @PathVariable String registrationId,
      @Valid @RequestBody RegistrationDetailsUpdateRequest request
  ) {
    return registrationService.updateRegistrationDetails(registrationId, request);
  }
}
