package br.com.genesis.ranking.config;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
public class CorsConfig {
  @Value("${app.cors.allowed-origins}")
  private String allowedOrigins;

  @Value("${app.cors.allowed-origin-patterns:}")
  private String allowedOriginPatterns;

  private List<String> parseCsv(String value) {
    return Arrays.stream((value == null ? "" : value).split(","))
        .map(String::trim)
        .filter(item -> !item.isBlank())
        .collect(Collectors.toList());
  }

  @Bean
  public CorsConfigurationSource corsConfigurationSource() {
    CorsConfiguration config = new CorsConfiguration();
    List<String> origins = parseCsv(allowedOrigins);
    List<String> originPatterns = parseCsv(allowedOriginPatterns);

    if (!origins.isEmpty()) {
      config.setAllowedOrigins(origins);
    }
    if (!originPatterns.isEmpty()) {
      config.setAllowedOriginPatterns(originPatterns);
    }
    config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
    config.setAllowedHeaders(List.of("Authorization", "Content-Type", "X-Trace-Id"));
    config.setExposedHeaders(List.of("X-Trace-Id", "X-Instagram-Feed-Updated-At", "X-Instagram-Feed-Status"));
    config.setAllowCredentials(true);

    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", config);
    return source;
  }
}
