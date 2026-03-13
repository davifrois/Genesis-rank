package br.com.genesis.ranking.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.stereotype.Service;

import br.com.genesis.ranking.dto.CoachAthleteLinkedNotificationRequest;

@Service
public class CoachNotificationEmailService {
  private static final Logger log = LoggerFactory.getLogger(CoachNotificationEmailService.class);

  private final JavaMailSender mailSender;
  private final boolean enabled;
  private final String fromAddress;
  private final String replyToAddress;
  private final String subjectPrefix;

  public CoachNotificationEmailService(
      JavaMailSender mailSender,
      @Value("${app.coach-athlete-email.enabled:true}") boolean enabled,
      @Value("${app.coach-athlete-email.from:no-reply@genesisesportes.com.br}") String fromAddress,
      @Value("${app.coach-athlete-email.reply-to:contato@genesisesportes.com.br}") String replyToAddress,
      @Value("${app.coach-athlete-email.subject-prefix:Genesis Esportes}") String subjectPrefix
  ) {
    this.mailSender = mailSender;
    this.enabled = enabled;
    this.fromAddress = clean(fromAddress);
    this.replyToAddress = clean(replyToAddress);
    this.subjectPrefix = clean(subjectPrefix);
  }

  public void sendAthleteLinkedEmail(
      CoachAthleteLinkedNotificationRequest request,
      String authenticatedUsername,
      boolean coachUser
  ) {
    if (!enabled || request == null) {
      return;
    }

    String recipientEmail = resolveRecipientEmail(request, authenticatedUsername, coachUser);
    if (!isValidEmail(recipientEmail)) {
      return;
    }

    if (mailSender instanceof JavaMailSenderImpl senderImpl) {
      String host = clean(senderImpl.getHost());
      if (host.isBlank()) {
        log.info("SMTP not configured. Coach notification email not sent to {}", recipientEmail);
        return;
      }
    }

    String athleteName = clean(request.getAthleteName());
    if (athleteName.isBlank()) {
      return;
    }

    String coachName = clean(request.getCoachName());
    if (coachName.isBlank()) {
      coachName = recipientEmail;
    }
    String academyName = clean(request.getAcademyName());
    String athleteEmail = clean(request.getAthleteEmail());

    String subjectBase = "Aluno vinculado a sua academia";
    String subject = subjectPrefix.isBlank()
        ? subjectBase
        : String.format("[%s] %s", subjectPrefix, subjectBase);

    StringBuilder body = new StringBuilder();
    body.append("Ola ");
    body.append(coachName);
    body.append(",\n\n");
    body.append("Um aluno foi vinculado na sua academia dentro da plataforma Genesis Esportes.\n\n");
    body.append("Aluno: ").append(athleteName).append("\n");
    if (!academyName.isBlank()) {
      body.append("Academia: ").append(academyName).append("\n");
    }
    if (!athleteEmail.isBlank()) {
      body.append("E-mail do aluno: ").append(athleteEmail).append("\n");
    }
    body.append("\nAcesse o painel de filiacao para revisar os dados e seguir para inscricao em eventos.\n\n");
    body.append("Genesis Esportes");

    try {
      SimpleMailMessage message = new SimpleMailMessage();
      message.setTo(recipientEmail);
      message.setSubject(subject);
      message.setText(body.toString());
      if (!fromAddress.isBlank()) {
        message.setFrom(fromAddress);
      }
      if (!replyToAddress.isBlank()) {
        message.setReplyTo(replyToAddress);
      }
      mailSender.send(message);
    } catch (Exception ex) {
      log.warn("Failed to send coach notification email to {}: {}", recipientEmail, ex.getMessage());
    }
  }

  private String resolveRecipientEmail(
      CoachAthleteLinkedNotificationRequest request,
      String authenticatedUsername,
      boolean coachUser
  ) {
    String authUsername = clean(authenticatedUsername);
    if (coachUser && isValidEmail(authUsername)) {
      return authUsername;
    }

    String coachEmail = clean(request.getCoachEmail());
    if (isValidEmail(coachEmail)) {
      return coachEmail;
    }

    if (isValidEmail(authUsername)) {
      return authUsername;
    }
    return "";
  }

  private boolean isValidEmail(String value) {
    String email = clean(value);
    int at = email.indexOf('@');
    int dot = email.lastIndexOf('.');
    return at > 0 && dot > at + 1 && dot < email.length() - 1;
  }

  private String clean(String value) {
    return value == null ? "" : value.trim();
  }
}
