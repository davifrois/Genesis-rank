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

import java.util.Map;
import java.util.HashMap;

@RestController
@RequestMapping("/api/webhooks/payment")
@CrossOrigin(origins = "*") // Allows external webhooks to reach this endpoint
// Controlador Financeiro (Webhooks de Pagamento)
// Este controlador é responsável por receber os webhooks de provedores de pagamento (como Stripe) e atualizar o status das inscrições.
public class FinanceiroController {

    private final PublicRegistrationService publicRegistrationService;

    @Value("${app.stripe.webhook-secret:whsec_placeholder}")
    private String endpointSecret;

    public FinanceiroController(PublicRegistrationService publicRegistrationService) {
        this.publicRegistrationService = publicRegistrationService;
    }

    // Processa os webhooks do Stripe
    // Verifica a assinatura de segurança e, se o pagamento for confirmado (checkout.session.completed), aprova a inscrição.
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

import java.util.Map;
import java.util.HashMap;

@RestController
@RequestMapping("/api/webhooks/payment")
@CrossOrigin(origins = "*") // Allows external webhooks to reach this endpoint
// Controlador Financeiro (Webhooks de Pagamento)
// Este controlador é responsável por receber os webhooks de provedores de pagamento (como Stripe) e atualizar o status das inscrições.
public class FinanceiroController {

    private final PublicRegistrationService publicRegistrationService;

    @Value("${app.stripe.webhook-secret:whsec_placeholder}")
    private String endpointSecret;

    public FinanceiroController(PublicRegistrationService publicRegistrationService) {
        this.publicRegistrationService = publicRegistrationService;
    }

    // Processa os webhooks do Stripe
    // Verifica a assinatura de segurança e, se o pagamento for confirmado (checkout.session.completed), aprova a inscrição.
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

    // ========================================== //
    // TODO: DEV STRIPE - LÓGICA DE CRIAÇÃO DA SESSÃO 
    // ========================================== //
    // Caro desenvolvedor, aqui é onde a mágica do Checkout acontece.
    // Passo a Passo do que você precisa fazer neste método:
    // 
    // 1. O frontend vai fazer um POST para cá passando: registrationIds (string), athleteName (string), amount (number).
    // 2. Você precisa desempacotar esses dados do `requestData`.
    // 3. Com o valor (amount), você precisa multiplicá-lo por 100, pois a Stripe sempre cobra em centavos (ex: R$ 50,00 -> 5000).
    // 4. Instanciar o `SessionCreateParams` da biblioteca da Stripe.
    // 5. Configurar as URLs de sucesso (`setSuccessUrl`) e de cancelamento (`setCancelUrl`) que levam de volta para o React.
    // 6. Colocar o `registrationIds` dentro do `putMetadata("registrationId", ...)` da Sessão. Isso é CRÍTICO!
    //    Sem esse metadado, o nosso Webhook (lá em cima) não vai saber qual inscrição deve ser aprovada quando o pagamento der sucesso.
    // 7. Chamar `Session.create(params)` para efetivamente gerar o link no servidor da Stripe.
    // 8. Retornar no JSON a chave `url` contendo a `session.getUrl()`.
    
    @PostMapping("/checkout")
    public ResponseEntity<Map<String, String>> createCheckoutSession(@RequestBody Map<String, Object> requestData) {
        Map<String, String> response = new HashMap<>();
        
        try {
            // -- SEU CÓDIGO COMEÇA AQUI --

            // 1. Obter dados
            // String registrationIds = (String) requestData.get("registrationIds");
            // Number rawAmount = (Number) requestData.get("amount");
            // Long amountEmCentavos = rawAmount.longValue() * 100;

            // 2. Montar Parâmetros da Stripe
            // SessionCreateParams params = SessionCreateParams.builder()
            //     .setMode(SessionCreateParams.Mode.PAYMENT)
            //     .setSuccessUrl("http://localhost:5173/eventos?payment=success") // Ajustar para o domínio de produção depois
            //     .setCancelUrl("http://localhost:5173/eventos?payment=cancel")
            //     .putMetadata("registrationId", registrationIds) // <-- Muito Importante!
            //     .addLineItem(
            //         SessionCreateParams.LineItem.builder()
            //             .setQuantity(1L)
            //             .setPriceData(
            //                 SessionCreateParams.LineItem.PriceData.builder()
            //                     .setCurrency("brl")
            //                     .setUnitAmount(amountEmCentavos)
            //                     .setProductData(
            //                         SessionCreateParams.LineItem.PriceData.ProductData.builder()
            //                             .setName("Inscrição Campeonato")
            //                             .build()
            //                     )
            //                     .build()
            //             )
            //             .build()
            //     )
            //     .build();

            // 3. Criar e retornar
            // Session session = Session.create(params);
            // response.put("url", session.getUrl());
            
            // -- SEU CÓDIGO TERMINA AQUI --
            
            // REMOVA este exemplo estático quando integrar a API real:
            response.put("url", "https://checkout.stripe.com/pay/test_xyz123");
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            e.printStackTrace();
            response.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
}
