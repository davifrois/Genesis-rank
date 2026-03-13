package br.com.genesis.ranking;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.SpyBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import com.fasterxml.jackson.databind.ObjectMapper;

import br.com.genesis.ranking.dto.CoachAthleteLinkedNotificationRequest;
import br.com.genesis.ranking.service.CoachNotificationEmailService;
import br.com.genesis.ranking.service.RegistrationEmailService;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
    "spring.datasource.url=jdbc:h2:mem:genesis_coach_notification_e2e;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DEFAULT_NULL_ORDERING=HIGH;DB_CLOSE_DELAY=-1",
    "spring.datasource.driver-class-name=org.h2.Driver",
    "spring.datasource.username=sa",
    "spring.datasource.password=",
    "spring.jpa.hibernate.ddl-auto=create-drop",
    "app.bootstrap.admin.username=admin",
    "app.bootstrap.admin.password=admin123",
    "app.bootstrap.admin.name=Admin",
    "app.bootstrap.admin.role=ADMIN"
})
class CoachNotificationEndpointE2ETest {

  @Autowired
  private MockMvc mockMvc;

  @Autowired
  private ObjectMapper objectMapper;

  @SpyBean
  private CoachNotificationEmailService coachNotificationEmailService;

  @SpyBean
  private RegistrationEmailService registrationEmailService;

  @BeforeEach
  void resetSpy() {
    clearInvocations(coachNotificationEmailService);
    clearInvocations(registrationEmailService);
  }

  @Test
  void shouldRejectAnonymousRequestOnCoachNotificationEndpoint() throws Exception {
    String payload = """
        {
          "athleteName": "Atleta Sem Token",
          "academyName": "Academia Teste",
          "coachEmail": "coach@demo.com"
        }
        """;

    mockMvc.perform(
        post("/api/coach/notifications/athlete-linked")
            .contentType(MediaType.APPLICATION_JSON)
            .content(payload)
    )
        .andExpect(status().isForbidden());

    verifyNoInteractions(coachNotificationEmailService);
  }

  @Test
  void shouldAllowAdminTokenAndInvokeCoachNotificationService() throws Exception {
    String adminToken = loginAndGetToken("admin", "admin123");

    String payload = """
        {
          "athleteName": "Atleta Fluxo Admin",
          "academyName": "Academia Admin",
          "coachEmail": "coach.admin@demo.com",
          "coachName": "Professor Admin",
          "athleteEmail": "atleta.admin@demo.com"
        }
        """;

    mockMvc.perform(
        post("/api/coach/notifications/athlete-linked")
            .header("Authorization", "Bearer " + adminToken)
            .contentType(MediaType.APPLICATION_JSON)
            .content(payload)
    )
        .andExpect(status().isOk());

    verify(coachNotificationEmailService).sendAthleteLinkedEmail(
        argThat((CoachAthleteLinkedNotificationRequest request) -> (
            request != null
                && "Atleta Fluxo Admin".equals(request.getAthleteName())
                && "coach.admin@demo.com".equals(request.getCoachEmail())
        )),
        eq("admin"),
        eq(false)
    );
  }

  @Test
  void shouldAllowCoachTokenAndMarkCoachContextOnNotificationService() throws Exception {
    String adminToken = loginAndGetToken("admin", "admin123");
    String coachUsername = "coach_" + UUID.randomUUID().toString().substring(0, 8);
    String coachPassword = "coach123";

    String createCoachPayload = """
        {
          "name": "Professor E2E",
          "username": "%s",
          "password": "%s",
          "role": "COACH"
        }
        """.formatted(coachUsername, coachPassword);

    mockMvc.perform(
        post("/api/admin/users")
            .header("Authorization", "Bearer " + adminToken)
            .contentType(MediaType.APPLICATION_JSON)
            .content(createCoachPayload)
    )
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.username").value(coachUsername))
        .andExpect(jsonPath("$.role").value("COACH"));

    String coachToken = loginAndGetToken(coachUsername, coachPassword);

    String payload = """
        {
          "athleteName": "Atleta Fluxo Coach",
          "academyName": "Academia Coach",
          "coachName": "Professor E2E",
          "athleteEmail": "atleta.coach@demo.com"
        }
        """;

    mockMvc.perform(
        post("/api/coach/notifications/athlete-linked")
            .header("Authorization", "Bearer " + coachToken)
            .contentType(MediaType.APPLICATION_JSON)
            .content(payload)
    )
        .andExpect(status().isOk());

    verify(coachNotificationEmailService).sendAthleteLinkedEmail(
        argThat((CoachAthleteLinkedNotificationRequest request) -> (
            request != null
                && "Atleta Fluxo Coach".equals(request.getAthleteName())
                && "Academia Coach".equals(request.getAcademyName())
        )),
        eq(coachUsername),
        eq(true)
    );
  }

