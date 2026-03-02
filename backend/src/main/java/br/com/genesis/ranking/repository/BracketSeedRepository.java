package br.com.genesis.ranking.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import br.com.genesis.ranking.model.BracketSeed;

public interface BracketSeedRepository extends JpaRepository<BracketSeed, String> {
}
