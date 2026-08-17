package br.com.genesis.ranking.utils;

import java.util.Arrays;
import java.util.List;

public class WeightCategoryHelper {

    private static final List<String> ADULT_WEIGHTS = Arrays.asList(
            "GALO", "PLUMA", "PENA", "LEVE", "MEDIO", "MEIO PESADO", "PESADO", "SUPER PESADO", "PESADISSIMO", "ABSOLUTO"
    );

    /**
     * Finds the next weight in a sorted distinct list of weights available in the category.
     */
    public static String getNextWeightFromList(String currentWeight, List<String> availableWeights) {
        if (currentWeight == null || availableWeights == null || availableWeights.isEmpty()) {
            return currentWeight;
        }
        
        String normalized = currentWeight.trim().toUpperCase();
        if (normalized.contains("PESADISSIMO") || normalized.contains("ACIMA DE")) {
            return currentWeight; // Never moves up
        }

        // Try standard adults first
        if (ADULT_WEIGHTS.contains(normalized)) {
            int idx = ADULT_WEIGHTS.indexOf(normalized);
            if (idx >= 0 && idx + 1 < ADULT_WEIGHTS.size() && !ADULT_WEIGHTS.get(idx + 1).equals("ABSOLUTO")) {
                return ADULT_WEIGHTS.get(idx + 1);
            }
            return currentWeight;
        }

        // For kids / custom, find it in the sorted list of available weights
        // The list must be pre-sorted logically (numerically).
        int idx = availableWeights.indexOf(currentWeight);
        if (idx >= 0 && idx + 1 < availableWeights.size()) {
            return availableWeights.get(idx + 1);
        }

        return currentWeight;
    }
    
    public static Integer extractNumericWeight(String weight) {
        if (weight == null) return 9999;
        String w = weight.replaceAll("[^0-9]", "");
        if (w.isEmpty()) return 9999;
        try {
            return Integer.parseInt(w);
        } catch (NumberFormatException e) {
            return 9999;
        }
    }
}
