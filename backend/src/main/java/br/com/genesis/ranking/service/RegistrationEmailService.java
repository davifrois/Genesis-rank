package br.com.genesis.ranking.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.stereotype.Service;

import br.com.genesis.ranking.model.Event;
import br.com.genesis.ranking.model.EventRegistration;

@Service
public class RegistrationEmailService {
  private static final Logger log = LoggerFactory.getLogger(RegistrationEmailService.class);

  private final JavaMailSender mailSender;
  private final boolean enabled;
  private final String fromAddress;
  private final String replyToAddress;
  private final String subjectPrefix;

  public RegistrationEmailService(
      JavaMailSender mailSender,
      @Value("${app.registration-email.enabled:true}") boolean enabled,
      @Value("${app.registration-email.from:no-reply@genesisesportes.com.br}") String fromAddress,
      @Value("${app.registration-email.reply-to:contato@genesisesportes.com.br}") String replyToAddress,
      @Value("${app.registration-email.subject-prefix:Genesis Esportes}") String subjectPrefix
  ) {
    this.mailSender = mailSender;
    this.enabled = enabled;
    this.fromAddress = clean(fromAddress);
    this.replyToAddress = clean(replyToAddress);
    this.subjectPrefix = clean(subjectPrefix);
  }

  public void sendPaymentConfirmedEmail(EventRegistration registration) {
    String email = resolveRecipientEmail(registration);
    if (email == null) return;

    Event event = registration.getEvent();
    String eventName = event != null ? clean(event.getName()) : "";
    String eventDate = event != null && event.getDate() != null ? event.getDate().toString() : "";
    String eventLocation = event != null ? clean(event.getLocation()) : "";
    String athleteName = clean(registration.getNome());

    String subjectBase = "Inscricao confirmada";
    String subject = subjectPrefix.isBlank()
        ? subjectBase
        : String.format("[%s] %s", subjectPrefix, subjectBase);

    StringBuilder body = new StringBuilder();
    body.append("Ola");
    if (!athleteName.isBlank()) {
      body.append(" ").append(athleteName);
    }
    body.append(",\n\n");
    body.append("Sua inscricao foi confirmada com sucesso no sistema Genesis Esportes.\n\n");
    if (!eventName.isBlank()) {
      body.append("Evento: ").append(eventName).append("\n");
    }
    if (!eventDate.isBlank()) {
      body.append("Data: ").append(eventDate).append("\n");
    }
    if (!eventLocation.isBlank()) {
      body.append("Local: ").append(eventLocation).append("\n");
    }
    body.append("Status do pagamento: Confirmado\n\n");
    body.append("Em caso de duvidas, responda este e-mail ou entre em contato com a organizacao.\n\n");
    body.append("Genesis Esportes");

    sendMail(email, subject, body.toString(), "confirmacao");
  }

  public void sendRegistrationReceivedEmail(EventRegistration registration) {
    String email = resolveRecipientEmail(registration);
    if (email == null) return;

    Event event = registration.getEvent();
    String eventName = event != null ? clean(event.getName()) : "";
    String eventDate = event != null && event.getDate() != null ? event.getDate().toString() : "";
    String eventLocation = event != null ? clean(event.getLocation()) : "";
    String athleteName = clean(registration.getNome());

    String subjectBase = "Inscricao recebida com sucesso";
    String subject = subjectPrefix.isBlank()
        ? subjectBase
        : String.format("[%s] %s", subjectPrefix, subjectBase);

    StringBuilder body = new StringBuilder();
    body.append("Ola");
    if (!athleteName.isBlank()) {
      body.append(" ").append(athleteName);
    }
    body.append(",\n\n");
    body.append("Sua inscricao foi feita com sucesso e registrada no sistema Genesis Esportes.\n\n");
    if (!eventName.isBlank()) {
      body.append("Evento: ").append(eventName).append("\n");
    }
    if (!eventDate.isBlank()) {
      body.append("Data: ").append(eventDate).append("\n");
    }
    if (!eventLocation.isBlank()) {
      body.append("Local: ").append(eventLocation).append("\n");
    }
    body.append("Status do pagamento: Aguardando confirmacao\n\n");
    body.append("Assim que o pagamento for conferido pela equipe, voce recebera nova confirmacao.\n\n");
    
    if (registration.getPixCopyPaste() != null && !registration.getPixCopyPaste().isBlank()) {
        body.append("=== DADOS PARA PAGAMENTO PIX ===\n");
        body.append("Copie e cole o código abaixo no aplicativo do seu banco:\n\n");
        body.append(registration.getPixCopyPaste()).append("\n\n");
        body.append("================================\n\n");
    }

    body.append("Genesis Esportes");

    sendMail(email, subject, body.toString(), "recebimento");
  }

  private String resolveRecipientEmail(EventRegistration registration) {
    if (!enabled || registration == null) {
      return null;
    }

    String email = clean(registration.getEmail());
    if (!isValidEmail(email)) {
      return null;
    }

    if (mailSender instanceof JavaMailSenderImpl senderImpl) {
      String host = clean(senderImpl.getHost());
      if (host.isBlank()) {
        log.info("SMTP nao configurado. E-mail nao enviado para {}", email);
        return null;
      }
    }

    return email;
  }

  private void sendMail(String email, String subject, String body, String context) {
    try {
      SimpleMailMessage message = new SimpleMailMessage();
      message.setTo(email);
      message.setSubject(subject);
      message.setText(body);
      if (!fromAddress.isBlank()) {
        message.setFrom(fromAddress);
      }
      if (!replyToAddress.isBlank()) {
        message.setReplyTo(replyToAddress);
      }
      mailSender.send(message);
    } catch (Exception ex) {
      log.warn("Falha ao enviar e-mail de {} para {}: {}", context, email, ex.getMessage());
    }
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
