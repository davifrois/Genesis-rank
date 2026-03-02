package br.com.genesis.ranking.controller;

import java.util.List;

import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import br.com.genesis.ranking.dto.EventResponse;
import br.com.genesis.ranking.dto.PublicRegistrationRequest;
import br.com.genesis.ranking.dto.PublicRegistrationResponse;
import br.com.genesis.ranking.dto.RegistrationPaymentStatusRequest;
import br.com.genesis.ranking.service.EventService;
import br.com.genesis.ranking.service.PublicRegistrationService;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/public")
@Validated
public class PublicController {
  private final EventService eventService;
  private final PublicRegistrationService registrationService;

  public PublicController(EventService eventService, PublicRegistrationService registrationService) {
    this.eventService = eventService;
    this.registrationService = registrationService;
  }

  @GetMapping("/events")
  public List<EventResponse> listEvents() {
    return eventService.listAll();
  }

  @PostMapping("/registrations")
  public PublicRegistrationResponse register(@Valid @RequestBody PublicRegistrationRequest request) {
    return registrationService.register(request);
  }

  @GetMapping("/registrations")
  public List<PublicRegistrationResponse> listRegistrations(@RequestParam(required = false) String eventId) {
    return registrationService.listRegistrations(eventId);
  }

  @PatchMapping("/registrations/{registrationId}/payment")
  public PublicRegistrationResponse updatePaymentStatus(
      @PathVariable String registrationId,
      @Valid @RequestBody RegistrationPaymentStatusRequest request
  ) {
    return registrationService.updatePaymentStatus(registrationId, request);
  }
}
