package br.com.genesis.ranking.config;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

import br.com.genesis.ranking.realtime.BracketLiveSocketHandler;

@Configuration
@EnableWebSocket
public class WebSocketLiveConfig implements WebSocketConfigurer {
  private final BracketLiveSocketHandler bracketLiveSocketHandler;

  @Value("${app.cors.allowed-origins:}")
  private String allowedOrigins;

  @Value("${app.cors.allowed-origin-patterns:}")
  private String allowedOriginPatterns;

  public WebSocketLiveConfig(BracketLiveSocketHandler bracketLiveSocketHandler) {
    this.bracketLiveSocketHandler = bracketLiveSocketHandler;
  }

  @Override
  public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
    var registration = registry.addHandler(
        bracketLiveSocketHandler,
        "/ws/brackets/*",
        "/ws/brackets/event/*"
    );
    List<String> origins = parseCsv(allowedOrigins);
    List<String> originPatterns = parseCsv(allowedOriginPatterns);
    if (!origins.isEmpty()) {
      registration.setAllowedOrigins(origins.toArray(String[]::new));
    } else {
      registration.setAllowedOrigins("*");
    }
    if (!originPatterns.isEmpty()) {
      registration.setAllowedOriginPatterns(originPatterns.toArray(String[]::new));
    }
  }

  private List<String> parseCsv(String value) {
    return Arrays.stream((value == null ? "" : value).split(","))
        .map(String::trim)
        .filter(item -> !item.isBlank())
        .collect(Collectors.toList());
  }
}
