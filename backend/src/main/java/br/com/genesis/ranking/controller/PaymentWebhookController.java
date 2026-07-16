package br.com.genesis.ranking.controller;

import br.com.genesis.ranking.model.EventRegistration;
import br.com.genesis.ranking.service.PublicRegistrationService;
import com.stripe.exception.SignatureVerificationException;
import com.stripe.model.Event;
import com.stripe.model.checkout.Session;
import com.stripe.net.Webhook;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/webhooks/payment")
@CrossOrigin(origins = "*") // Allows external webhooks to reach this endpoint
public class PaymentWebhookController {

    private final PublicRegistrationService publicRegistrationService;

    @Value("${app.stripe.webhook-secret:whsec_placeholder}")
    private String endpointSecret;

    public PaymentWebhookController(PublicRegistrationService publicRegistrationService) {
        this.publicRegistrationService = publicRegistrationService;
    }

    @PostMapping
    public ResponseEntity<String> handleStripeWebhook(
            @RequestBody String payload,
            @RequestHeader("Stripe-Signature") String sigHeader) {
        
        Event event;
        try {
            event = Webhook.constructEvent(payload, sigHeader, endpointSecret);
        } catch (SignatureVerificationException e) {
            System.err.println("Webhook Signature Verification Failed: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Invalid signature");
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Error parsing webhook");
        }

        if ("checkout.session.completed".equals(event.getType())) {
            // Get session object
            Session session = (Session) event.getDataObjectDeserializer().getObject().orElse(null);
            
            if (session != null && "paid".equals(session.getPaymentStatus())) {
                String registrationId = session.getMetadata().get("registrationId");
                String transactionId = session.getPaymentIntent(); // Or session.getId()
                
                if (registrationId != null) {
                    String[] regIds = registrationId.split(",");
                    for (String rId : regIds) {
                        rId = rId.trim();
                        if (rId.isEmpty()) continue;
                        EventRegistration registration = publicRegistrationService.approveRegistration(rId, transactionId);
                        if (registration != null) {
                            System.out.println("Webhook: Inscrição " + rId + " aprovada com sucesso via Stripe. TX: " + transactionId);
                        } else {
                            System.err.println("Webhook: Inscrição " + rId + " não encontrada para aprovação.");
                        }
                    }
                }
            }
        } else {
            System.out.println("Unhandled event type: " + event.getType());
        }

        return ResponseEntity.ok("Success");
    }
}
