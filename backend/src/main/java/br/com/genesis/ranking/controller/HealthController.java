package br.com.genesis.ranking.controller;

import java.time.Instant;
import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import br.com.genesis.ranking.config.RequestTraceFilter;
import jakarta.servlet.http.HttpServletRequest;

@RestController
@RequestMapping("/api/health")
public class HealthController {
  private final Instant startedAt = Instant.now();

  @GetMapping
  public Map<String, String> health(HttpServletRequest request) {
    Object traceId = request.getAttribute(RequestTraceFilter.TRACE_ID_ATTR);
    return Map.of(
        "status", "ok",
        "timestamp", Instant.now().toString(),
        "startedAt", startedAt.toString(),
        "traceId", traceId != null ? traceId.toString() : ""
    );
  }
}
