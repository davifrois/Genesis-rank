package br.com.genesis.ranking.realtime;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

import org.springframework.stereotype.Service;

import br.com.genesis.ranking.dto.BracketResponse;

@Service
public class BracketLivePublisher {
  private final BracketLiveSocketHandler socketHandler;

  public BracketLivePublisher(BracketLiveSocketHandler socketHandler) {
    this.socketHandler = socketHandler;
  }

  public void publishUpdated(BracketResponse response) {
    if (response == null || response.getId() == null || response.getId().isBlank()) return;
    Map<String, Object> payload = basePayload("BRACKET_UPDATED", response.getId(), response.getEventId());
    payload.put("bracket", response);
    socketHandler.publish(response.getId(), payload);
    if (response.getEventId() != null && !response.getEventId().isBlank()) {
      socketHandler.publishEvent(response.getEventId(), payload);
    }
  }

  public void publishDeleted(String bracketId, String eventId) {
    if (bracketId == null || bracketId.isBlank()) return;
    Map<String, Object> payload = basePayload("BRACKET_DELETED", bracketId, eventId);
    socketHandler.publish(bracketId, payload);
    if (eventId != null && !eventId.isBlank()) {
      socketHandler.publishEvent(eventId, payload);
    }
  }

  public void publishSnapshot(BracketResponse response) {
    if (response == null || response.getId() == null || response.getId().isBlank()) return;
    Map<String, Object> payload = basePayload("BRACKET_SNAPSHOT", response.getId(), response.getEventId());
    payload.put("bracket", response);
    socketHandler.publish(response.getId(), payload);
    if (response.getEventId() != null && !response.getEventId().isBlank()) {
      socketHandler.publishEvent(response.getEventId(), payload);
    }
  }

  public void publishEventVisibilityChanged(String eventId, boolean isPublished, int bracketCount) {
    if (eventId == null || eventId.isBlank()) return;
    Map<String, Object> payload = basePayload(
        isPublished ? "EVENT_BRACKETS_PUBLISHED" : "EVENT_BRACKETS_UNPUBLISHED",
        "",
        eventId
    );
    payload.put("isPublished", isPublished);
    payload.put("bracketCount", bracketCount);
    socketHandler.publishEvent(eventId, payload);
  }

  private Map<String, Object> basePayload(String type, String bracketId, String eventId) {
    Map<String, Object> payload = new HashMap<>();
    payload.put("type", type);
    payload.put("bracketId", bracketId);
    payload.put("eventId", eventId);
    payload.put("timestamp", Instant.now().toString());
    return payload;
  }
}
