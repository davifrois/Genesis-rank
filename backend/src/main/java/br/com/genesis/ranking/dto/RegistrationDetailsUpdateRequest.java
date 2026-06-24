package br.com.genesis.ranking.dto;

import jakarta.validation.constraints.NotBlank;
import java.math.BigDecimal;

public class RegistrationDetailsUpdateRequest {

    @NotBlank(message = "Categoria is required")
    private String categoria;

    @NotBlank(message = "Faixa is required")
    private String faixa;

    @NotBlank(message = "Peso is required")
    private String peso;

    private String genero;
    private String modalidade;
    private Boolean isAbsolute;
    private BigDecimal price;

    public String getCategoria() {
        return categoria;
    }

    public void setCategoria(String categoria) {
        this.categoria = categoria;
    }

    public String getFaixa() {
        return faixa;
    }

    public void setFaixa(String faixa) {
        this.faixa = faixa;
    }

    public String getPeso() {
        return peso;
    }

    public void setPeso(String peso) {
        this.peso = peso;
    }

    public String getGenero() {
        return genero;
    }

    public void setGenero(String genero) {
        this.genero = genero;
    }

    public String getModalidade() {
        return modalidade;
    }

    public void setModalidade(String modalidade) {
        this.modalidade = modalidade;
    }

    public Boolean getIsAbsolute() {
        return isAbsolute;
    }

    public void setIsAbsolute(Boolean isAbsolute) {
        this.isAbsolute = isAbsolute;
    }

    public BigDecimal getPrice() {
        return price;
    }

    public void setPrice(BigDecimal price) {
        this.price = price;
    }
}
