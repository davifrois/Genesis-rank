package br.com.genesis.ranking.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import br.com.genesis.ranking.model.EventRegistration;

public interface EventRegistrationRepository extends JpaRepository<EventRegistration, String> {
  List<EventRegistration> findAllByOrderByCreatedAtDesc();
  List<EventRegistration> findByEvent_IdOrderByCreatedAtDesc(String eventId);
}
