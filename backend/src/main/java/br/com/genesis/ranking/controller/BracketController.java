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

import br.com.genesis.ranking.dto.BracketPodiumUpdateRequest;
import br.com.genesis.ranking.dto.BracketRequest;
import br.com.genesis.ranking.dto.BracketResponse;
import br.com.genesis.ranking.dto.BracketLiveUpdateRequest;
import br.com.genesis.ranking.service.BracketService;

@RestController
@RequestMapping("/api/brackets")
@Validated
public class BracketController {
  private final BracketService bracketService;

  public BracketController(BracketService bracketService) {
    this.bracketService = bracketService;
  }

  @GetMapping
  @PreAuthorize("hasAnyRole('ADMIN','MESARIO','STAFF')")
  public List<BracketResponse> listBrackets(@RequestParam(name = "eventId", required = false) String eventId) {
    return bracketService.listAll(eventId);
  }

  @PostMapping
  @PreAuthorize("hasRole('ADMIN')")
  public BracketResponse createBracket(@RequestBody BracketRequest request) {
    return bracketService.create(request);
  }

  @PutMapping("/{id}")
  @PreAuthorize("hasRole('ADMIN')")
  public BracketResponse updateBracket(@PathVariable String id, @RequestBody BracketRequest request) {
    return bracketService.update(id, request);
  }

  @PutMapping("/{id}/podium")
  @PreAuthorize("hasRole('ADMIN')")
  public BracketResponse updateBracketPodium(
      @PathVariable String id,
      @RequestBody BracketPodiumUpdateRequest request
  ) {
    return bracketService.updatePodiumOnly(id, request == null ? null : request.getPodium(), request == null ? null : request.getAppliedAt());
  }

  @PutMapping("/{id}/live")
  @PreAuthorize("hasAnyRole('ADMIN','MESARIO','STAFF')")
  public BracketResponse updateBracketLiveState(
      @PathVariable String id,
      @RequestBody BracketLiveUpdateRequest request
  ) {
    return bracketService.updateLiveStateOnly(
        id,
        request == null ? null : request.getLiveMatches(),
        request == null ? null : request.getWalkovers()
    );
  }

  @DeleteMapping("/{id}")
  @PreAuthorize("hasRole('ADMIN')")
  public void deleteBracket(@PathVariable String id) {
    bracketService.delete(id);
  }
}
