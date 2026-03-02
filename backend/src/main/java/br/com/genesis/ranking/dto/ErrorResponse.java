package br.com.genesis.ranking.dto;

public class ErrorResponse {
  private String message;
  private String code;
  private Integer status;
  private String traceId;
  private String path;
  private String timestamp;

  public ErrorResponse() {}

  public ErrorResponse(String message) {
    this.message = message;
  }

  public ErrorResponse(
      String message,
      String code,
      Integer status,
      String traceId,
      String path,
      String timestamp
  ) {
    this.message = message;
    this.code = code;
    this.status = status;
    this.traceId = traceId;
    this.path = path;
    this.timestamp = timestamp;
  }

  public String getMessage() {
    return message;
  }

  public void setMessage(String message) {
    this.message = message;
  }

  public String getCode() {
    return code;
  }

  public void setCode(String code) {
    this.code = code;
  }

  public Integer getStatus() {
    return status;
  }

  public void setStatus(Integer status) {
    this.status = status;
  }

  public String getTraceId() {
    return traceId;
  }

  public void setTraceId(String traceId) {
    this.traceId = traceId;
  }

  public String getPath() {
    return path;
  }

  public void setPath(String path) {
    this.path = path;
  }

  public String getTimestamp() {
    return timestamp;
  }

  public void setTimestamp(String timestamp) {
    this.timestamp = timestamp;
  }
}
