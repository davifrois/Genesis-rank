package br.com.genesis.ranking.controller;

import java.util.List;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import br.com.genesis.ranking.dto.EventRequest;
import br.com.genesis.ranking.dto.EventResponse;
import br.com.genesis.ranking.service.EventService;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/events")
@Validated
public class EventController {
  private final EventService eventService;

  public EventController(EventService eventService) {
    this.eventService = eventService;
  }

  @GetMapping
  public List<EventResponse> listEvents() {
    return eventService.listAll();
  }

  @PostMapping
  @PreAuthorize("hasRole('ADMIN')")
  public EventResponse createEvent(@Valid @RequestBody EventRequest request) {
    return eventService.create(request);
  }

  @PutMapping("/{id}")
  @PreAuthorize("hasRole('ADMIN')")
  public EventResponse updateEvent(@PathVariable String id, @Valid @RequestBody EventRequest request) {
    return eventService.update(id, request);
  }

  @DeleteMapping("/{id}")
  @PreAuthorize("hasRole('ADMIN')")
  public void deleteEvent(@PathVariable String id) {
    eventService.delete(id);
  }
}
