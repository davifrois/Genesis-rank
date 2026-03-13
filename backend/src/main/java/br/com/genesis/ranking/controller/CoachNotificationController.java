package br.com.genesis.ranking.controller;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import br.com.genesis.ranking.dto.CoachAthleteLinkedNotificationRequest;
import br.com.genesis.ranking.service.CoachNotificationEmailService;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/coach/notifications")
@Validated
public class CoachNotificationController {
  private static final String COACH_ROLE = "ROLE_COACH";

  private final CoachNotificationEmailService coachNotificationEmailService;

  public CoachNotificationController(CoachNotificationEmailService coachNotificationEmailService) {
    this.coachNotificationEmailService = coachNotificationEmailService;
  }

  @PostMapping("/athlete-linked")
  @PreAuthorize("hasAnyRole('ADMIN','COACH')")
  public void notifyAthleteLinked(
      @Valid @RequestBody CoachAthleteLinkedNotificationRequest request,
      Authentication authentication
  ) {
    String authenticatedUsername = authentication != null ? authentication.getName() : "";
    boolean coachUser = authentication != null
        && authentication.getAuthorities().stream()
            .anyMatch((authority) -> COACH_ROLE.equalsIgnoreCase(authority.getAuthority()));

    coachNotificationEmailService.sendAthleteLinkedEmail(request, authenticatedUsername, coachUser);
  }
}
