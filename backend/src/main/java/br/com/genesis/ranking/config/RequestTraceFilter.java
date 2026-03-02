package br.com.genesis.ranking.config;

import java.io.IOException;
import java.util.UUID;

import org.slf4j.MDC;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
public class RequestTraceFilter extends OncePerRequestFilter {
  public static final String TRACE_ID_HEADER = "X-Trace-Id";
  public static final String TRACE_ID_ATTR = "traceId";
  private static final String TRACE_ID_MDC_KEY = "traceId";

  @Override
  protected void doFilterInternal(
      HttpServletRequest request,
      HttpServletResponse response,
      FilterChain filterChain
  ) throws ServletException, IOException {
    String incomingTraceId = request.getHeader(TRACE_ID_HEADER);
    String traceId = normalizeTraceId(incomingTraceId);
    if (traceId.isBlank()) {
      traceId = UUID.randomUUID().toString();
    }

    request.setAttribute(TRACE_ID_ATTR, traceId);
    response.setHeader(TRACE_ID_HEADER, traceId);
    MDC.put(TRACE_ID_MDC_KEY, traceId);
    try {
      filterChain.doFilter(request, response);
    } finally {
      MDC.remove(TRACE_ID_MDC_KEY);
    }
  }

  private String normalizeTraceId(String value) {
    if (value == null) return "";
    String normalized = value.trim();
    if (normalized.length() > 120) {
      normalized = normalized.substring(0, 120);
    }
    return normalized.replaceAll("[^a-zA-Z0-9._:-]", "");
  }
}
