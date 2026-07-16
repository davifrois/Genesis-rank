package br.com.genesis.ranking.controller;

import java.text.Normalizer;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import br.com.genesis.ranking.dto.EventResponse;
import br.com.genesis.ranking.dto.BracketResponse;
import br.com.genesis.ranking.dto.PublicBracketsResponse;
import br.com.genesis.ranking.dto.PublicRegistrationRequest;
import br.com.genesis.ranking.dto.PublicRegistrationResponse;
import br.com.genesis.ranking.dto.SocialMediaPostResponse;
import br.com.genesis.ranking.service.BracketService;
import br.com.genesis.ranking.service.EventService;
import br.com.genesis.ranking.service.InstagramFeedService;
import br.com.genesis.ranking.service.PublicRegistrationService;
import br.com.genesis.ranking.service.SocialMediaProxyService;
import br.com.genesis.ranking.service.StripeService;
import com.stripe.model.checkout.Session;
import java.util.Map;
import org.springframework.http.HttpStatus;
import br.com.genesis.ranking.dto.CheckoutRequest;
import br.com.genesis.ranking.model.EventRegistration;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/public")
@Validated
public class PublicController {
  private final EventService eventService;
  private final BracketService bracketService;
  private final PublicRegistrationService registrationService;
  private final InstagramFeedService instagramFeedService;
  private final SocialMediaProxyService socialMediaProxyService;
  private final StripeService stripeService;

  public PublicController(
      EventService eventService,
      BracketService bracketService,
      PublicRegistrationService registrationService,
      InstagramFeedService instagramFeedService,
      SocialMediaProxyService socialMediaProxyService,
      StripeService stripeService
  ) {
    this.eventService = eventService;
    this.bracketService = bracketService;
    this.registrationService = registrationService;
    this.instagramFeedService = instagramFeedService;
    this.socialMediaProxyService = socialMediaProxyService;
    this.stripeService = stripeService;
  }

  @GetMapping("/events")
  public List<EventResponse> listEvents() {
    return eventService.listAll();
  }

  @GetMapping("/brackets/live")
  public List<BracketResponse> listLiveBrackets(@RequestParam(required = false) String eventId) {
    return bracketService.listPublished(eventId);
  }

  @GetMapping("/brackets/{id}/live")
  public BracketResponse getLiveBracket(@PathVariable String id) {
    return bracketService.getOnePublished(id);
  }

  @GetMapping("/events/{eventId}/brackets")
  public PublicBracketsResponse getBracketsByEvent(
      @PathVariable String eventId,
      @RequestParam(required = false) String athlete
  ) {
    EventResponse event = eventService.getById(eventId);
    return buildPublicBracketsResponse(event, athlete);
  }

  @GetMapping("/campeonato/{nome}/brackets")
  public PublicBracketsResponse getBracketsByChampionship(
      @PathVariable String nome,
      @RequestParam(required = false) String athlete
  ) {
    EventResponse event = resolveEventByNameOrId(nome);
    if (event == null) {
      throw new IllegalArgumentException("Campeonato nao encontrado.");
    }
    return buildPublicBracketsResponse(event, athlete);
  }

  @GetMapping("/social/instagram")
  public List<SocialMediaPostResponse> listInstagramPosts(
      @RequestParam(required = false) Integer limit,
      @RequestParam(required = false, defaultValue = "false") boolean refresh,
      @RequestParam(required = false) String username,
      HttpServletResponse response
  ) {
    InstagramFeedService.FeedResult feed = instagramFeedService.listLatestPostsForUsername(limit, refresh, username);
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

  @PostMapping("/checkout")
  public ResponseEntity<?> createCheckoutSession(@RequestBody CheckoutRequest request) {
    try {
      Session session = stripeService.createCheckoutSession(request.getRegistrationIds(), request.getAthleteName(), request.getAmount());
      return ResponseEntity.ok(Map.of("url", session.getUrl()));
    } catch (Exception e) {
      e.printStackTrace();
      return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", "Error creating checkout session"));
    }
  }


  private PublicBracketsResponse buildPublicBracketsResponse(EventResponse event, String athleteSearch) {
    String eventId = event == null ? "" : event.getId();
    String eventName = event == null ? "" : event.getName();

    List<BracketResponse> allEventBrackets = bracketService.listAll(eventId);
    boolean hasGenerated = !allEventBrackets.isEmpty();
    boolean isPublished = allEventBrackets.stream().anyMatch(BracketResponse::getIsPublished);

    List<BracketResponse> published = isPublished
        ? bracketService.listPublished(eventId)
        : List.of();

    String normalizedAthlete = athleteSearch == null ? "" : athleteSearch.trim().toLowerCase(Locale.ROOT);
    if (!normalizedAthlete.isBlank()) {
      published = published.stream()
          .filter(bracket -> bracketMatchesAthlete(bracket, normalizedAthlete))
          .collect(Collectors.toList());
    }

    PublicBracketsResponse response = new PublicBracketsResponse();
    response.setEventId(eventId);
    response.setEventName(eventName);
    response.setIsPublished(isPublished);
    response.setBrackets(published);
    response.setUpdatedAt(Instant.now().toString());

    if (!hasGenerated) {
      response.setMessage("Ainda nao ha chaves geradas para este evento.");
    } else if (!isPublished) {
      response.setMessage("As chaves para este evento ainda nao foram liberadas pela organizacao.");
    } else if (published.isEmpty() && !normalizedAthlete.isBlank()) {
      response.setMessage("Nenhuma chave encontrada para o atleta pesquisado.");
    } else {
      response.setMessage("");
    }

    return response;
  }

  private boolean bracketMatchesAthlete(BracketResponse bracket, String normalizedAthlete) {
    if (bracket == null || normalizedAthlete == null || normalizedAthlete.isBlank()) return true;
    return bracket.getSeedInfos().stream().anyMatch(info -> {
      String athleteName = info == null || info.getAthleteName() == null ? "" : info.getAthleteName();
      return athleteName.toLowerCase(Locale.ROOT).contains(normalizedAthlete);
    });
  }

  private EventResponse resolveEventByNameOrId(String rawName) {
    String query = rawName == null ? "" : rawName.trim();
    if (query.isBlank()) return null;

    try {
      return eventService.getById(query);
    } catch (Exception ignored) {
      // Ignore lookup by id and fallback to name/slug.
    }

    String normalizedQuery = normalizeSlug(query);
    return eventService.listAll().stream()
        .filter(event -> event != null && event.getName() != null)
        .filter(event -> {
          String name = event.getName().trim();
          if (name.equalsIgnoreCase(query)) return true;
          return normalizeSlug(name).equals(normalizedQuery);
        })
        .findFirst()
        .orElse(null);
  }

  private String normalizeSlug(String value) {
    String ascii = Normalizer.normalize(value == null ? "" : value, Normalizer.Form.NFD)
        .replaceAll("\\p{M}", "");
    return ascii
        .toLowerCase(Locale.ROOT)
        .replaceAll("[^a-z0-9]+", "-")
        .replaceAll("^-+|-+$", "");
  }
}
