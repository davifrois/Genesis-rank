package br.com.genesis.ranking.dto;

import java.util.ArrayList;
import java.util.List;

public class PublicBracketsResponse {
  private String eventId;
  private String eventName;
  private boolean isPublished;
  private String message;
  private String updatedAt;
  private List<BracketResponse> brackets = new ArrayList<>();

  public String getEventId() {
    return eventId;
  }

  public void setEventId(String eventId) {
    this.eventId = eventId;
  }

  public String getEventName() {
    return eventName;
  }

  public void setEventName(String eventName) {
    this.eventName = eventName;
  }

  public boolean getIsPublished() {
    return isPublished;
  }

  public void setIsPublished(boolean isPublished) {
    this.isPublished = isPublished;
  }

  public String getMessage() {
    return message;
  }

  public void setMessage(String message) {
    this.message = message;
  }

  public String getUpdatedAt() {
    return updatedAt;
  }

  public void setUpdatedAt(String updatedAt) {
    this.updatedAt = updatedAt;
  }

  public List<BracketResponse> getBrackets() {
    return brackets;
  }

  public void setBrackets(List<BracketResponse> brackets) {
    this.brackets = brackets == null ? new ArrayList<>() : brackets;
  }
}
