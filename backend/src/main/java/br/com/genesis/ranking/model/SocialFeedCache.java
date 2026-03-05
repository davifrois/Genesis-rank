package br.com.genesis.ranking.model;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

@Entity
@Table(name = "social_feed_cache")
public class SocialFeedCache extends BaseEntity {
  @Column(nullable = false, unique = true, length = 40)
  private String provider;

  @Column(nullable = false, columnDefinition = "LONGTEXT")
  private String payload;

  @Column(length = 40)
  private String status;

  private Instant lastFetchedAt;

  private Integer itemCount;

  public String getProvider() {
    return provider;
  }

  public void setProvider(String provider) {
    this.provider = provider;
  }

  public String getPayload() {
    return payload;
  }

  public void setPayload(String payload) {
    this.payload = payload;
  }

  public String getStatus() {
    return status;
  }

  public void setStatus(String status) {
    this.status = status;
  }

  public Instant getLastFetchedAt() {
    return lastFetchedAt;
  }

  public void setLastFetchedAt(Instant lastFetchedAt) {
    this.lastFetchedAt = lastFetchedAt;
  }

  public Integer getItemCount() {
    return itemCount;
  }

  public void setItemCount(Integer itemCount) {
    this.itemCount = itemCount;
  }
}
