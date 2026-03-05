package br.com.genesis.ranking.controller;

import java.time.Instant;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

import br.com.genesis.ranking.config.RequestTraceFilter;
import br.com.genesis.ranking.dto.ErrorResponse;
import jakarta.servlet.http.HttpServletRequest;

@ControllerAdvice
public class RestExceptionHandler {
  private static final Logger logger = LoggerFactory.getLogger(RestExceptionHandler.class);

  @ExceptionHandler(IllegalArgumentException.class)
  public ResponseEntity<ErrorResponse> handleIllegalArgument(
      IllegalArgumentException ex,
      HttpServletRequest request
  ) {
    String traceId = resolveTraceId(request);
    logger.warn("Business validation error. traceId={}, path={}, message={}", traceId, resolvePath(request), ex.getMessage());
    return buildResponse(
        HttpStatus.BAD_REQUEST,
        "BUSINESS_ERROR",
        ex.getMessage(),
        request
    );
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ResponseEntity<ErrorResponse> handleValidation(
      MethodArgumentNotValidException ex,
      HttpServletRequest request
  ) {
    String message = "Dados inválidos.";
    FieldError error = ex.getBindingResult().getFieldError();
    if (error != null) {
      message = error.getDefaultMessage();
    }
    String traceId = resolveTraceId(request);
    logger.warn("Request validation error. traceId={}, path={}, message={}", traceId, resolvePath(request), message);
    return buildResponse(
        HttpStatus.BAD_REQUEST,
        "VALIDATION_ERROR",
        message,
        request
    );
  }

  @ExceptionHandler(Exception.class)
  public ResponseEntity<ErrorResponse> handleGeneric(Exception ex, HttpServletRequest request) {
    String traceId = resolveTraceId(request);
    logger.error("Unhandled server error. traceId={}, path={}", traceId, resolvePath(request), ex);
    return buildResponse(
        HttpStatus.INTERNAL_SERVER_ERROR,
        "INTERNAL_ERROR",
        "Erro interno no servidor.",
        request
    );
  }

  private ResponseEntity<ErrorResponse> buildResponse(
      HttpStatus status,
      String code,
      String message,
      HttpServletRequest request
  ) {
    String traceId = resolveTraceId(request);
    ErrorResponse body = new ErrorResponse(
        message,
        code,
        status.value(),
        traceId,
        resolvePath(request),
        Instant.now().toString()
    );
    return ResponseEntity
        .status(status)
        .header(RequestTraceFilter.TRACE_ID_HEADER, traceId)
        .body(body);
  }

  private String resolveTraceId(HttpServletRequest request) {
    if (request == null) return "";
    Object trace = request.getAttribute(RequestTraceFilter.TRACE_ID_ATTR);
    if (trace == null) {
      String headerTrace = request.getHeader(RequestTraceFilter.TRACE_ID_HEADER);
      return headerTrace == null ? "" : headerTrace;
    }
    return trace.toString();
  }

  private String resolvePath(HttpServletRequest request) {
    return request == null ? "" : request.getRequestURI();
  }
}
