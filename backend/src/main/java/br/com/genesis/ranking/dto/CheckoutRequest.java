package br.com.genesis.ranking.dto;

import java.math.BigDecimal;

public class CheckoutRequest {
    private String registrationIds;
    private String athleteName;
    private BigDecimal amount;

    public String getRegistrationIds() { return registrationIds; }
    public void setRegistrationIds(String registrationIds) { this.registrationIds = registrationIds; }

    public String getAthleteName() { return athleteName; }
    public void setAthleteName(String athleteName) { this.athleteName = athleteName; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
}
