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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import br.com.genesis.ranking.dto.AthleteRequest;
import br.com.genesis.ranking.dto.AthleteResponse;
import br.com.genesis.ranking.service.AthleteService;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/athletes")
@Validated
public class AthleteController {
  private final AthleteService athleteService;

  public AthleteController(AthleteService athleteService) {
    this.athleteService = athleteService;
  }

  @GetMapping
  public List<AthleteResponse> listAthletes(@RequestParam(name = "eventId", required = false) String eventId) {
    return athleteService.listAll(eventId);
  }

  @PostMapping
  @PreAuthorize("hasRole('ADMIN')")
  public AthleteResponse createAthlete(@Valid @RequestBody AthleteRequest request) {
    return athleteService.create(request);
  }

  @PutMapping("/{id}")
  @PreAuthorize("hasRole('ADMIN')")
  public AthleteResponse updateAthlete(@PathVariable String id, @Valid @RequestBody AthleteRequest request) {
    return athleteService.update(id, request);
  }

  @DeleteMapping("/{id}")
  @PreAuthorize("hasRole('ADMIN')")
  public void deleteAthlete(@PathVariable String id) {
    athleteService.delete(id);
  }
}
