package br.com.genesis.ranking.controller;

import java.util.List;
import java.util.concurrent.TimeUnit;

import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import br.com.genesis.ranking.dto.EventResponse;
import br.com.genesis.ranking.dto.PublicRegistrationRequest;
import br.com.genesis.ranking.dto.PublicRegistrationResponse;
import br.com.genesis.ranking.dto.RegistrationPaymentStatusRequest;
import br.com.genesis.ranking.dto.SocialMediaPostResponse;
import br.com.genesis.ranking.service.EventService;
import br.com.genesis.ranking.service.InstagramFeedService;
import br.com.genesis.ranking.service.PublicRegistrationService;
import br.com.genesis.ranking.service.SocialMediaProxyService;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/public")
@Validated
public class PublicController {
  private final EventService eventService;
  private final PublicRegistrationService registrationService;
  private final InstagramFeedService instagramFeedService;
  private final SocialMediaProxyService socialMediaProxyService;

  public PublicController(
      EventService eventService,
      PublicRegistrationService registrationService,
      InstagramFeedService instagramFeedService,
      SocialMediaProxyService socialMediaProxyService
  ) {
    this.eventService = eventService;
    this.registrationService = registrationService;
    this.instagramFeedService = instagramFeedService;
    this.socialMediaProxyService = socialMediaProxyService;
  }

  @GetMapping("/events")
  public List<EventResponse> listEvents() {
    return eventService.listAll();
  }

  @GetMapping("/social/instagram")
  public List<SocialMediaPostResponse> listInstagramPosts(
      @RequestParam(required = false) Integer limit,
      @RequestParam(required = false, defaultValue = "false") boolean refresh,
      HttpServletResponse response
  ) {
    InstagramFeedService.FeedResult feed = instagramFeedService.listLatestPosts(limit, refresh);
    if (!feed.getLastUpdatedAt().isBlank()) {
      response.setHeader("X-Instagram-Feed-Updated-At", feed.getLastUpdatedAt());
    }
    response.setHeader("X-Instagram-Feed-Status", feed.getStatus());
    return feed.getPosts();
  }

  @GetMapping("/social/media")
  public ResponseEntity<byte[]> proxyInstagramMedia(@RequestParam String url) {
    SocialMediaProxyService.ProxyMediaResult media = socialMediaProxyService.fetchMedia(url);
    return ResponseEntity.ok()
        .cacheControl(CacheControl.maxAge(6, TimeUnit.HOURS).cachePublic())
        .header(HttpHeaders.CONTENT_TYPE, media.contentType())
        .header("X-Content-Type-Options", "nosniff")
        .body(media.body());
  }

  @PostMapping("/registrations")
  public PublicRegistrationResponse register(@Valid @RequestBody PublicRegistrationRequest request) {
    return registrationService.register(request);
  }

  @GetMapping("/registrations")
  public List<PublicRegistrationResponse> listRegistrations(@RequestParam(required = false) String eventId) {
    return registrationService.listRegistrations(eventId);
  }

  @PatchMapping("/registrations/{registrationId}/payment")
  public PublicRegistrationResponse updatePaymentStatus(
      @PathVariable String registrationId,
      @Valid @RequestBody RegistrationPaymentStatusRequest request
  ) {
    return registrationService.updatePaymentStatus(registrationId, request);
  }
}
