package br.com.genesis.ranking.controller;

import br.com.genesis.ranking.model.EventRegistration;
import br.com.genesis.ranking.service.PublicRegistrationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/webhooks/payment")
@CrossOrigin(origins = "*") // Allows external webhooks to reach this endpoint
public class PaymentWebhookController {

    private final PublicRegistrationService publicRegistrationService;

    public PaymentWebhookController(PublicRegistrationService publicRegistrationService) {
        this.publicRegistrationService = publicRegistrationService;
    }

    /**
     * Endpoint genérico para receber webhooks de pagamento.
     * Quando um gateway de pagamento (MercadoPago, Asaas, etc.) confirmar o PIX,
     * ele fará um POST aqui.
     */
    @PostMapping
    public ResponseEntity<String> handlePaymentWebhook(@RequestBody Map<String, Object> payload) {
        try {
            // Em uma integração real, aqui extraímos o ID da transação e validamos a assinatura do gateway.
            // Exemplo genérico: o gateway nos manda um campo 'transactionId' e 'status'.
            String transactionId = payload.containsKey("transactionId") ? payload.get("transactionId").toString() : null;
            String status = payload.containsKey("status") ? payload.get("status").toString() : null;
            
            // Para testes: vamos assumir que passamos o ID da inscrição como 'clientRequestId' ou 'registrationId'
            String registrationId = payload.containsKey("registrationId") ? payload.get("registrationId").toString() : null;

            if (registrationId != null && "APPROVED".equalsIgnoreCase(status)) {
                // Atualiza o status da inscrição para confirmado.
                EventRegistration registration = publicRegistrationService.approveRegistration(registrationId, transactionId);
                
                if (registration != null) {
                    System.out.println("Webhook: Inscrição " + registrationId + " aprovada com sucesso via transação: " + transactionId);
                } else {
                    System.err.println("Webhook: Inscrição " + registrationId + " não encontrada para aprovação.");
                }
            } else {
                System.out.println("Webhook: Recebido status '" + status + "' para transação '" + transactionId + "'. Nenhuma ação de aprovação tomada.");
            }

            return ResponseEntity.ok("Webhook processado com sucesso");

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body("Erro ao processar o webhook");
        }
    }
}
