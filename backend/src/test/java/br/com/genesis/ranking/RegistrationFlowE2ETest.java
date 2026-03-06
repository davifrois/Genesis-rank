package br.com.genesis.ranking;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
    "spring.datasource.url=jdbc:h2:mem:genesis_e2e;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DEFAULT_NULL_ORDERING=HIGH;DB_CLOSE_DELAY=-1",
    "spring.datasource.driver-class-name=org.h2.Driver",
    "spring.datasource.username=sa",
    "spring.datasource.password=",
    "spring.jpa.hibernate.ddl-auto=create-drop",
    "app.bootstrap.admin.username=admin",
    "app.bootstrap.admin.password=admin123",
    "app.bootstrap.admin.name=Admin",
    "app.bootstrap.admin.role=ADMIN"
})
class RegistrationFlowE2ETest {

  @Autowired
  private MockMvc mockMvc;

  @Autowired
  private ObjectMapper objectMapper;

  @Test
  @WithMockUser(username = "admin", roles = { "ADMIN" })
  void shouldCompletePublicRegistrationToActiveAthleteAndBracketFlow() throws Exception {
    String eventId = "E2E-EVENT-" + UUID.randomUUID().toString().substring(0, 8);
    String clientRequestId = "E2E-REQ-" + UUID.randomUUID().toString().substring(0, 10);
    String athleteName = "Atleta Fluxo E2E " + UUID.randomUUID().toString().substring(0, 6);
    String academy = "Academia E2E";

    String registrationPayload = """
        {
          "eventId": "%s",
          "clientRequestId": "%s",
          "eventName": "Evento E2E",
          "eventDate": "2026-04-20",
          "eventLocation": "Arena Teste",
          "nome": "%s",
          "email": "e2e.teste@demo.com",
          "phone": "31999999999",
          "academia": "%s",
          "faixa": "Azul",
          "peso": "Leve",
          "categoria": "Adulto",
          "genero": "Masculino",
          "modalidade": "GI",
          "notes": "{\\"tipoInscricao\\":\\"GI\\"}"
        }
        """.formatted(eventId, clientRequestId, athleteName, academy);

    MvcResult registrationResult = mockMvc.perform(
        post("/api/public/registrations")
            .contentType(MediaType.APPLICATION_JSON)
            .content(registrationPayload)
    )
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("PENDING"))
        .andExpect(jsonPath("$.id").isNotEmpty())
        .andExpect(jsonPath("$.eventId").value(eventId))
        .andExpect(jsonPath("$.clientRequestId").value(clientRequestId))
        .andReturn();

    JsonNode registrationJson = objectMapper.readTree(registrationResult.getResponse().getContentAsString());
    String registrationId = registrationJson.path("id").asText();
    assertThat(registrationId).isNotBlank();

    String paymentPayload = """
        {
          "status": "PAYMENT_CONFIRMED",
          "reviewNotes": "Comprovante validado via teste E2E",
          "reviewedBy": "E2E Admin"
        }
        """;

