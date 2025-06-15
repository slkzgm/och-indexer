import {
  HeroArmory,
  HeroArmory_Equipped,
  HeroArmory_Unequipped,
} from "generated";
import { updateHeroStats } from "../helpers/entities";

/**
 * Handler pour HeroArmory.Equipped
 * Équipe une arme à un héro et recalcule ses stats
 */
HeroArmory.Equipped.handler(async ({ event, context }) => {
  const { heroId, weaponId } = event.params;

  // Stocke l'événement brut
  const entity: HeroArmory_Equipped = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    heroId,
    weaponId,
  };

  // PARALLELISATION : Stockage event + récupération des entités + ancienne arme si nécessaire
  const [, hero, weapon, oldWeapon] = await Promise.all([
    context.HeroArmory_Equipped.set(entity),
    context.Hero.getOrThrow(heroId.toString(), `Hero ${heroId} non trouvé`),
    context.Weapon.getOrThrow(weaponId.toString(), `Weapon ${weaponId} non trouvée`),
    // Récupère l'ancienne arme en parallèle si elle existe
    context.Hero.get(heroId.toString()).then(h => 
      h?.equippedWeapon_id ? context.Weapon.get(h.equippedWeapon_id) : null
    ),
  ]);

  // Déséquipe l'ancienne arme si elle existe
  if (oldWeapon) {
    const updatedOldWeapon = {
      ...oldWeapon,
      equipped: false,
      equippedHeroId: undefined, // Plus équipée par personne
    };
    context.Weapon.set(updatedOldWeapon);
  }

  // PARALLELISATION : Met à jour weapon + hero + recalcule stats
  await Promise.all([
    // Met à jour la weapon comme équipée avec l'ID du héros
    context.Weapon.set({
      ...weapon,
      equipped: true,
      equippedHeroId: heroId.toString(),
    }),
    
    // Met à jour le hero avec la nouvelle weapon et recalcule ses stats
    updateHeroStats(context, {
      ...hero,
      equippedWeapon_id: weaponId.toString(),
    }, weapon),
  ]);
});

/**
 * Handler pour HeroArmory.Unequipped
 * Déséquipe une arme d'un héro et recalcule ses stats
 */
HeroArmory.Unequipped.handler(async ({ event, context }) => {
  const { heroId, weaponId } = event.params;

  // Stocke l'événement brut
  const entity: HeroArmory_Unequipped = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    heroId,
    weaponId,
  };

  // PARALLELISATION : Stockage event + récupération des entités
  const [, hero, weapon] = await Promise.all([
    context.HeroArmory_Unequipped.set(entity),
    context.Hero.getOrThrow(heroId.toString(), `Hero ${heroId} non trouvé`),
    context.Weapon.getOrThrow(weaponId.toString(), `Weapon ${weaponId} non trouvée`),
  ]);

  // PARALLELISATION : Met à jour weapon + hero + recalcule stats
  await Promise.all([
    // Met à jour la weapon comme déséquipée
    context.Weapon.set({
      ...weapon,
      equipped: false,
      equippedHeroId: undefined, // Plus équipée par personne
    }),
    
    // Met à jour le hero sans weapon et recalcule ses stats (damage = 0)
    updateHeroStats(context, {
      ...hero,
      equippedWeapon_id: undefined,
    }, null),
  ]);
}); 