  @Test
  void shouldRunEndToEndAdminCoachAthletePipelineAndTriggerEmails() throws Exception {
    String adminToken = loginAndGetToken("admin", "admin123");

    String suffix = UUID.randomUUID().toString().substring(0, 8);
    String coachUsername = "coach." + suffix + "@demo.com";
    String coachPassword = "coach123";

    String createCoachPayload = """
        {
          "name": "Professor Pipeline",
          "username": "%s",
          "password": "%s",
          "role": "COACH"
        }
        """.formatted(coachUsername, coachPassword);

    mockMvc.perform(
        post("/api/admin/users")
            .header("Authorization", "Bearer " + adminToken)
            .contentType(MediaType.APPLICATION_JSON)
            .content(createCoachPayload)
    )
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.username").value(coachUsername))
        .andExpect(jsonPath("$.role").value("COACH"));

    String coachToken = loginAndGetToken(coachUsername, coachPassword);

    String eventId = "E2E-COACH-" + suffix;
    String athleteName = "Atleta Vinculado " + suffix;
    String athleteEmail = "atleta." + suffix + "@demo.com";
    String academyName = "Academia Pipeline " + suffix;

    String registrationPayload = """
        {
          "eventId": "%s",
          "clientRequestId": "REQ-%s",
          "eventName": "Evento Pipeline",
          "eventDate": "2026-04-20",
          "eventLocation": "Arena Pipeline",
          "nome": "%s",
          "email": "%s",
          "phone": "31999999999",
          "academia": "%s",
          "faixa": "Azul",
          "peso": "Leve",
          "categoria": "Adulto",
          "genero": "Masculino",
          "modalidade": "GI",
          "notes": "{\\"tipoInscricao\\":\\"GI\\"}"
        }
        """.formatted(eventId, suffix, athleteName, athleteEmail, academyName);

    MvcResult registrationResult = mockMvc.perform(
        post("/api/public/registrations")
            .contentType(MediaType.APPLICATION_JSON)
            .content(registrationPayload)
    )
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.id").isNotEmpty())
        .andExpect(jsonPath("$.status").value("PENDING"))
        .andReturn();

    String registrationId = objectMapper
        .readTree(registrationResult.getResponse().getContentAsString())
        .path("id")
        .asText();

    assertThat(registrationId).isNotBlank();

    String paymentPayload = """
        {
          "status": "PAYMENT_CONFIRMED",
          "reviewNotes": "Fluxo E2E professor",
          "reviewedBy": "Admin Pipeline"
        }
        """;

    MvcResult paymentResult = mockMvc.perform(
        patch("/api/admin/registrations/{registrationId}/payment", registrationId)
            .header("Authorization", "Bearer " + adminToken)
            .contentType(MediaType.APPLICATION_JSON)
            .content(paymentPayload)
    )
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("PAYMENT_CONFIRMED"))
        .andExpect(jsonPath("$.athleteId").isNotEmpty())
        .andReturn();

    String athleteId = objectMapper
        .readTree(paymentResult.getResponse().getContentAsString())
        .path("athleteId")
        .asText();

    assertThat(athleteId).isNotBlank();

    verify(registrationEmailService).sendPaymentConfirmedEmail(
        argThat((registration) -> (
            registration != null
                && athleteName.equals(registration.getNome())
                && athleteEmail.equals(registration.getEmail())
                && registration.getEvent() != null
                && eventId.equals(registration.getEvent().getId())
        ))
    );

    mockMvc.perform(
        get("/api/athletes")
            .header("Authorization", "Bearer " + adminToken)
            .param("eventId", eventId)
    )
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].id").value(athleteId))
        .andExpect(jsonPath("$[0].nome").value(athleteName))
        .andExpect(jsonPath("$[0].academia").value(academyName));

    String notifyPayload = """
        {
          "athleteName": "%s",
          "academyName": "%s",
          "coachName": "Professor Pipeline",
          "athleteEmail": "%s"
        }
        """.formatted(athleteName, academyName, athleteEmail);

    mockMvc.perform(
        post("/api/coach/notifications/athlete-linked")
            .header("Authorization", "Bearer " + coachToken)
            .contentType(MediaType.APPLICATION_JSON)
            .content(notifyPayload)
    )
        .andExpect(status().isOk());

    verify(coachNotificationEmailService).sendAthleteLinkedEmail(
        argThat((CoachAthleteLinkedNotificationRequest request) -> (
            request != null
                && athleteName.equals(request.getAthleteName())
                && academyName.equals(request.getAcademyName())
                && athleteEmail.equals(request.getAthleteEmail())
        )),
        eq(coachUsername),
        eq(true)
    );
  }

  private String loginAndGetToken(String username, String password) throws Exception {
    String loginPayload = """
        {
          "username": "%s",
          "password": "%s"
        }
        """.formatted(username, password);

    MvcResult result = mockMvc.perform(
        post("/api/auth/login")
            .contentType(MediaType.APPLICATION_JSON)
            .content(loginPayload)
    )
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.token").isNotEmpty())
        .andReturn();

    String token = objectMapper
        .readTree(result.getResponse().getContentAsString())
        .path("token")
        .asText();

    assertThat(token).isNotBlank();
    return token;
  }
}
