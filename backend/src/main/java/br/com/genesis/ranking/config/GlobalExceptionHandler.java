package br.com.genesis.ranking.config;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

@ControllerAdvice
public class GlobalExceptionHandler {
  @ExceptionHandler(Exception.class)
  public ResponseEntity<String> handleAll(Exception ex) {
    ex.printStackTrace();
    return ResponseEntity.badRequest().body("Detailed Backend Error: " + ex.getMessage() + " / Cause: " + (ex.getCause() != null ? ex.getCause().getMessage() : "null"));
  }
}
