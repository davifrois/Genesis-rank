package br.com.genesis.ranking.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import br.com.genesis.ranking.model.AthleteHistory;

public interface AthleteHistoryRepository extends JpaRepository<AthleteHistory, String> {
}
