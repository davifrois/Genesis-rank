package br.com.genesis.ranking.config;

import com.stripe.Stripe;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

@Configuration
// Configuração Financeira
// Configura as chaves e a integração inicial com os provedores de pagamento (Mercado Pago e Stripe).
public class FinanceiroConfig {

    @Value("${app.stripe.api-key:}")
    private String stripeApiKey;

    @Value("${mercadopago.access-token:}")
    private String mercadoPagoAccessToken;

    @PostConstruct
    public void setup() {
        // Inicializa Stripe apenas se a chave estiver configurada
        if (stripeApiKey != null && !stripeApiKey.isBlank()) {
            Stripe.apiKey = stripeApiKey;
        }

        // Inicializa Mercado Pago com o access token de produção
        if (mercadoPagoAccessToken != null && !mercadoPagoAccessToken.isBlank()) {
            com.mercadopago.MercadoPagoConfig.setAccessToken(mercadoPagoAccessToken);
            System.out.println("[FinanceiroConfig] Mercado Pago inicializado. Token: " 
                + mercadoPagoAccessToken.substring(0, Math.min(20, mercadoPagoAccessToken.length())) + "...");
        } else {
            System.err.println("[FinanceiroConfig] AVISO: mercadopago.access-token nao configurado!");
        }
    }
}
