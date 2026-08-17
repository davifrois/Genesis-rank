package br.com.genesis.ranking.dto;

public class AcademyRankingDto {
    private int rank;
    private String academyName;
    private int gold;
    private int silver;
    private int bronze;
    private int totalMedals;

    public AcademyRankingDto() {
    }

    public AcademyRankingDto(String academyName, int gold, int silver, int bronze) {
        this.academyName = academyName;
        this.gold = gold;
        this.silver = silver;
        this.bronze = bronze;
        this.totalMedals = gold + silver + bronze;
    }

    public int getRank() {
        return rank;
    }

    public void setRank(int rank) {
        this.rank = rank;
    }

    public String getAcademyName() {
        return academyName;
    }

    public void setAcademyName(String academyName) {
        this.academyName = academyName;
    }

    public int getGold() {
        return gold;
    }

    public void setGold(int gold) {
        this.gold = gold;
        this.totalMedals = this.gold + this.silver + this.bronze;
    }

    public int getSilver() {
        return silver;
    }

    public void setSilver(int silver) {
        this.silver = silver;
        this.totalMedals = this.gold + this.silver + this.bronze;
    }

    public int getBronze() {
        return bronze;
    }

    public void setBronze(int bronze) {
        this.bronze = bronze;
        this.totalMedals = this.gold + this.silver + this.bronze;
    }

    public int getTotalMedals() {
        return totalMedals;
    }

    public void setTotalMedals(int totalMedals) {
        this.totalMedals = totalMedals;
    }

    public void addGold() {
        this.gold++;
        this.totalMedals++;
    }

    public void addSilver() {
        this.silver++;
        this.totalMedals++;
    }

    public void addBronze() {
        this.bronze++;
        this.totalMedals++;
    }
}
