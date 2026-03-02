package br.com.genesis.ranking.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import br.com.genesis.ranking.model.RankHistory;

public interface RankHistoryRepository extends JpaRepository<RankHistory, String> {
  List<RankHistory> findByAthlete_Id(String athleteId);
}
