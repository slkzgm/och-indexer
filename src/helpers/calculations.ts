/**
 * Fonctions de calcul pour le jeu OCH
 * Centralise tous les calculs : training, damage, rewards, etc.
 */

// Constants pour les calculs
const TRAINING_COOLDOWN_SECONDS = 24 * 60 * 60; // 24h
const MIN_HERO_LEVEL = 1;

/**
 * Calcule le coût d'entraînement d'un héro selon son niveau
 * Formule: (Level * 10000e18) / (69 + Level)
 * @param level Le niveau actuel du héro
 * @returns Le coût en wei (1e18) pour s'entraîner
 */
export function calculateTrainingCost(level: number): bigint {
  const lvl = BigInt(level);
  // 10000e18 = 10^4 * 10^18 = 10^22
  const SCALE = BigInt("10000000000000000000000");
  const numerator = lvl * SCALE;
  const denominator = BigInt(69 + level);
  return numerator / denominator;
}

/**
 * Calcule le timestamp de disponibilité pour le prochain training
 * @param lastTrainingTimestamp Le timestamp du dernier training
 * @returns Le timestamp où le héro pourra s'entraîner à nouveau
 */
export function calculateNextTrainingAvailable(lastTrainingTimestamp: bigint): bigint {
  return lastTrainingTimestamp + BigInt(TRAINING_COOLDOWN_SECONDS);
}

/**
 * Valide qu'un niveau de héro est dans les limites acceptables
 * @param level Le niveau à valider
 * @returns Le niveau validé (minimum 1)
 */
export function validateHeroLevel(level: number): number {
  return Math.max(level, MIN_HERO_LEVEL);
} 