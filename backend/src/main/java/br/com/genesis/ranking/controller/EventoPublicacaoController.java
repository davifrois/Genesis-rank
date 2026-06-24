package br.com.genesis.ranking.controller;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import br.com.genesis.ranking.service.BracketService;

@RestController
@RequestMapping("/api/eventos")
@Validated
public class EventoPublicacaoController {
  private final BracketService bracketService;

  public EventoPublicacaoController(BracketService bracketService) {
    this.bracketService = bracketService;
  }

  @PostMapping("/{id}/publicar-chaves")
  @PreAuthorize("hasRole('ADMIN')")
  public ResponseEntity<Map<String, Object>> publicarChaves(
      @PathVariable String id,
      @RequestParam(name = "publicado", defaultValue = "true") boolean publicado
  ) {
    int updated = bracketService.setPublishedForEvent(id, publicado);
    String message = publicado
        ? "Chaves publicadas com sucesso para o evento " + id + "."
        : "Publicacao de chaves desativada para o evento " + id + ".";
    return ResponseEntity.ok(Map.of(
        "eventId", id,
        "isPublished", publicado,
        "updatedBrackets", updated,
        "message", message
    ));
  }
}
