package br.com.genesis.ranking.dto;

public class HistoryItemDto {
  private String type;
  private Integer points;
  private Integer position;
  private String source;
  private String bracketId;
  private String timestamp;

  public String getType() {
    return type;
  }

  public void setType(String type) {
    this.type = type;
  }

  public Integer getPoints() {
    return points;
  }

  public void setPoints(Integer points) {
    this.points = points;
  }

  public Integer getPosition() {
    return position;
  }

  public void setPosition(Integer position) {
    this.position = position;
  }

  public String getSource() {
    return source;
  }

  public void setSource(String source) {
    this.source = source;
  }

  public String getBracketId() {
    return bracketId;
  }

  public void setBracketId(String bracketId) {
    this.bracketId = bracketId;
  }

  public String getTimestamp() {
    return timestamp;
  }

  public void setTimestamp(String timestamp) {
    this.timestamp = timestamp;
  }
}
