package br.com.genesis.ranking.service;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.CookieManager;
import java.net.CookiePolicy;
import java.net.HttpCookie;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import br.com.genesis.ranking.dto.SocialMediaPostResponse;
import br.com.genesis.ranking.model.SocialFeedCache;
import br.com.genesis.ranking.repository.SocialFeedCacheRepository;

@Service
public class InstagramFeedService {
  private static final Logger logger = LoggerFactory.getLogger(InstagramFeedService.class);
  private static final int MIN_LIMIT = 1;
  private static final int MAX_LIMIT = 20;
  private static final Duration CACHE_TTL = Duration.ofMinutes(5);
  private static final String PROVIDER_INSTAGRAM = "instagram";
  private static final String DEFAULT_IG_USERNAME = "genesis_esportes";
  private static final String DEFAULT_IG_WEB_BASE_URL = "https://www.instagram.com";
  private static final String IG_PUBLIC_APP_ID = "936619743392459";
  public static final String FEED_STATUS_CACHE = "CACHE";
  public static final String FEED_STATUS_UPDATED_NOW = "UPDATED_NOW";

  public static final class FeedResult {
    private final List<SocialMediaPostResponse> posts;
    private final String status;
    private final String lastUpdatedAt;

    public FeedResult(List<SocialMediaPostResponse> posts, String status, String lastUpdatedAt) {
      this.posts = posts == null ? List.of() : List.copyOf(posts);
      this.status = (status == null || status.isBlank()) ? FEED_STATUS_CACHE : status;
      this.lastUpdatedAt = lastUpdatedAt == null ? "" : lastUpdatedAt;
    }

    public List<SocialMediaPostResponse> getPosts() {
      return posts;
    }

    public String getStatus() {
      return status;
    }

    public String getLastUpdatedAt() {
      return lastUpdatedAt;
    }
  }

  private final ObjectMapper objectMapper;
  private final SocialFeedCacheRepository socialFeedCacheRepository;
  private final HttpClient httpClient;
  private final CookieManager cookieManager;
  private final String apiBaseUrl;
  private final String webBaseUrl;
  private final String accessToken;
  private final String userId;
  private final String username;
  private final int defaultLimit;

  private volatile Instant cacheUpdatedAt = Instant.EPOCH;
  private volatile List<SocialMediaPostResponse> cachedPosts = List.of();

