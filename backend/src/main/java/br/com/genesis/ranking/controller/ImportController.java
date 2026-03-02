package br.com.genesis.ranking.controller;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import br.com.genesis.ranking.dto.ImportPayloadDto;
import br.com.genesis.ranking.dto.ImportResultDto;
import br.com.genesis.ranking.service.ImportService;

@RestController
@RequestMapping("/api/admin/import")
@PreAuthorize("hasRole('ADMIN')")
public class ImportController {
  private final ImportService importService;

  public ImportController(ImportService importService) {
    this.importService = importService;
  }

  @PostMapping("/local-storage")
  public ImportResultDto importLocalStorage(
      @RequestBody ImportPayloadDto payload,
      @RequestParam(name = "replace", defaultValue = "false") boolean replace
  ) {
    return importService.importFromLocalStorage(payload, replace);
  }
}
