package br.com.genesis.ranking.controller;

import br.com.genesis.ranking.model.EventRegistration;
import br.com.genesis.ranking.service.PublicRegistrationService;
import br.com.genesis.ranking.service.MercadoPagoService;
import com.mercadopago.client.payment.PaymentClient;
import com.mercadopago.resources.payment.Payment;
import com.mercadopago.resources.preference.Preference;
import com.stripe.exception.SignatureVerificationException;
import com.stripe.model.Event;
import com.stripe.model.checkout.Session;
import com.stripe.net.Webhook;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.Map;
import java.util.HashMap;

@RestController
@RequestMapping("/api/webhooks/payment")
@CrossOrigin(origins = "*") // Allows external webhooks to reach this endpoint
// Controlador Financeiro (Webhooks de Pagamento)
// Este controlador é responsável por receber os webhooks de provedores de pagamento (como Stripe) e atualizar o status das inscrições.
public class FinanceiroController {

    private final PublicRegistrationService publicRegistrationService;
    private final MercadoPagoService mercadoPagoService;

    @Value("${app.stripe.webhook-secret:whsec_placeholder}")
    private String endpointSecret;

    public FinanceiroController(PublicRegistrationService publicRegistrationService, MercadoPagoService mercadoPagoService) {
        this.publicRegistrationService = publicRegistrationService;
        this.mercadoPagoService = mercadoPagoService;
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
            String registrationIds = (String) requestData.get("registrationIds");
            String athleteName = (String) requestData.get("athleteName");
            Number rawAmount = (Number) requestData.get("amount");
            
            if (registrationIds == null || athleteName == null || rawAmount == null) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "Missing parameters"));
            }

            BigDecimal amountInBrl = BigDecimal.valueOf(rawAmount.doubleValue());

            // Create Mercado Pago Preference
            Preference preference = mercadoPagoService.createCheckoutPreference(registrationIds, athleteName, amountInBrl);
            
            String initPoint = preference.getInitPoint();
            if (initPoint == null || initPoint.isEmpty()) {
                initPoint = preference.getSandboxInitPoint();
            }

            response.put("url", initPoint); // Checkout Pro URL
            return ResponseEntity.ok(response);
            
        } catch (com.mercadopago.exceptions.MPApiException e) {
            e.printStackTrace();
            String detail = (e.getApiResponse() != null && e.getApiResponse().getContent() != null) 
                    ? e.getApiResponse().getContent() 
                    : e.getMessage();
            System.err.println("[MercadoPago Error Details] " + detail);
            response.put("error", detail);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        } catch (Exception e) {
            e.printStackTrace();
            response.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    // Endpoint de confirmação ao retornar do checkout (backup para quando webhook não puder ser chamado)
    @GetMapping("/confirm-return")
    public ResponseEntity<Map<String, Object>> confirmPaymentReturn(
            @RequestParam("registrationIds") String registrationIds,
            @RequestParam(name = "paymentId", required = false) String paymentId) {
        
        Map<String, Object> result = new HashMap<>();
        if (registrationIds != null && !registrationIds.isBlank()) {
            if (paymentId != null && !paymentId.isBlank() && !paymentId.equalsIgnoreCase("null")) {
                try {
                    PaymentClient paymentClient = new PaymentClient();
                    Payment payment = paymentClient.get(Long.valueOf(paymentId.trim()));
                    if ("approved".equals(payment.getStatus())) {
                        String[] regIds = registrationIds.split(",");
                        for (String rId : regIds) {
                            rId = rId.trim();
                            if (rId.isEmpty()) continue;
                            publicRegistrationService.approveRegistration(rId, String.valueOf(payment.getId()));
                            System.out.println("Confirm-return: Inscrição " + rId + " aprovada com sucesso via MP Payment verificado.");
                        }
                        result.put("success", true);
                        result.put("status", "APPROVED");
                        return ResponseEntity.ok(result);
                    } else {
                        System.out.println("Confirm-return: Pagamento " + paymentId + " não aprovado (status: " + payment.getStatus() + ")");
                        result.put("success", false);
                        result.put("status", payment.getStatus());
                        return ResponseEntity.ok(result);
                    }
                } catch (Exception e) {
                    System.err.println("Confirm-return: Erro ao verificar pagamento MP: " + e.getMessage());
                }
            }
            result.put("success", false);
            result.put("message", "Pagamento não confirmado ou ID ausente");
            return ResponseEntity.ok(result);
        }
        result.put("success", false);
        return ResponseEntity.badRequest().body(result);
    }

    // Gerar PIX Direto (Sem redirecionar para o Mercado Pago)
    @PostMapping("/pix")
    public ResponseEntity<Map<String, Object>> createPixPayment(@RequestBody Map<String, Object> requestData) {
        try {
            String registrationIds = (String) requestData.get("registrationIds");
            String athleteName = (String) requestData.get("athleteName");
            String email = (String) requestData.get("email");
            Number rawAmount = (Number) requestData.get("amount");

            if (registrationIds == null || athleteName == null || rawAmount == null) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "Parâmetros ausentes"));
            }

            BigDecimal amountInBrl = BigDecimal.valueOf(rawAmount.doubleValue());
            Map<String, Object> pixData = mercadoPagoService.createDirectPixPayment(registrationIds, athleteName, email, amountInBrl);
            return ResponseEntity.ok(pixData);
        } catch (com.mercadopago.exceptions.MPApiException e) {
            e.printStackTrace();
            String detail = (e.getApiResponse() != null && e.getApiResponse().getContent() != null)
                    ? e.getApiResponse().getContent()
                    : e.getMessage();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", detail));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", e.getMessage()));
        }
    }

    // Consulta de status do pagamento PIX em tempo real
    @GetMapping("/status/{paymentId}")
    public ResponseEntity<Map<String, Object>> checkPaymentStatus(@PathVariable("paymentId") Long paymentId) {
        try {
            PaymentClient paymentClient = new PaymentClient();
            Payment payment = paymentClient.get(paymentId);
            boolean isApproved = "approved".equals(payment.getStatus());

            if (isApproved) {
                String registrationIds = payment.getExternalReference();
                if (registrationIds != null && !registrationIds.isBlank()) {
                    String[] regIds = registrationIds.split(",");
                    for (String rId : regIds) {
                        rId = rId.trim();
                        if (rId.isEmpty()) continue;
                        publicRegistrationService.approveRegistration(rId, String.valueOf(paymentId));
                    }
                }
            }

            return ResponseEntity.ok(Map.of(
                "status", payment.getStatus() != null ? payment.getStatus() : "pending",
                "approved", isApproved,
                "externalReference", payment.getExternalReference() != null ? payment.getExternalReference() : ""
            ));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of("status", "pending", "approved", false, "error", e.getMessage()));
        }
    }

    // Processa os webhooks do Mercado Pago
    @PostMapping("/mercadopago")
    public ResponseEntity<String> handleMercadoPagoWebhook(
            @RequestParam(name = "data.id", required = false) Long dataId,
            @RequestParam(name = "type", required = false) String type,
            @RequestBody(required = false) Map<String, Object> payload) {
        
        System.out.println("Mercado Pago Webhook recebido: " + type + " / ID: " + dataId);

        try {
            if ("payment".equals(type) && dataId != null) {
                PaymentClient paymentClient = new PaymentClient();
                Payment payment = paymentClient.get(dataId);
                
                if ("approved".equals(payment.getStatus())) {
                    String registrationIds = payment.getExternalReference();
                    String transactionId = String.valueOf(payment.getId());
                    
                    if (registrationIds != null && !registrationIds.isEmpty()) {
                        String[] regIds = registrationIds.split(",");
                        for (String rId : regIds) {
                            rId = rId.trim();
                            if (rId.isEmpty()) continue;
                            EventRegistration registration = publicRegistrationService.approveRegistration(rId, transactionId);
                            if (registration != null) {
                                System.out.println("Webhook MP: Inscrição " + rId + " aprovada com sucesso. TX: " + transactionId);
                            } else {
                                System.err.println("Webhook MP: Inscrição " + rId + " não encontrada.");
                            }
                        }
                    }
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error processing MP webhook");
        }

        return ResponseEntity.ok("Success");
    }
}