  public InstagramFeedService(
      ObjectMapper objectMapper,
      SocialFeedCacheRepository socialFeedCacheRepository,
      @Value("${app.social.instagram.base-url:https://graph.instagram.com}") String apiBaseUrl,
      @Value("${app.social.instagram.web-base-url:https://www.instagram.com}") String webBaseUrl,
      @Value("${app.social.instagram.access-token:}") String accessToken,
      @Value("${app.social.instagram.user-id:}") String userId,
      @Value("${app.social.instagram.username:genesis_esportes}") String username,
      @Value("${app.social.instagram.default-limit:10}") Integer defaultLimit
  ) {
    this.objectMapper = objectMapper;
    this.socialFeedCacheRepository = socialFeedCacheRepository;
    this.cookieManager = new CookieManager(null, CookiePolicy.ACCEPT_ALL);
    this.httpClient = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(8))
        .cookieHandler(cookieManager)
        .build();
    this.apiBaseUrl = normalizeBaseUrl(apiBaseUrl, "https://graph.instagram.com");
    this.webBaseUrl = normalizeBaseUrl(webBaseUrl, DEFAULT_IG_WEB_BASE_URL);
    this.accessToken = clean(accessToken);
    this.userId = clean(userId);
    this.username = clean(username).isBlank() ? DEFAULT_IG_USERNAME : clean(username);
    int resolvedDefault = defaultLimit == null ? 10 : defaultLimit;
    this.defaultLimit = Math.max(MIN_LIMIT, Math.min(MAX_LIMIT, resolvedDefault));
  }

  public FeedResult listLatestPosts(Integer requestedLimit, boolean forceRefresh) {
    int limit = clamp(requestedLimit == null ? defaultLimit : requestedLimit);
    hydrateInMemoryCacheIfNeeded();
    FeedResult data = loadFromCacheOrApi(Math.max(defaultLimit, limit), forceRefresh);
    List<SocialMediaPostResponse> posts = data.getPosts();
    if (posts.isEmpty()) return new FeedResult(List.of(), data.getStatus(), data.getLastUpdatedAt());
    if (posts.size() <= limit) return new FeedResult(posts, data.getStatus(), data.getLastUpdatedAt());
    return new FeedResult(posts.subList(0, limit), data.getStatus(), data.getLastUpdatedAt());
  }

  @Transactional(readOnly = true)
  public FeedResult listPersistedCache(Integer requestedLimit) {
    int limit = clamp(requestedLimit == null ? defaultLimit : requestedLimit);
    List<SocialMediaPostResponse> posts = loadPostsFromPersistence();
    if (posts.isEmpty()) {
      return new FeedResult(List.of(), FEED_STATUS_CACHE, getLastUpdatedAt());
    }
    if (posts.size() <= limit) {
      return new FeedResult(posts, FEED_STATUS_CACHE, getLastUpdatedAt());
    }
    return new FeedResult(posts.subList(0, limit), FEED_STATUS_CACHE, getLastUpdatedAt());
  }

  @Transactional
  public FeedResult syncAndPersist(Integer requestedLimit) {
    return listLatestPosts(requestedLimit, true);
  }

  @Transactional
  public void clearPersistentCache() {
    socialFeedCacheRepository.findByProvider(PROVIDER_INSTAGRAM).ifPresent(socialFeedCacheRepository::delete);
    cachedPosts = List.of();
    cacheUpdatedAt = Instant.EPOCH;
  }

  public String getLastUpdatedAt() {
    Instant current = cacheUpdatedAt;
    if (current == null || Instant.EPOCH.equals(current)) return "";
    return current.toString();
  }

  private FeedResult loadFromCacheOrApi(int fetchLimit, boolean forceRefresh) {
    Instant now = Instant.now();
    if (!forceRefresh && !cachedPosts.isEmpty() && Duration.between(cacheUpdatedAt, now).compareTo(CACHE_TTL) < 0) {
      return new FeedResult(cachedPosts, FEED_STATUS_CACHE, getLastUpdatedAt());
    }

    try {
      List<SocialMediaPostResponse> fetched = fetchPosts(fetchLimit);
      if (fetched.isEmpty()) {
        if (!cachedPosts.isEmpty()) {
          return new FeedResult(cachedPosts, FEED_STATUS_CACHE, getLastUpdatedAt());
        }

        List<SocialMediaPostResponse> persisted = loadPostsFromPersistence();
        if (!persisted.isEmpty()) {
          cachedPosts = persisted;
          return new FeedResult(persisted, FEED_STATUS_CACHE, getLastUpdatedAt());
        }
        return new FeedResult(List.of(), FEED_STATUS_CACHE, getLastUpdatedAt());
      }

      cachedPosts = fetched;
      cacheUpdatedAt = now;
      persistCache(fetched, FEED_STATUS_UPDATED_NOW, now);
      return new FeedResult(fetched, FEED_STATUS_UPDATED_NOW, getLastUpdatedAt());
    } catch (Exception ex) {
      logger.warn("Failed to fetch Instagram feed: {}", ex.getMessage());
      if (!cachedPosts.isEmpty()) {
        return new FeedResult(cachedPosts, FEED_STATUS_CACHE, getLastUpdatedAt());
      }
      List<SocialMediaPostResponse> persisted = loadPostsFromPersistence();
      if (!persisted.isEmpty()) {
        cachedPosts = persisted;
        return new FeedResult(persisted, FEED_STATUS_CACHE, getLastUpdatedAt());
      }
      return new FeedResult(List.of(), FEED_STATUS_CACHE, getLastUpdatedAt());
    }
  }

  private List<SocialMediaPostResponse> fetchPosts(int limit) throws IOException, InterruptedException {
    if (!accessToken.isBlank()) {
      List<SocialMediaPostResponse> graphPosts = fetchPostsFromGraph(limit);
      if (!graphPosts.isEmpty()) return graphPosts;
      logger.info("Instagram Graph API returned empty feed. Trying public fallback.");
    } else {
      logger.info("Instagram token not configured. Trying public fallback for username={}", username);
    }

    List<SocialMediaPostResponse> webPosts = fetchPostsFromPublicWeb(limit);
    if (!webPosts.isEmpty()) return webPosts;

    List<SocialMediaPostResponse> htmlPosts = fetchPostsFromProfileHtml(limit);
    if (!htmlPosts.isEmpty()) return htmlPosts;

    return List.of();
  }

  private List<SocialMediaPostResponse> fetchPostsFromGraph(int limit) throws IOException, InterruptedException {
    String endpoint = userId.isBlank() ? "/me/media" : "/" + encode(userId) + "/media";
    String fields = "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,username";
    String url = apiBaseUrl + endpoint
        + "?fields=" + encode(fields)
        + "&limit=" + limit
        + "&access_token=" + encode(accessToken);

    HttpRequest request = HttpRequest.newBuilder(URI.create(url))
        .GET()
        .timeout(Duration.ofSeconds(12))
        .header("Accept", "application/json")
        .build();

    HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
    if (response.statusCode() < 200 || response.statusCode() >= 300) {
      throw new IllegalStateException("Instagram API HTTP " + response.statusCode());
    }

    JsonNode root = objectMapper.readTree(response.body());
    JsonNode dataNode = root.path("data");
    if (!dataNode.isArray()) return List.of();

    List<SocialMediaPostResponse> posts = new ArrayList<>();
    for (JsonNode node : dataNode) {
      String id = text(node, "id");
      String permalink = text(node, "permalink");
      if (id.isBlank() || permalink.isBlank()) continue;

      SocialMediaPostResponse post = new SocialMediaPostResponse();
      post.setId(id);
      post.setCaption(text(node, "caption"));
      post.setMediaType(text(node, "media_type"));
      post.setMediaUrl(text(node, "media_url"));
      post.setThumbnailUrl(text(node, "thumbnail_url"));
      post.setPermalink(permalink);
      post.setPublishedAt(text(node, "timestamp"));
      post.setUsername(text(node, "username"));
      post.setSource("instagram");
      posts.add(post);
    }

    posts.sort(Comparator.comparing(SocialMediaPostResponse::getPublishedAt, Comparator.nullsLast(String::compareTo)).reversed());
    return posts;
  }

  private List<SocialMediaPostResponse> fetchPostsFromPublicWeb(int limit) throws IOException, InterruptedException {
    HttpRequest warmup = HttpRequest.newBuilder(URI.create(webBaseUrl + "/" + encodePathSegment(username) + "/"))
        .GET()
        .timeout(Duration.ofSeconds(12))
        .header("Accept", "text/html")
        .header("User-Agent", browserUserAgent())
        .build();
    HttpResponse<String> warmupResponse = httpClient.send(warmup, HttpResponse.BodyHandlers.ofString());
    if (warmupResponse.statusCode() < 200 || warmupResponse.statusCode() >= 400) {
      throw new IllegalStateException("Instagram profile warmup HTTP " + warmupResponse.statusCode());
    }

    String csrfToken = resolveCookie("csrftoken");
    HttpRequest request = HttpRequest.newBuilder(URI.create(webBaseUrl + "/api/v1/users/web_profile_info/?username=" + encode(username)))
        .GET()
        .timeout(Duration.ofSeconds(12))
        .header("Accept", "application/json")
        .header("Referer", webBaseUrl + "/" + encodePathSegment(username) + "/")
        .header("User-Agent", browserUserAgent())
        .header("X-IG-App-ID", IG_PUBLIC_APP_ID)
        .header("X-Requested-With", "XMLHttpRequest")
        .header("X-CSRFToken", csrfToken)
        .build();

    HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
    if (response.statusCode() < 200 || response.statusCode() >= 300) {
      throw new IllegalStateException("Instagram public web API HTTP " + response.statusCode());
    }

    JsonNode root = objectMapper.readTree(response.body());
    JsonNode userNode = root.path("data").path("user");
    if (userNode.isMissingNode() || userNode.isNull() || userNode.isObject() == false) {
      userNode = root.path("user");
    }
    JsonNode edgeNode = userNode.path("edge_owner_to_timeline_media").path("edges");
    if (!edgeNode.isArray()) return List.of();

    List<SocialMediaPostResponse> posts = new ArrayList<>();
    for (JsonNode edge : edgeNode) {
      if (posts.size() >= limit) break;
      JsonNode node = edge.path("node");
      String shortcode = text(node, "shortcode");
      if (shortcode.isBlank()) continue;
      String id = text(node, "id");
      String permalink = webBaseUrl + "/p/" + shortcode + "/";
      String caption = extractCaption(node);
      boolean isVideo = node.path("is_video").asBoolean(false);
      String mediaUrl = text(node, "display_url");
      String thumbnailUrl = text(node, "thumbnail_src");
      String publishedAt = extractTimestamp(node.path("taken_at_timestamp"));

      SocialMediaPostResponse post = new SocialMediaPostResponse();
      post.setId(id.isBlank() ? shortcode : id);
      post.setCaption(caption);
      post.setMediaType(isVideo ? "VIDEO" : "IMAGE");
      post.setMediaUrl(mediaUrl);
      post.setThumbnailUrl(thumbnailUrl);
      post.setPermalink(permalink);
      post.setPublishedAt(publishedAt);
      post.setUsername(username);
      post.setSource("instagram_public");
      posts.add(post);
    }

    posts.sort(Comparator.comparing(SocialMediaPostResponse::getPublishedAt, Comparator.nullsLast(String::compareTo)).reversed());
    return posts;
  }

  private List<SocialMediaPostResponse> fetchPostsFromProfileHtml(int limit) throws IOException, InterruptedException {
    HttpRequest request = HttpRequest.newBuilder(URI.create(webBaseUrl + "/" + encodePathSegment(username) + "/"))
        .GET()
        .timeout(Duration.ofSeconds(12))
        .header("Accept", "text/html")
        .header("User-Agent", browserUserAgent())
        .build();
    HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
    if (response.statusCode() < 200 || response.statusCode() >= 300) {
      throw new IllegalStateException("Instagram profile HTML HTTP " + response.statusCode());
    }
    return parsePostsFromHtml(response.body(), limit);
  }

  private List<SocialMediaPostResponse> parsePostsFromHtml(String html, int limit) {
    String safeHtml = html == null ? "" : html;
    Set<String> shortcodes = new LinkedHashSet<>();
    Matcher matcher = Pattern.compile("https?:\\\\/\\\\/www\\\\.instagram\\\\.com\\\\/p\\\\/([A-Za-z0-9_-]{5,})\\\\/?").matcher(safeHtml);
    while (matcher.find() && shortcodes.size() < limit) {
      shortcodes.add(clean(matcher.group(1)));
    }

    matcher = Pattern.compile("\\/p\\/([A-Za-z0-9_-]{5,})\\/?").matcher(safeHtml);
    while (matcher.find() && shortcodes.size() < limit) {
      shortcodes.add(clean(matcher.group(1)));
    }

    if (shortcodes.isEmpty()) {
      matcher = Pattern.compile("post_shortcode_to_uri_mapping\\\":\\{([^}]*)\\}").matcher(safeHtml);
      if (matcher.find()) {
        String mappingBlock = matcher.group(1);
        Matcher codeMatcher = Pattern.compile("([A-Za-z0-9_-]{5,})\\\":\\\"\\\\/p\\\\/").matcher(mappingBlock);
        while (codeMatcher.find() && shortcodes.size() < limit) {
          shortcodes.add(clean(codeMatcher.group(1)));
        }
      }
    }

    if (shortcodes.isEmpty()) return List.of();

    List<SocialMediaPostResponse> posts = new ArrayList<>();
    for (String code : shortcodes) {
      if (code.isBlank()) continue;
      SocialMediaPostResponse post = new SocialMediaPostResponse();
      post.setId(code);
      post.setCaption("Post publicado no Instagram @" + username);
      post.setMediaType("IMAGE");
      post.setMediaUrl("");
      post.setThumbnailUrl("");
      post.setPermalink(webBaseUrl + "/p/" + code + "/");
      post.setPublishedAt("");
      post.setUsername(username);
      post.setSource("instagram_html");
      posts.add(post);
    }
    return posts;
  }

  private synchronized void hydrateInMemoryCacheIfNeeded() {
    if (!cachedPosts.isEmpty()) return;
    List<SocialMediaPostResponse> persisted = loadPostsFromPersistence();
    if (persisted.isEmpty()) return;
    cachedPosts = persisted;
  }

  private List<SocialMediaPostResponse> loadPostsFromPersistence() {
    Optional<SocialFeedCache> cached = socialFeedCacheRepository.findByProvider(PROVIDER_INSTAGRAM);
    if (cached.isEmpty()) return List.of();
    SocialFeedCache entry = cached.get();
    String payload = clean(entry.getPayload());
    if (payload.isBlank()) return List.of();

    try {
      List<SocialMediaPostResponse> parsed = objectMapper.readValue(payload, new TypeReference<List<SocialMediaPostResponse>>() {});
      List<SocialMediaPostResponse> normalized = parsed == null ? List.of() : parsed.stream()
          .filter(item -> item != null)
          .toList();
      Instant persistedAt = entry.getLastFetchedAt() == null ? Instant.EPOCH : entry.getLastFetchedAt();
      if (persistedAt.isAfter(cacheUpdatedAt)) {
        cacheUpdatedAt = persistedAt;
      }
      return normalized;
    } catch (Exception ex) {
      logger.warn("Failed to read persisted Instagram cache: {}", ex.getMessage());
      return List.of();
    }
  }

  private void persistCache(List<SocialMediaPostResponse> posts, String status, Instant fetchedAt) {
    try {
      SocialFeedCache entry = socialFeedCacheRepository.findByProvider(PROVIDER_INSTAGRAM)
          .orElseGet(SocialFeedCache::new);
      entry.setProvider(PROVIDER_INSTAGRAM);
      entry.setPayload(objectMapper.writeValueAsString(posts == null ? List.of() : posts));
      entry.setStatus(clean(status));
      entry.setItemCount(posts == null ? 0 : posts.size());
      entry.setLastFetchedAt(fetchedAt == null ? Instant.now() : fetchedAt);
      socialFeedCacheRepository.save(entry);
    } catch (Exception ex) {
      logger.warn("Failed to persist Instagram cache: {}", ex.getMessage());
    }
  }

  private int clamp(Integer value) {
    if (value == null) return defaultLimit;
    return Math.max(MIN_LIMIT, Math.min(MAX_LIMIT, value));
  }

  private String text(JsonNode node, String field) {
    JsonNode value = node.path(field);
    if (value.isMissingNode() || value.isNull()) return "";
    return clean(value.asText());
  }

  private String clean(String value) {
    return value == null ? "" : value.trim();
  }

  private String encode(String value) {
    return URLEncoder.encode(clean(value), StandardCharsets.UTF_8);
  }

  private String normalizeBaseUrl(String value, String fallback) {
    String normalized = clean(value);
    if (normalized.isBlank()) return fallback;
    if (normalized.endsWith("/")) return normalized.substring(0, normalized.length() - 1);
    return normalized;
  }

  private String resolveCookie(String name) {
    if (name == null || name.isBlank()) return "";
    List<HttpCookie> cookies = cookieManager.getCookieStore().getCookies();
    for (HttpCookie cookie : cookies) {
      if (cookie == null) continue;
      if (name.equalsIgnoreCase(clean(cookie.getName()))) {
        return clean(cookie.getValue());
      }
    }
    return "";
  }

  private String browserUserAgent() {
    return "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        + "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";
  }

  private String extractCaption(JsonNode node) {
    JsonNode edges = node.path("edge_media_to_caption").path("edges");
    if (!edges.isArray() || edges.isEmpty()) return "";
    return text(edges.get(0).path("node"), "text");
  }

  private String extractTimestamp(JsonNode timestampNode) {
    if (timestampNode == null || timestampNode.isMissingNode() || timestampNode.isNull()) return "";
    long epochSeconds = timestampNode.asLong(0L);
    if (epochSeconds <= 0L) return "";
    return Instant.ofEpochSecond(epochSeconds).toString();
  }

  private String encodePathSegment(String value) {
    return encode(value).replace("+", "%20");
  }
}
