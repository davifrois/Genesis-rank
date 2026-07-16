package br.com.genesis.ranking.config;

import com.stripe.Stripe;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

@Configuration
// Configuração Financeira
// Configura as chaves e a integração inicial com os provedores de pagamento (como o Stripe).
public class FinanceiroConfig {

    @Value("${app.stripe.api-key:sk_test_placeholder}")
    private String stripeApiKey;

    @PostConstruct
    public void setup() {
        Stripe.apiKey = stripeApiKey;
    }
}
