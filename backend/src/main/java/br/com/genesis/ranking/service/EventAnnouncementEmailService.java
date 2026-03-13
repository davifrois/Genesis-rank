package br.com.genesis.ranking.service;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.stereotype.Service;

import br.com.genesis.ranking.model.Event;
import br.com.genesis.ranking.model.enums.Role;
import br.com.genesis.ranking.repository.EventRegistrationRepository;
import br.com.genesis.ranking.repository.UserRepository;

@Service
public class EventAnnouncementEmailService {
  private static final Logger log = LoggerFactory.getLogger(EventAnnouncementEmailService.class);

  private final JavaMailSender mailSender;
  private final EventRegistrationRepository registrationRepository;
  private final UserRepository userRepository;
  private final boolean enabled;
  private final boolean includePlatformAccounts;
  private final String fromAddress;
  private final String replyToAddress;
  private final String subjectPrefix;
  private final String eventsPageUrl;

  public EventAnnouncementEmailService(
      JavaMailSender mailSender,
      EventRegistrationRepository registrationRepository,
      UserRepository userRepository,
      @Value("${app.event-announcement-email.enabled:true}") boolean enabled,
      @Value("${app.event-announcement-email.include-platform-accounts:true}") boolean includePlatformAccounts,
      @Value("${app.event-announcement-email.from:no-reply@genesisesportes.com.br}") String fromAddress,
      @Value("${app.event-announcement-email.reply-to:contato@genesisesportes.com.br}") String replyToAddress,
      @Value("${app.event-announcement-email.subject-prefix:Genesis Esportes}") String subjectPrefix,
      @Value("${app.event-announcement-email.events-page-url:https://genesisesportes.com.br/eventos}") String eventsPageUrl
  ) {
    this.mailSender = mailSender;
    this.registrationRepository = registrationRepository;
    this.userRepository = userRepository;
    this.enabled = enabled;
    this.includePlatformAccounts = includePlatformAccounts;
    this.fromAddress = clean(fromAddress);
    this.replyToAddress = clean(replyToAddress);
    this.subjectPrefix = clean(subjectPrefix);
    this.eventsPageUrl = clean(eventsPageUrl);
  }

  public AnnouncementReport sendNewEventAnnouncement(Event event) {
    if (!enabled || event == null) {
      return AnnouncementReport.skipped();
    }

    String eventName = clean(event.getName());
    if (eventName.isBlank()) {
      return AnnouncementReport.skipped();
    }

    if (mailSender instanceof JavaMailSenderImpl senderImpl) {
      String host = clean(senderImpl.getHost());
      if (host.isBlank()) {
        log.info("SMTP nao configurado. Aviso de novo campeonato nao enviado.");
        return AnnouncementReport.skipped();
      }
    }

    Set<String> recipients = new LinkedHashSet<>();
    registrationRepository.findDistinctAthleteEmails().stream()
        .map(this::clean)
        .map(String::toLowerCase)
        .filter(this::isValidEmail)
        .forEach(recipients::add);

    if (includePlatformAccounts) {
      userRepository.findDistinctUsernamesByRoleIn(List.of(Role.ATHLETE, Role.COACH)).stream()
          .map(this::clean)
          .map(String::toLowerCase)
          .filter(this::isValidEmail)
          .forEach(recipients::add);
    }

    if (recipients.isEmpty()) {
      log.info("Nenhum e-mail valido de atleta encontrado para aviso de campeonato.");
      return AnnouncementReport.skipped();
    }

    String subjectBase = "Novo campeonato aberto: " + eventName;
    String subject = subjectPrefix.isBlank()
        ? subjectBase
        : String.format("[%s] %s", subjectPrefix, subjectBase);

    String eventDate = event.getDate() == null ? "" : event.getDate().toString();
    String eventLocation = clean(event.getLocation());
    String registrationUrl = clean(event.getRegistrationUrl());
    String eventPageUrl = buildEventPageUrl(event.getId());
    String targetUrl = !registrationUrl.isBlank() ? registrationUrl : eventPageUrl;

    StringBuilder body = new StringBuilder();
    body.append("Ola atleta,\n\n");
    body.append("Um novo campeonato foi criado no sistema Genesis Esportes.\n\n");
    body.append("Campeonato: ").append(eventName).append("\n");
    if (!eventDate.isBlank()) {
      body.append("Data: ").append(eventDate).append("\n");
    }
    if (!eventLocation.isBlank()) {
      body.append("Local: ").append(eventLocation).append("\n");
    }
    if (!targetUrl.isBlank()) {
      body.append("Inscricao: ").append(targetUrl).append("\n");
    }
    body.append("\nParticipe e garanta sua vaga.\n\n");
    body.append("Genesis Esportes");

    int sent = 0;
    int failed = 0;
    for (String email : recipients) {
      try {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(email);
        message.setSubject(subject);
        message.setText(body.toString());
        if (!fromAddress.isBlank()) {
          message.setFrom(fromAddress);
        }
        if (!replyToAddress.isBlank()) {
          message.setReplyTo(replyToAddress);
        }
        mailSender.send(message);
        sent += 1;
      } catch (Exception ex) {
        failed += 1;
        log.warn("Falha ao enviar aviso de campeonato para {}: {}", email, ex.getMessage());
      }
    }

    log.info(
        "Aviso de campeonato '{}' concluido. Destinatarios: {}, enviados: {}, falhas: {}.",
        eventName,
        recipients.size(),
        sent,
        failed
    );
    return AnnouncementReport.completed(recipients.size(), sent, failed);
  }

  public static class AnnouncementReport {
    private final boolean attempted;
    private final int recipients;
    private final int sent;
    private final int failed;

    private AnnouncementReport(boolean attempted, int recipients, int sent, int failed) {
      this.attempted = attempted;
      this.recipients = recipients;
      this.sent = sent;
      this.failed = failed;
    }

    public static AnnouncementReport skipped() {
      return new AnnouncementReport(false, 0, 0, 0);
    }

    public static AnnouncementReport completed(int recipients, int sent, int failed) {
      return new AnnouncementReport(true, Math.max(0, recipients), Math.max(0, sent), Math.max(0, failed));
    }

    public boolean isAttempted() {
      return attempted;
    }

    public int getRecipients() {
      return recipients;
    }

    public int getSent() {
      return sent;
    }

    public int getFailed() {
      return failed;
    }
  }

  private String buildEventPageUrl(String eventId) {
    if (eventsPageUrl.isBlank()) {
      return "";
    }
    String normalizedId = clean(eventId);
    if (normalizedId.isBlank()) {
      return eventsPageUrl;
    }
    if (eventsPageUrl.endsWith("/")) {
      return eventsPageUrl + normalizedId;
    }
    return eventsPageUrl + "/" + normalizedId;
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
