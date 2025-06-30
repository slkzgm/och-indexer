import { calculateTrainingCost, calculateNextTrainingAvailable, validateHeroLevel } from "./calculations";
import { updateHeroStats } from "./entities";

/**
 * Met à jour un héro après un training - VERSION OPTIMISÉE
 * @param context Le contexte du handler
 * @param heroId L'ID du héro
 * @param oldLevel L'ancien niveau
 * @param newLevel Le nouveau niveau
 * @param timestamp Le timestamp du training
 * @param preloadedHero Héro pré-chargé (optionnel)
 * @param preloadedWeapon Arme équipée pré-chargée (optionnel)
 */
export async function handleHeroTraining(
  context: any,
  heroId: string,
  oldLevel: number,
  newLevel: number,
  timestamp: bigint,
  preloadedHero?: any | null,
  preloadedWeapon?: any | null
) {
  // Validation : niveau minimum
  const finalLevel = validateHeroLevel(newLevel);
  
  let hero: any;
  let equippedWeapon: any | null;

  if (preloadedHero) {
    // Utilise les entités pré-chargées (optimisation)
    hero = preloadedHero;
    equippedWeapon = preloadedWeapon || null;
  } else {
    // Fallback : récupère les entités (mode legacy)
    [hero, equippedWeapon] = await Promise.all([
      context.Hero.getOrThrow(heroId, `Hero ${heroId} non trouvé pour le training`),
      // Récupère l'arme équipée en parallèle si elle existe
      context.Hero.get(heroId).then((h: any) => 
        h?.equippedWeapon_id ? context.Weapon.get(h.equippedWeapon_id) : null
      ),
    ]);
  }

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
    // Recalcule les stats (damage et rewards) avec le nouveau niveau
    await updateHeroStats(context, updatedHero, equippedWeapon);
  } else {
    // Pas de changement de niveau → juste mettre à jour les champs de training
    context.Hero.set(updatedHero);
  }
}