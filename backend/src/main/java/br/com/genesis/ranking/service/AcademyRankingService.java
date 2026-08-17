package br.com.genesis.ranking.service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import br.com.genesis.ranking.dto.AcademyRankingDto;
import br.com.genesis.ranking.model.Athlete;
import br.com.genesis.ranking.model.Bracket;
import br.com.genesis.ranking.model.BracketPodium;
import br.com.genesis.ranking.repository.BracketRepository;

import br.com.genesis.ranking.model.EventRegistration;
import br.com.genesis.ranking.repository.EventRegistrationRepository;

@Service
public class AcademyRankingService {

    @Autowired
    private BracketRepository bracketRepository;
    
    @Autowired
    private EventRegistrationRepository registrationRepository;

    public List<AcademyRankingDto> getAcademyRankingByEvent(String eventId) {
        Map<String, AcademyRankingDto> academyMap = new HashMap<>();

        // Add all registered academies with 0 medals
        List<EventRegistration> registrations = registrationRepository.findByEvent_Id(eventId);
        for (EventRegistration reg : registrations) {
            String academy = normalizeAcademy(reg.getAcademia());
            if (academy != null) {
                academyMap.putIfAbsent(academy, new AcademyRankingDto(academy, 0, 0, 0));
            }
        }

        // Find all brackets for the event
        List<Bracket> brackets = bracketRepository.findByEvent_Id(eventId);
        
        for (Bracket bracket : brackets) {
            // Add all academies from bracket seeds
            if (bracket.getSeeds() != null) {
                for (var seed : bracket.getSeeds()) {
                    if (seed.getAthlete() != null) {
                        String academy = normalizeAcademy(seed.getAthlete().getAcademia());
                        if (academy != null) {
                            academyMap.putIfAbsent(academy, new AcademyRankingDto(academy, 0, 0, 0));
                        }
                    }
                }
            }

            BracketPodium podium = bracket.getPodium();
            if (podium == null) continue;

            // Process Gold
            if (podium.getGold() != null) {
                String academy = normalizeAcademy(podium.getGold().getAcademia());
                if (academy != null) {
                    academyMap.putIfAbsent(academy, new AcademyRankingDto(academy, 0, 0, 0));
                    academyMap.get(academy).addGold();
                }
            }

            // Process Silver
            if (podium.getSilver() != null) {
                String academy = normalizeAcademy(podium.getSilver().getAcademia());
                if (academy != null) {
                    academyMap.putIfAbsent(academy, new AcademyRankingDto(academy, 0, 0, 0));
                    academyMap.get(academy).addSilver();
                }
            }

            // Process Bronze
            if (podium.getBronze() != null) {
                String academy = normalizeAcademy(podium.getBronze().getAcademia());
                if (academy != null) {
                    academyMap.putIfAbsent(academy, new AcademyRankingDto(academy, 0, 0, 0));
                    academyMap.get(academy).addBronze();
                }
            }
        }

        // Convert to list and sort by Olympic rules
        List<AcademyRankingDto> ranking = new ArrayList<>(academyMap.values());
        ranking.sort(Comparator.comparingInt(AcademyRankingDto::getGold).reversed()
                .thenComparing(Comparator.comparingInt(AcademyRankingDto::getSilver).reversed())
                .thenComparing(Comparator.comparingInt(AcademyRankingDto::getBronze).reversed())
                .thenComparing(Comparator.comparingInt(AcademyRankingDto::getTotalMedals).reversed())
                .thenComparing(dto -> dto.getAcademyName().toLowerCase()));

        // Assign ranks
        int rank = 1;
        for (AcademyRankingDto dto : ranking) {
            dto.setRank(rank++);
        }

        return ranking;
    }

    private String normalizeAcademy(String name) {
        if (name == null || name.trim().isEmpty()) {
            return null;
        }
        return name.trim();
    }
}
