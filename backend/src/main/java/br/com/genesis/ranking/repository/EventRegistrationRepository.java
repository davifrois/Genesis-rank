package br.com.genesis.ranking.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import br.com.genesis.ranking.model.EventRegistration;

public interface EventRegistrationRepository extends JpaRepository<EventRegistration, String> {
  Optional<EventRegistration> findByClientRequestId(String clientRequestId);
  List<EventRegistration> findAllByOrderByCreatedAtDesc();
  List<EventRegistration> findByEvent_IdOrderByCreatedAtDesc(String eventId);

  @Query("select distinct er.email from EventRegistration er where er.email is not null and trim(er.email) <> ''")
  List<String> findDistinctAthleteEmails();
}
