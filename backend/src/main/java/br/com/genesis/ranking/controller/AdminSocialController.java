package br.com.genesis.ranking.controller;

import java.util.List;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import br.com.genesis.ranking.dto.SocialMediaPostResponse;
import br.com.genesis.ranking.service.InstagramFeedService;
import jakarta.servlet.http.HttpServletResponse;

@RestController
@RequestMapping("/api/admin/social")
@Validated
@PreAuthorize("hasRole('ADMIN')")
public class AdminSocialController {
  private final InstagramFeedService instagramFeedService;

  public AdminSocialController(InstagramFeedService instagramFeedService) {
    this.instagramFeedService = instagramFeedService;
  }

  @GetMapping("/instagram/cache")
  public List<SocialMediaPostResponse> getInstagramPersistentCache(
      @RequestParam(required = false) Integer limit,
      HttpServletResponse response
  ) {
    InstagramFeedService.FeedResult feed = instagramFeedService.listPersistedCache(limit);
    writeFeedHeaders(response, feed);
    return feed.getPosts();
  }

  @PostMapping("/instagram/sync")
  public List<SocialMediaPostResponse> syncInstagramFeed(
      @RequestParam(required = false) Integer limit,
      HttpServletResponse response
  ) {
    InstagramFeedService.FeedResult feed = instagramFeedService.syncAndPersist(limit);
    writeFeedHeaders(response, feed);
    return feed.getPosts();
  }

  @DeleteMapping("/instagram/cache")
  public void clearInstagramPersistentCache() {
    instagramFeedService.clearPersistentCache();
  }

  private void writeFeedHeaders(HttpServletResponse response, InstagramFeedService.FeedResult feed) {
    if (response == null || feed == null) return;
    if (!feed.getLastUpdatedAt().isBlank()) {
      response.setHeader("X-Instagram-Feed-Updated-At", feed.getLastUpdatedAt());
    }
    response.setHeader("X-Instagram-Feed-Status", feed.getStatus());
  }
}