    MvcResult paymentResult = mockMvc.perform(
        patch("/api/admin/registrations/{registrationId}/payment", registrationId)
            .contentType(MediaType.APPLICATION_JSON)
            .content(paymentPayload)
    )
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("PAYMENT_CONFIRMED"))
        .andExpect(jsonPath("$.athleteId").isNotEmpty())
        .andReturn();

    JsonNode paymentJson = objectMapper.readTree(paymentResult.getResponse().getContentAsString());
    String athleteId = paymentJson.path("athleteId").asText();
    assertThat(athleteId).isNotBlank();

    mockMvc.perform(get("/api/athletes").param("eventId", eventId))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].id").value(athleteId))
        .andExpect(jsonPath("$[0].nome").value(athleteName))
        .andExpect(jsonPath("$[0].academia").value(academy))
        .andExpect(jsonPath("$[0].eventId").value(eventId))
        .andExpect(jsonPath("$[0].pontos").value(0));

    String bracketPayload = """
        {
          "number": 1,
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
        """.formatted(eventId, athleteId, athleteId);

    mockMvc.perform(
        post("/api/brackets")
            .contentType(MediaType.APPLICATION_JSON)
            .content(bracketPayload)
    )
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.eventId").value(eventId))
        .andExpect(jsonPath("$.seedIds[0]").value(athleteId))
        .andExpect(jsonPath("$.podium.goldId").value(athleteId));

    mockMvc.perform(get("/api/brackets").param("eventId", eventId))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].eventId").value(eventId))
        .andExpect(jsonPath("$[0].seedIds[0]").value(athleteId));
  }

  @Test
  void shouldRunEndToEndLoginRegistrationAndAdminConfirmationFlow() throws Exception {
    String athleteUsername = "athlete_" + UUID.randomUUID().toString().substring(0, 8);
    String athletePassword = "atleta123";
    String athleteName = "Atleta Fluxo JWT";
    String eventId = "JWT-EVENT-" + UUID.randomUUID().toString().substring(0, 8);
    String clientRequestId = "JWT-REQ-" + UUID.randomUUID().toString().substring(0, 10);

    String adminLoginPayload = """
        {
          "username": "admin",
          "password": "admin123"
        }
        """;

    MvcResult adminLoginResult = mockMvc.perform(
        post("/api/auth/login")
            .contentType(MediaType.APPLICATION_JSON)
            .content(adminLoginPayload)
    )
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.token").isNotEmpty())
        .andExpect(jsonPath("$.user.role").value("ADMIN"))
        .andReturn();

    String adminToken = objectMapper
        .readTree(adminLoginResult.getResponse().getContentAsString())
        .path("token")
        .asText();
    assertThat(adminToken).isNotBlank();

    String createAthleteUserPayload = """
        {
          "name": "%s",
          "username": "%s",
          "password": "%s",
          "role": "ATHLETE"
        }
        """.formatted(athleteName, athleteUsername, athletePassword);

    mockMvc.perform(
        post("/api/admin/users")
            .header("Authorization", "Bearer " + adminToken)
            .contentType(MediaType.APPLICATION_JSON)
            .content(createAthleteUserPayload)
    )
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.username").value(athleteUsername))
        .andExpect(jsonPath("$.role").value("ATHLETE"));

    String athleteLoginPayload = """
        {
          "username": "%s",
          "password": "%s"
        }
        """.formatted(athleteUsername, athletePassword);

    MvcResult athleteLoginResult = mockMvc.perform(
        post("/api/auth/login")
            .contentType(MediaType.APPLICATION_JSON)
            .content(athleteLoginPayload)
    )
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.token").isNotEmpty())
        .andExpect(jsonPath("$.user.role").value("ATHLETE"))
        .andReturn();

    String athleteToken = objectMapper
        .readTree(athleteLoginResult.getResponse().getContentAsString())
        .path("token")
        .asText();
    assertThat(athleteToken).isNotBlank();

    String registrationPayload = """
        {
          "eventId": "%s",
          "clientRequestId": "%s",
          "eventName": "Evento JWT",
          "eventDate": "2026-04-20",
          "eventLocation": "Arena Teste",
          "nome": "%s",
          "email": "jwt.atleta@demo.com",
          "phone": "31999999999",
          "academia": "Academia JWT",
          "faixa": "Azul",
          "peso": "Leve",
          "categoria": "Adulto",
          "genero": "Masculino",
          "modalidade": "GI",
          "notes": "{\\"tipoInscricao\\":\\"GI\\"}"
        }
        """.formatted(eventId, clientRequestId, athleteName);

    MvcResult registrationResult = mockMvc.perform(
        post("/api/public/registrations")
            .contentType(MediaType.APPLICATION_JSON)
            .content(registrationPayload)
    )
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("PENDING"))
        .andExpect(jsonPath("$.id").isNotEmpty())
        .andReturn();

    String registrationId = objectMapper
        .readTree(registrationResult.getResponse().getContentAsString())
        .path("id")
        .asText();
    assertThat(registrationId).isNotBlank();

    String paymentPayload = """
        {
          "status": "PAYMENT_CONFIRMED",
          "reviewNotes": "Conferido no fluxo JWT",
          "reviewedBy": "Admin JWT"
        }
        """;

    mockMvc.perform(
        patch("/api/admin/registrations/{registrationId}/payment", registrationId)
            .header("Authorization", "Bearer " + athleteToken)
            .contentType(MediaType.APPLICATION_JSON)
            .content(paymentPayload)
    )
        .andExpect(status().isForbidden());

    mockMvc.perform(
        patch("/api/admin/registrations/{registrationId}/payment", registrationId)
            .header("Authorization", "Bearer " + adminToken)
            .contentType(MediaType.APPLICATION_JSON)
            .content(paymentPayload)
    )
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("PAYMENT_CONFIRMED"))
        .andExpect(jsonPath("$.athleteId").isNotEmpty());
  }

  @Test
  @WithMockUser(username = "atleta", roles = { "ATHLETE" })
  void shouldBlockPaymentConfirmationForNonAdmin() throws Exception {
    String eventId = "SEC-EVENT-" + UUID.randomUUID().toString().substring(0, 8);
    String clientRequestId = "SEC-REQ-" + UUID.randomUUID().toString().substring(0, 10);

    String registrationPayload = """
        {
          "eventId": "%s",
          "clientRequestId": "%s",
          "eventName": "Evento Segurança",
          "eventDate": "2026-04-20",
          "eventLocation": "Arena Teste",
          "nome": "Atleta Segurança",
          "email": "seguranca.teste@demo.com",
          "phone": "31999999999",
          "academia": "Academia Segurança",
          "faixa": "Azul",
          "peso": "Leve",
          "categoria": "Adulto",
          "genero": "Masculino",
          "modalidade": "GI",
          "notes": "{\\"tipoInscricao\\":\\"GI\\"}"
        }
        """.formatted(eventId, clientRequestId);

    MvcResult registrationResult = mockMvc.perform(
        post("/api/public/registrations")
            .contentType(MediaType.APPLICATION_JSON)
            .content(registrationPayload)
    )
        .andExpect(status().isOk())
        .andReturn();

    JsonNode registrationJson = objectMapper.readTree(registrationResult.getResponse().getContentAsString());
    String registrationId = registrationJson.path("id").asText();
    assertThat(registrationId).isNotBlank();

    String paymentPayload = """
        {
          "status": "PAYMENT_CONFIRMED",
          "reviewNotes": "Tentativa sem perfil admin",
          "reviewedBy": "Atleta"
        }
        """;

    mockMvc.perform(
        patch("/api/admin/registrations/{registrationId}/payment", registrationId)
            .contentType(MediaType.APPLICATION_JSON)
            .content(paymentPayload)
    )
        .andExpect(status().isForbidden());
  }
}
