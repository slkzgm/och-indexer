import { calculateTrainingCost, calculateNextTrainingAvailable, validateHeroLevel } from "./calculations";
import { updateHeroStats } from "./entities";

/**
 * Met à jour un héro après un training - VERSION OPTIMISÉE
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

  // Met à jour le héro avec le nouveau niveau
  const updatedHero = {
    ...hero,
    level: finalLevel,
    lastTrainingTimestamp: timestamp,
    nextTrainingCost: calculateTrainingCost(finalLevel),
    nextTrainingAvailable: calculateNextTrainingAvailable(timestamp),
  };

  // OPTIMISATION : Ne recalcule les stats que si le niveau a réellement changé
  if (oldLevel !== newLevel) {
    // Récupère l'arme équipée pour recalculer les stats
    let equippedWeapon = null;
    if (hero.equippedWeapon_id) {
      equippedWeapon = await context.Weapon.get(hero.equippedWeapon_id);
    }

    // Recalcule les stats (damage et rewards) avec le nouveau niveau
    await updateHeroStats(context, updatedHero, equippedWeapon);
  } else {
    // Pas de changement de niveau → juste mettre à jour les champs de training
    context.Hero.set(updatedHero);
  }
}