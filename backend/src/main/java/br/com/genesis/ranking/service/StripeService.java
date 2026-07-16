package br.com.genesis.ranking.service;

import br.com.genesis.ranking.model.EventRegistration;
import com.stripe.exception.StripeException;
import com.stripe.model.checkout.Session;
import com.stripe.param.checkout.SessionCreateParams;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;

@Service
public class StripeService {

    @Value("${app.cors.allowed-origins:http://localhost:5173}")
    private String clientBaseUrl;

    public Session createCheckoutSession(String registrationIds, String athleteName, BigDecimal amountInBrl) throws StripeException {
        // Stripe expects amount in cents
        long amountInCents = amountInBrl.multiply(new BigDecimal("100")).longValue();

        String successUrl = getBaseClientUrl() + "/payment/success?session_id={CHECKOUT_SESSION_ID}";
        String cancelUrl = getBaseClientUrl() + "/payment/cancel";

        SessionCreateParams params =
          SessionCreateParams.builder()
            .setMode(SessionCreateParams.Mode.PAYMENT)
            .setSuccessUrl(successUrl)
            .setCancelUrl(cancelUrl)
            .putMetadata("registrationId", registrationIds)
            .addLineItem(
              SessionCreateParams.LineItem.builder()
                .setQuantity(1L)
                .setPriceData(
                  SessionCreateParams.LineItem.PriceData.builder()
                    .setCurrency("brl")
                    .setUnitAmount(amountInCents)
                    .setProductData(
                      SessionCreateParams.LineItem.PriceData.ProductData.builder()
                        .setName("Inscrição Campeonato - " + athleteName)
                        .build())
                    .build())
                .build())
            .build();

        return Session.create(params);
    }

    private String getBaseClientUrl() {
        // Take the first origin if multiple are defined
        if (clientBaseUrl != null && clientBaseUrl.contains(",")) {
            return clientBaseUrl.split(",")[0];
        }
        return clientBaseUrl;
    }
}
