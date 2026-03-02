package br.com.genesis.ranking.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import br.com.genesis.ranking.model.BracketPodium;

public interface BracketPodiumRepository extends JpaRepository<BracketPodium, String> {
}
