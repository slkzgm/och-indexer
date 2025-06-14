import {
  Blacksmith,
  Blacksmith_WeaponRepaired,
  Blacksmith_WeaponSharpened,
} from "generated";
import { updateWeaponAndHeroStats } from "../helpers/entities";

/**
 * Handler pour Blacksmith.WeaponRepaired
 * Répare une arme (remet durability à maxDurability et broken à false)
 * OPTIMISÉ : Pas de recalcul des stats car durability n'affecte pas les rewards
 */
Blacksmith.WeaponRepaired.handler(async ({ event, context }) => {
  const { weaponId, amount } = event.params;

  // Stocke l'événement brut
  const entity: Blacksmith_WeaponRepaired = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    weaponId,
    amount,
  };

  // PARALLELISATION : Stockage event + récupération de l'arme
  const [, weapon] = await Promise.all([
    context.Blacksmith_WeaponRepaired.set(entity),
    context.Weapon.getOrThrow(weaponId.toString(), `Weapon ${weaponId} non trouvée`),
  ]);

  // OPTIMISATION : Met à jour seulement l'arme (durability n'affecte pas les stats du héro)
  const updatedWeapon = {
    ...weapon,
    durability: weapon.maxDurability, // Remet à la durabilité max
    broken: false, // Plus cassée
  };
  
  context.Weapon.set(updatedWeapon);
});

/**
 * Handler pour Blacksmith.WeaponSharpened
 * Aiguise une arme (remet sharpness à maxSharpness)
 * IMPORTANT : Recalcule les rewards car sharpness affecte le bonus
 */
Blacksmith.WeaponSharpened.handler(async ({ event, context }) => {
  const { weaponId, amount } = event.params;

  // Stocke l'événement brut
  const entity: Blacksmith_WeaponSharpened = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    weaponId,
    amount,
  };

  // PARALLELISATION : Stockage event + récupération de l'arme
  const [, weapon] = await Promise.all([
    context.Blacksmith_WeaponSharpened.set(entity),
    context.Weapon.getOrThrow(weaponId.toString(), `Weapon ${weaponId} non trouvée`),
  ]);

  // IMPORTANT : Recalcule les rewards du héro car sharpness affecte les bonus
  await updateWeaponAndHeroStats(context, weapon, {
    sharpness: weapon.maxSharpness, // Remet à la sharpness max
  });
}); 