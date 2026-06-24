package br.com.genesis.ranking.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import br.com.genesis.ranking.model.Bracket;

public interface BracketRepository extends JpaRepository<Bracket, String> {
  List<Bracket> findByEvent_Id(String eventId);
  List<Bracket> findByPublishedTrue();
  List<Bracket> findByEvent_IdAndPublishedTrue(String eventId);
}
