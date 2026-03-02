package br.com.genesis.ranking.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import br.com.genesis.ranking.model.Event;

public interface EventRepository extends JpaRepository<Event, String> {
}
