package br.com.genesis.ranking.service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.genesis.ranking.model.Event;
import br.com.genesis.ranking.model.EventRegistration;
import br.com.genesis.ranking.model.enums.RegistrationPaymentStatus;
import br.com.genesis.ranking.repository.EventRegistrationRepository;
import br.com.genesis.ranking.repository.EventRepository;
import br.com.genesis.ranking.utils.WeightCategoryHelper;

@Service
public class AthletePromotionService {

    private static final Logger logger = LoggerFactory.getLogger(AthletePromotionService.class);

    @Autowired
    private EventRepository eventRepository;

    @Autowired
    private EventRegistrationRepository registrationRepository;

    /**
     * Roda de hora em hora (no minuto 5) para processar eventos que tiveram o check-in encerrado.
     */
    @Scheduled(cron = "0 5 * * * ?")
    @Transactional
    public void processClosedEvents() {
        logger.info("Iniciando rotina de promoção de atletas...");
        LocalDateTime now = LocalDateTime.now();
        
        List<Event> closedEvents = new ArrayList<>();
        closedEvents.addAll(eventRepository.findByCheckinEndDateBeforeAndPromotionExecutedFalse(now));
        closedEvents.addAll(eventRepository.findByCheckinEndDateBeforeAndPromotionExecutedIsNull(now));

        for (Event event : closedEvents) {
            processEventPromotions(event);
            event.setPromotionExecuted(true);
            eventRepository.save(event);
        }
        
        logger.info("Rotina de promoção concluída.");
    }

    private void processEventPromotions(Event event) {
        logger.info("Processando evento: {}", event.getName());
        List<EventRegistration> registrations = registrationRepository.findByEvent_Id(event.getId());

        // Group by category, belt, gender, weight
        Map<String, List<EventRegistration>> groups = new HashMap<>();
        Map<String, List<String>> availableWeightsByCategory = new HashMap<>();

        for (EventRegistration reg : registrations) {
            // Ignore cancelled
            if ("CANCELLED".equals(reg.getStatus()) || "REMOVED".equals(reg.getStatus())) {
                continue;
            }

            String cat = reg.getCategoria() != null ? reg.getCategoria().trim().toUpperCase() : "";
            String belt = reg.getFaixa() != null ? reg.getFaixa().trim().toUpperCase() : "";
            String gen = reg.getGenero() != null ? reg.getGenero().trim().toUpperCase() : "";
            String weight = reg.getPeso() != null ? reg.getPeso().trim().toUpperCase() : "";
            String isNoGi = "NO-GI".equalsIgnoreCase(reg.getModalidade()) ? "NOGI" : "GI";

            String key = cat + "|" + belt + "|" + gen + "|" + isNoGi;
            String groupKey = key + "|" + weight;

            groups.computeIfAbsent(groupKey, k -> new ArrayList<>()).add(reg);
            
            // Collect all unique weights for this category combination
            availableWeightsByCategory.computeIfAbsent(key, k -> new ArrayList<>());
            if (!availableWeightsByCategory.get(key).contains(weight)) {
                availableWeightsByCategory.get(key).add(weight);
            }
        }

        // Sort weights numerically for each category
        for (List<String> weights : availableWeightsByCategory.values()) {
            weights.sort((w1, w2) -> {
                Integer num1 = WeightCategoryHelper.extractNumericWeight(w1);
                Integer num2 = WeightCategoryHelper.extractNumericWeight(w2);
                if (!num1.equals(num2)) {
                    return num1.compareTo(num2);
                }
                return w1.compareTo(w2);
            });
        }

        for (Map.Entry<String, List<EventRegistration>> entry : groups.entrySet()) {
            List<EventRegistration> regs = entry.getValue();
            if (regs.size() == 1) {
                EventRegistration aloneAthlete = regs.get(0);
                
                // Extrai a chave base para pegar os pesos disponíveis
                String cat = aloneAthlete.getCategoria() != null ? aloneAthlete.getCategoria().trim().toUpperCase() : "";
                String belt = aloneAthlete.getFaixa() != null ? aloneAthlete.getFaixa().trim().toUpperCase() : "";
                String gen = aloneAthlete.getGenero() != null ? aloneAthlete.getGenero().trim().toUpperCase() : "";
                String isNoGi = "NO-GI".equalsIgnoreCase(aloneAthlete.getModalidade()) ? "NOGI" : "GI";
                String key = cat + "|" + belt + "|" + gen + "|" + isNoGi;

                // Regra do Não Pago
                if (!RegistrationPaymentStatus.PAYMENT_CONFIRMED.name().equals(aloneAthlete.getStatus())) {
                    logger.info("Removendo atleta sozinho com pagamento pendente: {} (Status atual: {})", aloneAthlete.getNome(), aloneAthlete.getStatus());
                    aloneAthlete.setStatus("CANCELLED");
                    aloneAthlete.setNotes((aloneAthlete.getNotes() != null ? aloneAthlete.getNotes() : "") 
                            + "\nRemovido pela rotina automática (sozinho na chave sem pagamento).");
                    registrationRepository.save(aloneAthlete);
                } else {
                    // Regra do Pago - Promover
                    String currentWeight = aloneAthlete.getPeso();
                    List<String> available = availableWeightsByCategory.get(key);
                    String nextWeight = WeightCategoryHelper.getNextWeightFromList(currentWeight, available);

                    if (!currentWeight.equals(nextWeight)) {
                        logger.info("Promovendo atleta {} do peso {} para {}", aloneAthlete.getNome(), currentWeight, nextWeight);
                        aloneAthlete.setPeso(nextWeight);
                        aloneAthlete.setNotes((aloneAthlete.getNotes() != null ? aloneAthlete.getNotes() : "") 
                                + "\nPromovido pela rotina automática: " + currentWeight + " -> " + nextWeight + ".");
                        registrationRepository.save(aloneAthlete);
                    }
                }
            }
        }
    }
}
