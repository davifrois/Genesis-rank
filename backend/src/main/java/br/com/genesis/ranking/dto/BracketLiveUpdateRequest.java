package br.com.genesis.ranking.dto;

import java.util.ArrayList;
import java.util.List;

public class BracketLiveUpdateRequest {
  private List<BracketLiveMatchDto> liveMatches = new ArrayList<>();
  private List<String> walkovers = new ArrayList<>();

  public List<BracketLiveMatchDto> getLiveMatches() {
    return liveMatches;
  }

  public void setLiveMatches(List<BracketLiveMatchDto> liveMatches) {
    this.liveMatches = liveMatches;
  }

  public List<String> getWalkovers() {
    return walkovers;
  }

  public void setWalkovers(List<String> walkovers) {
    this.walkovers = walkovers;
  }
}
