package br.com.genesis.ranking.service;

import com.mercadopago.client.preference.PreferenceBackUrlsRequest;
import com.mercadopago.client.preference.PreferenceClient;
import com.mercadopago.client.preference.PreferenceItemRequest;
import com.mercadopago.client.preference.PreferenceRequest;
import com.mercadopago.exceptions.MPApiException;
import com.mercadopago.exceptions.MPException;
import com.mercadopago.resources.preference.Preference;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Service
public class MercadoPagoService {

    @Value("${app.cors.allowed-origins:http://localhost:5173}")
    private String clientBaseUrl;

    // URL pública do backend para receber notificações de pagamento do Mercado Pago.
    // Em produção, configure MERCADOPAGO_NOTIFICATION_URL=https://seu-dominio.com.br/api/webhooks/payment/mercadopago
    // Em desenvolvimento local, deixe vazio — a aprovação será feita pelo redirect do backUrl.
    @Value("${mercadopago.notification-url:}")
    private String notificationUrl;

    public Preference createCheckoutPreference(String registrationIds, String athleteName, BigDecimal amountInBrl) throws MPException, MPApiException {
        PreferenceClient client = new PreferenceClient();

        List<PreferenceItemRequest> items = new ArrayList<>();
        PreferenceItemRequest item = PreferenceItemRequest.builder()
                .title("Inscrição Campeonato - " + athleteName)
                .quantity(1)
                .unitPrice(amountInBrl)
                .currencyId("BRL")
                .build();
        items.add(item);

        String baseUrl = getBaseClientUrl();
        if (baseUrl == null || baseUrl.contains("localhost")) {
            baseUrl = "https://genesis-rank.vercel.app";
        }
        String successUrl = baseUrl + "/sucesso";
        String cancelUrl  = baseUrl + "/falha";
        String pendingUrl = baseUrl + "/pendente";

        PreferenceBackUrlsRequest backUrls = PreferenceBackUrlsRequest.builder()
                .success(successUrl)
                .failure(cancelUrl)
                .pending(pendingUrl)
                .build();

        PreferenceRequest.PreferenceRequestBuilder builder = PreferenceRequest.builder()
                .items(items)
                .backUrls(backUrls)
                .autoReturn("approved")
                .externalReference(registrationIds);

        String effectiveNotificationUrl = (notificationUrl != null && !notificationUrl.isBlank()) 
                ? notificationUrl 
                : "https://genesis-rank.vercel.app/api/webhook-mercadopago";

        builder.notificationUrl(effectiveNotificationUrl);


        try {
            return client.create(builder.build());
        } catch (MPApiException e) {
            System.err.println("=== MERCADO PAGO API ERROR ===");
            System.err.println("Status Code: " + e.getStatusCode());
            if (e.getApiResponse() != null) {
                System.err.println("Response Content: " + e.getApiResponse().getContent());
            }
            System.err.println("Message: " + e.getMessage());
            System.err.println("==============================");
            throw e;
        }
    }

    // Criação de PIX Transparente direto (o atleta não sai do seu site!)
    public java.util.Map<String, Object> createDirectPixPayment(String registrationIds, String athleteName, String email, BigDecimal amountInBrl) throws MPException, MPApiException {
        com.mercadopago.client.payment.PaymentClient client = new com.mercadopago.client.payment.PaymentClient();

        com.mercadopago.client.payment.PaymentCreateRequest request = com.mercadopago.client.payment.PaymentCreateRequest.builder()
                .transactionAmount(amountInBrl)
                .description("Inscrição Campeonato - " + athleteName)
                .paymentMethodId("pix")
                .externalReference(registrationIds)
                .payer(com.mercadopago.client.payment.PaymentPayerRequest.builder()
                        .email(email != null && !email.isBlank() ? email : "atleta@genesisranking.com.br")
                        .firstName(athleteName)
                        .build())
                .build();

        com.mercadopago.resources.payment.Payment payment = client.create(request);

        java.util.Map<String, Object> result = new java.util.HashMap<>();
        result.put("paymentId", payment.getId());
        result.put("status", payment.getStatus());
        if (payment.getPointOfInteraction() != null && payment.getPointOfInteraction().getTransactionData() != null) {
            result.put("qrCode", payment.getPointOfInteraction().getTransactionData().getQrCode());
            result.put("qrCodeBase64", payment.getPointOfInteraction().getTransactionData().getQrCodeBase64());
            result.put("ticketUrl", payment.getPointOfInteraction().getTransactionData().getTicketUrl());
        }
        return result;
    }

    private String getBaseClientUrl() {
        if (clientBaseUrl != null && clientBaseUrl.contains(",")) {
            return clientBaseUrl.split(",")[0];
        }
        return clientBaseUrl;
    }
}

