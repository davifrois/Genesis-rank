package br.com.genesis.ranking;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class GenesisRankingApplication {
  public static void main(String[] args) {
    SpringApplication.run(GenesisRankingApplication.class, args);
  }
}
