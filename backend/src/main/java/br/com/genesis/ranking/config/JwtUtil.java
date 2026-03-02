package br.com.genesis.ranking.config;

import java.nio.charset.StandardCharsets;
import java.util.Date;

import javax.crypto.SecretKey;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import br.com.genesis.ranking.model.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jws;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;

@Component
public class JwtUtil {
  private final SecretKey key;
  private final long expirationMillis;

  public JwtUtil(
      @Value("${app.jwt.secret}") String secret,
      @Value("${app.jwt.expiration-minutes}") long expirationMinutes
  ) {
    if (secret == null || secret.length() < 32) {
      throw new IllegalStateException("JWT secret must be at least 32 characters.");
    }
    this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    this.expirationMillis = Math.max(1, expirationMinutes) * 60_000L;
  }

  public String generateToken(User user) {
    Date now = new Date();
    Date expiry = new Date(now.getTime() + expirationMillis);

    return Jwts.builder()
        .setSubject(user.getUsername())
        .claim("role", user.getRole().name())
        .setIssuedAt(now)
        .setExpiration(expiry)
        .signWith(key, SignatureAlgorithm.HS256)
        .compact();
  }

  public Jws<Claims> parseToken(String token) {
    return Jwts.parserBuilder()
        .setSigningKey(key)
        .build()
        .parseClaimsJws(token);
  }

  public String getUsername(String token) {
    return parseToken(token).getBody().getSubject();
  }

  public String getRole(String token) {
    Object role = parseToken(token).getBody().get("role");
    return role == null ? null : role.toString();
  }
}
