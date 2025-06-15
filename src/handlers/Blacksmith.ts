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
Blacksmith.WeaponRepaired.handlerWithLoader({
  loader: async ({ event, context }: { event: any; context: any }) => {
    const { weaponId } = event.params;
    const weapon = await context.Weapon.get(weaponId.toString());
    return { weapon };
  },
  handler: async ({ event, context, loaderReturn }: { event: any; context: any; loaderReturn: any }) => {
    const { weaponId, amount } = event.params;

    const { weapon } = loaderReturn as { weapon: any | null };

    const resolvedWeapon = weapon ?? await context.Weapon.getOrThrow(weaponId.toString(), `Weapon ${weaponId} non trouvée`);

    // Stockage event
    const entity: Blacksmith_WeaponRepaired = {
      id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      weaponId,
      amount,
    };

    // OPTIMISATION : Met à jour seulement l'arme (durability n'affecte pas les stats du héro)
    const updatedWeapon = {
      ...resolvedWeapon,
      durability: resolvedWeapon.maxDurability, // Remet à la durabilité max
      broken: false, // Plus cassée
    };
    
    context.Weapon.set(updatedWeapon);
  }
});

/**
 * Handler pour Blacksmith.WeaponSharpened
 * Aiguise une arme (remet sharpness à maxSharpness)
 * IMPORTANT : Recalcule les rewards car sharpness affecte le bonus
 */
Blacksmith.WeaponSharpened.handlerWithLoader({
  loader: async ({ event, context }: { event: any; context: any }) => {
    const { weaponId } = event.params;
    const weapon = await context.Weapon.get(weaponId.toString());

    let hero: any | null = null;
    if (weapon && weapon.equipped && weapon.equippedHeroId) {
      hero = await context.Hero.get(weapon.equippedHeroId);
    }
    return { weapon, hero };
  },
  handler: async ({ event, context, loaderReturn }: { event: any; context: any; loaderReturn: any }) => {
    const { weaponId, amount } = event.params;

    const { weapon, hero } = loaderReturn as { weapon: any | null; hero: any | null };

    const resolvedWeapon = weapon ?? await context.Weapon.getOrThrow(weaponId.toString(), `Weapon ${weaponId} non trouvée`);

    // Stocke l'événement brut
    const entity: Blacksmith_WeaponSharpened = {
      id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      weaponId,
      amount,
    };

    await context.Blacksmith_WeaponSharpened.set(entity);

    await updateWeaponAndHeroStats(context, resolvedWeapon, {
      sharpness: resolvedWeapon.maxSharpness,
    }, hero);
  }
}); 