package br.com.genesis.ranking;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import br.com.genesis.ranking.model.Athlete;
import br.com.genesis.ranking.model.Bracket;
import br.com.genesis.ranking.model.BracketSeed;
import br.com.genesis.ranking.model.Event;
import br.com.genesis.ranking.repository.AthleteRepository;
import br.com.genesis.ranking.repository.BracketRepository;
import br.com.genesis.ranking.repository.EventRepository;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
    "spring.datasource.url=jdbc:h2:mem:genesis_bracket_security;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DEFAULT_NULL_ORDERING=HIGH;DB_CLOSE_DELAY=-1",
    "spring.datasource.driver-class-name=org.h2.Driver",
    "spring.datasource.username=sa",
    "spring.datasource.password=",
    "spring.jpa.hibernate.ddl-auto=create-drop"
})
class BracketPodiumEndpointE2ETest {

  @Autowired
  private MockMvc mockMvc;

  @Autowired
  private EventRepository eventRepository;

  @Autowired
  private AthleteRepository athleteRepository;

  @Autowired
  private BracketRepository bracketRepository;

  @BeforeEach
  void cleanDatabase() {
    bracketRepository.deleteAll();
    athleteRepository.deleteAll();
    eventRepository.deleteAll();
  }

  @Test
  @WithMockUser(username = "mesa1", roles = { "MESARIO" })
  void mesarioCanUpdatePodiumUsingDedicatedEndpoint() throws Exception {
    SeedData seed = seedBracketWithSingleAthlete();

    String payload = """
        {
          "podium": {
            "goldId": "%s",
            "silverId": "",
            "bronzeId": ""
          },
          "appliedAt": "2026-03-06T12:00:00Z"
        }
        """.formatted(seed.athleteId());

    mockMvc.perform(
        put("/api/brackets/{id}/podium", seed.bracketId())
            .contentType(MediaType.APPLICATION_JSON)
            .content(payload)
    )
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.id").value(seed.bracketId()))
        .andExpect(jsonPath("$.podium.goldId").value(seed.athleteId()))
        .andExpect(jsonPath("$.appliedAt").value("2026-03-06T12:00:00Z"));
  }

  @Test
  @WithMockUser(username = "mesa1", roles = { "MESARIO" })
  void mesarioCannotUseGenericBracketUpdateEndpoint() throws Exception {
    SeedData seed = seedBracketWithSingleAthlete();

    String payload = """
        {
          "number": 9,
          "eventId": "%s",
          "categoryKey": "adulto|azul|leve|gi",
          "label": "Adulto / Azul / Leve / GI",
          "mode": "GI",
          "size": 1,
          "seedIds": ["%s"],
          "podium": {
            "goldId": "%s",
            "silverId": "",
            "bronzeId": ""
          }
        }
        """.formatted(seed.eventId(), seed.athleteId(), seed.athleteId());

    mockMvc.perform(
        put("/api/brackets/{id}", seed.bracketId())
            .contentType(MediaType.APPLICATION_JSON)
            .content(payload)
    )
        .andExpect(status().isForbidden());
  }

  private SeedData seedBracketWithSingleAthlete() {
    Event event = new Event();
    event.setName("Evento Teste Chave");
    event.setLocation("Belo Horizonte");
    event = eventRepository.save(event);

    Athlete athlete = new Athlete();
    athlete.setNome("Atleta Teste");
    athlete.setAcademia("Academia Teste");
    athlete.setFaixa("Azul");
    athlete.setPeso("Leve");
    athlete.setCategoria("Adulto");
    athlete.setPontos(0);
    athlete.setEvent(event);
    athlete = athleteRepository.save(athlete);

    Bracket bracket = new Bracket();
    bracket.setNumber(1);
    bracket.setEvent(event);
    bracket.setCategoryKey("adulto|azul|leve|gi");
    bracket.setLabel("Adulto / Azul / Leve / GI");
    bracket.setMode("GI");
    bracket.setSize(1);

    BracketSeed seed = new BracketSeed();
    seed.setBracket(bracket);
    seed.setAthlete(athlete);
    seed.setSeedOrder(0);
    bracket.getSeeds().add(seed);

    bracket = bracketRepository.save(bracket);
    return new SeedData(event.getId(), athlete.getId(), bracket.getId());
  }

  private record SeedData(String eventId, String athleteId, String bracketId) {}
}
