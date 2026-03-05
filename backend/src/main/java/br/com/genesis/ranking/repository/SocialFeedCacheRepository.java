package br.com.genesis.ranking.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import br.com.genesis.ranking.model.SocialFeedCache;

public interface SocialFeedCacheRepository extends JpaRepository<SocialFeedCache, String> {
  Optional<SocialFeedCache> findByProvider(String provider);
}
