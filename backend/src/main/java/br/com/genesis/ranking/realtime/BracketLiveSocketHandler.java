package br.com.genesis.ranking.realtime;

import java.io.IOException;
import java.net.URI;
import java.util.Arrays;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

@Component
public class BracketLiveSocketHandler extends TextWebSocketHandler {
  private final ObjectMapper objectMapper;
  private final Map<String, Set<WebSocketSession>> sessionsByBracket = new ConcurrentHashMap<>();
  private final Map<String, Set<WebSocketSession>> sessionsByEvent = new ConcurrentHashMap<>();

  public BracketLiveSocketHandler(ObjectMapper objectMapper) {
    this.objectMapper = objectMapper;
  }

  @Override
  public void afterConnectionEstablished(WebSocketSession session) {
    LiveRoute route = resolveRoute(session.getUri());
    if (route == null || route.id().isBlank()) return;

    if ("event".equals(route.scope())) {
      sessionsByEvent.computeIfAbsent(route.id(), key -> ConcurrentHashMap.newKeySet()).add(session);
      return;
    }
    sessionsByBracket.computeIfAbsent(route.id(), key -> ConcurrentHashMap.newKeySet()).add(session);
  }

  @Override
  public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
    removeSession(session);
  }

  @Override
  public void handleTransportError(WebSocketSession session, Throwable exception) throws Exception {
    removeSession(session);
    if (session.isOpen()) {
      session.close(CloseStatus.SERVER_ERROR);
    }
  }

  public void publish(String bracketId, Object payload) {
    if (bracketId == null || bracketId.isBlank() || payload == null) return;
    Set<WebSocketSession> sessions = sessionsByBracket.get(bracketId);
    publishToSessions(sessions, payload);
  }

  public void publishEvent(String eventId, Object payload) {
    if (eventId == null || eventId.isBlank() || payload == null) return;
    Set<WebSocketSession> sessions = sessionsByEvent.get(eventId);
    publishToSessions(sessions, payload);
  }

  private void publishToSessions(Set<WebSocketSession> sessions, Object payload) {
    if (sessions == null || sessions.isEmpty()) return;

    String json;
    try {
      json = objectMapper.writeValueAsString(payload);
    } catch (JsonProcessingException ex) {
      return;
    }

    TextMessage message = new TextMessage(json);
    sessions.removeIf(session -> !session.isOpen());
    sessions.forEach(session -> {
      try {
        session.sendMessage(message);
      } catch (IOException ex) {
        try {
          session.close(CloseStatus.SERVER_ERROR);
        } catch (IOException ignored) {
          // Ignore close error.
        }
      }
    });
  }

  private void removeSession(WebSocketSession session) {
    sessionsByBracket.values().forEach(sessions -> sessions.remove(session));
    sessionsByBracket.entrySet().removeIf(entry -> entry.getValue() == null || entry.getValue().isEmpty());
    sessionsByEvent.values().forEach(sessions -> sessions.remove(session));
    sessionsByEvent.entrySet().removeIf(entry -> entry.getValue() == null || entry.getValue().isEmpty());
  }

  private LiveRoute resolveRoute(URI uri) {
    if (uri == null) return null;
    String path = uri.getPath();
    if (path == null || path.isBlank()) return null;
    String[] segments = Arrays.stream(path.split("/"))
        .map(String::trim)
        .filter(segment -> !segment.isBlank())
        .toArray(String[]::new);
    if (segments.length < 3) return null;
    String candidate = segments[segments.length - 1];
    if (candidate == null || candidate.isBlank()) return null;
    if ("event".equalsIgnoreCase(segments[segments.length - 2])) {
      return new LiveRoute("event", candidate.trim());
    }
    return new LiveRoute("bracket", candidate.trim());
  }

  private record LiveRoute(String scope, String id) {}
}
