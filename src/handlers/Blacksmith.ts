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
    
    if (context.isPreload) {
      // Premier run : charge l'arme et fait la mise à jour directement
      const weapon = await context.Weapon.get(weaponId.toString());
      
      if (weapon) {
        // Répare l'arme directement dans le loader (simple mise à jour)
        await context.Weapon.set({
          ...weapon,
          durability: weapon.maxDurability,
          broken: false,
        });
        return { weapon, updated: true };
      }
      
      return { weapon, updated: false };
    } else {
      // Second run : récupération simple
      const weapon = await context.Weapon.get(weaponId.toString());
      return { weapon, updated: false };
    }
  },

  handler: async ({ event, context, loaderReturn }: { event: any; context: any; loaderReturn: any }) => {
    const { weaponId } = event.params;
    const { weapon, updated } = loaderReturn as { weapon: any | null; updated: boolean };

    // Si pas encore mis à jour dans le loader, le faire maintenant
    if (!updated && weapon) {
      await context.Weapon.set({
        ...weapon,
        durability: weapon.maxDurability,
        broken: false,
      });
    }

    // Note: Pas de recalcul des rewards car durability n'affecte pas les bonus
  },
});

/**
 * Handler pour Blacksmith.WeaponSharpened
 * Aiguise une arme (remet sharpness à maxSharpness)
 * IMPORTANT : Recalcule les rewards car sharpness affecte le bonus
 */
Blacksmith.WeaponSharpened.handlerWithLoader({
  loader: async ({ event, context }: { event: any; context: any }) => {
    const { weaponId } = event.params;
    
    if (context.isPreload) {
      // Premier run : charge weapon et hero équipé en parallèle
      const weapon = await context.Weapon.get(weaponId.toString());

      let hero: any | null = null;
      if (weapon && weapon.equipped && weapon.equippedHeroId) {
        hero = await context.Hero.get(weapon.equippedHeroId);
      }

      return { weapon, hero };
    } else {
      // Second run : récupération optimisée
      const weapon = await context.Weapon.get(weaponId.toString());
      let hero: any | null = null;
      if (weapon && weapon.equipped && weapon.equippedHeroId) {
        hero = await context.Hero.get(weapon.equippedHeroId);
      }
      return { weapon, hero };
    }
  },

  handler: async ({ event, context, loaderReturn }: { event: any; context: any; loaderReturn: any }) => {
    const { weaponId } = event.params;
    const { weapon, hero } = loaderReturn as { weapon: any | null; hero: any | null };

    if (!weapon) {
      console.warn(`Weapon ${weaponId} non trouvée pour WeaponSharpened`);
      return;
    }

    // Met à jour la sharpness ET recalcule les rewards (sharpness affecte les bonus)
    await updateWeaponAndHeroStats(context, weapon, {
      sharpness: weapon.maxSharpness,
    }, hero);
  },
}); 