package br.com.genesis.ranking.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import br.com.genesis.ranking.model.Athlete;

public interface AthleteRepository extends JpaRepository<Athlete, String> {
  List<Athlete> findByEvent_Id(String eventId);
}
