import { calculateTrainingCost, calculateNextTrainingAvailable, validateHeroLevel } from "./calculations";

/**
 * Met à jour un héro après un training - VERSION SIMPLE
 * @param context Le contexte du handler
 * @param heroId L'ID du héro
 * @param oldLevel L'ancien niveau
 * @param newLevel Le nouveau niveau
 * @param timestamp Le timestamp du training
 */
export async function handleHeroTraining(
  context: any,
  heroId: string,
  oldLevel: number,
  newLevel: number,
  timestamp: bigint
) {
  // Validation : niveau minimum
  const finalLevel = validateHeroLevel(newLevel);
  
  // Récupère le héro
  const hero = await context.Hero.getOrThrow(
    heroId,
    `Hero ${heroId} non trouvé pour le training`
  );

  // Met à jour le héro - SIMPLE ET ESSENTIEL
  hero.level = finalLevel;
  hero.lastTrainingTimestamp = timestamp;
  hero.nextTrainingCost = calculateTrainingCost(finalLevel);
  hero.nextTrainingAvailable = calculateNextTrainingAvailable(timestamp);
  
  context.Hero.set(hero);
}