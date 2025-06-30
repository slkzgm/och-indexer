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
HeroArmory.Equipped.handlerWithLoader({
  loader: async ({ event, context }: { event: any; context: any }) => {
    const { heroId, weaponId } = event.params;

    if (context.isPreload) {
      // Premier run : charge toutes les entités nécessaires et fait les mises à jour simples
      const [hero, weapon] = await Promise.all([
        context.Hero.get(heroId.toString()),
        context.Weapon.get(weaponId.toString()),
      ]);

      // Charge l'ancienne arme si nécessaire
      const oldWeapon = hero?.equippedWeapon_id
        ? await context.Weapon.get(hero.equippedWeapon_id)
        : null;

      // Déséquipe l'ancienne arme directement dans le loader si elle existe
      if (oldWeapon) {
        await context.Weapon.set({
          ...oldWeapon,
          equipped: false,
          equippedHeroId: undefined,
        });
      }

      // Équipe la nouvelle arme directement dans le loader
      if (weapon) {
        await context.Weapon.set({
          ...weapon,
          equipped: true,
          equippedHeroId: heroId.toString(),
        });
      }

      return { hero, weapon, oldWeapon, preUpdated: true };
    } else {
      // Second run : récupération simple des entités
      const [hero, weapon] = await Promise.all([
        context.Hero.get(heroId.toString()),
        context.Weapon.get(weaponId.toString()),
      ]);

      const oldWeapon = hero?.equippedWeapon_id
        ? await context.Weapon.get(hero.equippedWeapon_id)
        : null;

      return { hero, weapon, oldWeapon, preUpdated: false };
    }
  },

  handler: async ({ event, context, loaderReturn }: { event: any; context: any; loaderReturn: any }) => {
    const { heroId, weaponId } = event.params;

    let { hero, weapon, oldWeapon, preUpdated } = loaderReturn as { 
      hero: any | null; 
      weapon: any | null; 
      oldWeapon: any | null;
      preUpdated: boolean;
    };

    // Fallbacks si nécessaire
    if (!hero || !weapon) {
      const [resolvedHero, resolvedWeapon] = await Promise.all([
        hero ? Promise.resolve(hero) : context.Hero.getOrThrow(heroId.toString(), `Hero ${heroId} non trouvé`),
        weapon ? Promise.resolve(weapon) : context.Weapon.getOrThrow(weaponId.toString(), `Weapon ${weaponId} non trouvée`),
      ]);
      hero = resolvedHero;
      weapon = resolvedWeapon;
    }

    const operations = [
      // Stocke toujours l'événement brut
      context.HeroArmory_Equipped.set({
        id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
        heroId,
        weaponId,
      })
    ];

    // Si les mises à jour n'ont pas été faites dans le loader, les faire maintenant
    if (!preUpdated) {
      // Déséquipe l'ancienne arme si elle existe
      if (oldWeapon) {
        operations.push(
          context.Weapon.set({
            ...oldWeapon,
            equipped: false,
            equippedHeroId: undefined,
          })
        );
      }

      // Équipe la nouvelle arme
      operations.push(
        context.Weapon.set({
          ...weapon,
          equipped: true,
          equippedHeroId: heroId.toString(),
        })
      );
    }

    // Met à jour le héro et recalcule ses stats (toujours nécessaire)
    operations.push(
      updateHeroStats(context, {
        ...hero,
        equippedWeapon_id: weaponId.toString(),
      }, weapon)
    );

    // Exécute toutes les opérations en parallèle
    await Promise.all(operations);
  },
});

/**
 * Handler pour HeroArmory.Unequipped
 * Déséquipe une arme d'un héro et recalcule ses stats
 */
HeroArmory.Unequipped.handlerWithLoader({
  loader: async ({ event, context }: { event: any; context: any }) => {
    const { heroId, weaponId } = event.params;

    if (context.isPreload) {
      // Premier run : charge et met à jour directement
      const [hero, weapon] = await Promise.all([
        context.Hero.get(heroId.toString()),
        context.Weapon.get(weaponId.toString()),
      ]);

      // Déséquipe l'arme directement dans le loader
      if (weapon) {
        await context.Weapon.set({
          ...weapon,
          equipped: false,
          equippedHeroId: undefined,
        });
      }

      return { hero, weapon, preUpdated: true };
    } else {
      // Second run : récupération simple
      const [hero, weapon] = await Promise.all([
        context.Hero.get(heroId.toString()),
        context.Weapon.get(weaponId.toString()),
      ]);

      return { hero, weapon, preUpdated: false };
    }
  },

  handler: async ({ event, context, loaderReturn }: { event: any; context: any; loaderReturn: any }) => {
    const { heroId, weaponId } = event.params;

    let { hero, weapon, preUpdated } = loaderReturn as { 
      hero: any | null; 
      weapon: any | null;
      preUpdated: boolean;
    };

    if (!hero || !weapon) {
      const [resolvedHero, resolvedWeapon] = await Promise.all([
        hero ? Promise.resolve(hero) : context.Hero.getOrThrow(heroId.toString(), `Hero ${heroId} non trouvé`),
        weapon ? Promise.resolve(weapon) : context.Weapon.getOrThrow(weaponId.toString(), `Weapon ${weaponId} non trouvée`),
      ]);
      hero = resolvedHero;
      weapon = resolvedWeapon;
    }

    const operations = [
      // Stocke l'événement brut
      context.HeroArmory_Unequipped.set({
        id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
        heroId,
        weaponId,
      }),
      
      // Met à jour les stats du héro (plus d'arme équipée)
      updateHeroStats(context, {
        ...hero,
        equippedWeapon_id: undefined,
      }, null)
    ];

    // Si pas encore déséquipée dans le loader, le faire maintenant
    if (!preUpdated && weapon) {
      operations.push(
        context.Weapon.set({
          ...weapon,
          equipped: false,
          equippedHeroId: undefined,
        })
      );
    }

    await Promise.all(operations);
  },
}); 