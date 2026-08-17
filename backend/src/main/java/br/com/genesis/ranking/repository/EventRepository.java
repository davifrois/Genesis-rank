package br.com.genesis.ranking.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import br.com.genesis.ranking.model.Event;

import java.time.LocalDateTime;
import java.util.List;

public interface EventRepository extends JpaRepository<Event, String> {
    List<Event> findByPromotionExecutedFalseAndRegistrationOpenFalse();
    List<Event> findByPromotionExecutedIsNullAndRegistrationOpenFalse();
    
    // Novo método para buscar eventos com check-in expirado
    List<Event> findByCheckinEndDateBeforeAndPromotionExecutedFalse(LocalDateTime now);
    List<Event> findByCheckinEndDateBeforeAndPromotionExecutedIsNull(LocalDateTime now);
}
