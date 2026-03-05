package br.com.genesis.ranking.service;

import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.HttpURLConnection;
import java.util.Locale;
import java.util.Set;

import org.springframework.stereotype.Service;

@Service
public class SocialMediaProxyService {
  private static final Set<String> ALLOWED_HOST_SUFFIXES = Set.of(
      ".cdninstagram.com",
      ".fbcdn.net",
      ".instagram.com"
  );

  public record ProxyMediaResult(String contentType, byte[] body) {}

  public ProxyMediaResult fetchMedia(String rawUrl) {
    URI uri = validateUrl(rawUrl);
    HttpURLConnection connection = null;
    try {
      connection = (HttpURLConnection) uri.toURL().openConnection();
      connection.setRequestMethod("GET");
      connection.setConnectTimeout(8000);
      connection.setReadTimeout(15000);
      connection.setInstanceFollowRedirects(true);
      connection.setRequestProperty("Accept", "image/avif,image/webp,image/apng,image/*,*/*;q=0.8");
      connection.setRequestProperty("User-Agent", browserUserAgent());
      connection.setRequestProperty("Referer", "https://www.instagram.com/");

      int status = connection.getResponseCode();
      if (status < 200 || status >= 300) {
        throw new IllegalArgumentException("Mídia do Instagram indisponível no momento.");
      }

      final byte[] bytes;
      try (InputStream stream = connection.getInputStream()) {
        bytes = stream.readAllBytes();
      }
      if (bytes == null || bytes.length == 0) {
        throw new IllegalArgumentException("A mídia do Instagram retornou vazia.");
      }

      String contentType = normalizeContentType(connection.getContentType());
      return new ProxyMediaResult(contentType, bytes);
    } catch (IllegalArgumentException ex) {
      throw ex;
    } catch (ClassCastException ex) {
      throw new IllegalArgumentException("Falha ao carregar mídia do Instagram.");
    } catch (IOException ex) {
      throw new IllegalArgumentException("Falha ao carregar mídia do Instagram.");
    } catch (RuntimeException ex) {
      throw new IllegalArgumentException("Falha ao carregar mídia do Instagram.");
    } finally {
      if (connection != null) {
        connection.disconnect();
      }
    }
  }

  private URI validateUrl(String rawUrl) {
    String value = rawUrl == null ? "" : rawUrl.trim();
    if (value.isBlank()) {
      throw new IllegalArgumentException("URL da mídia não informada.");
    }

    final URI uri;
    try {
      uri = new URI(value);
    } catch (URISyntaxException ex) {
      throw new IllegalArgumentException("URL da mídia inválida.");
    }

    String scheme = safeLower(uri.getScheme());
    if (!"https".equals(scheme)) {
      throw new IllegalArgumentException("A URL da mídia deve usar HTTPS.");
    }

    String host = safeLower(uri.getHost());
    if (host.isBlank() || !isAllowedHost(host)) {
      throw new IllegalArgumentException("Host da mídia não permitido.");
    }

    return uri;
  }

  private boolean isAllowedHost(String host) {
    if (host.equals("cdninstagram.com") || host.equals("fbcdn.net") || host.equals("instagram.com")) {
      return true;
    }
    return ALLOWED_HOST_SUFFIXES.stream().anyMatch(host::endsWith);
  }

  private String normalizeContentType(String rawValue) {
    String value = rawValue == null ? "" : rawValue.trim();
    if (value.isBlank()) return "application/octet-stream";
    String base = value.split(";")[0].trim().toLowerCase(Locale.ROOT);
    if (base.startsWith("image/")) return base;
    if (base.startsWith("video/")) return base;
    return "application/octet-stream";
  }

  private String browserUserAgent() {
    return "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        + "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";
  }

  private String safeLower(String value) {
    return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
  }
}
