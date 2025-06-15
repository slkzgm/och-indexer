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

    // Charge hero et weapon en parallèle
    const [hero, weapon] = await Promise.all([
      context.Hero.get(heroId.toString()),
      context.Weapon.get(weaponId.toString()),
    ]);

    // Charge l'ancienne arme si l'info est déjà dispo
    const oldWeapon = hero?.equippedWeapon_id
      ? await context.Weapon.get(hero.equippedWeapon_id)
      : null;

    return { hero, weapon, oldWeapon };
  },

  handler: async ({ event, context, loaderReturn }: { event: any; context: any; loaderReturn: any }) => {
    const { heroId, weaponId } = event.params;

    let { hero, weapon, oldWeapon } = loaderReturn as { hero: any | null; weapon: any | null; oldWeapon: any | null };

    // Fallbacks manquants ← on les récupère en parallèle pour garder la perf
    if (!hero || !weapon) {
      const [resolvedHero, resolvedWeapon] = await Promise.all([
        hero ? Promise.resolve(hero) : context.Hero.getOrThrow(heroId.toString(), `Hero ${heroId} non trouvé`),
        weapon ? Promise.resolve(weapon) : context.Weapon.getOrThrow(weaponId.toString(), `Weapon ${weaponId} non trouvée`),
      ]);
      hero = resolvedHero;
      weapon = resolvedWeapon;
    }

    // Si oldWeapon pas encore chargée, on tente une récupération (non bloquante)
    if (!oldWeapon && hero.equippedWeapon_id) {
      oldWeapon = await context.Weapon.get(hero.equippedWeapon_id);
    }

    // Stocke l'événement brut
    const entity: HeroArmory_Equipped = {
      id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      heroId,
      weaponId,
    };
    context.HeroArmory_Equipped.set(entity);

    // Déséquipe l'ancienne arme si elle existe
    if (oldWeapon) {
      const updatedOldWeapon = {
        ...oldWeapon,
        equipped: false,
        equippedHeroId: undefined,
      };
      context.Weapon.set(updatedOldWeapon);
    }

    // Met à jour weapon + hero + recalcule stats
    await Promise.all([
      context.Weapon.set({
        ...weapon,
        equipped: true,
        equippedHeroId: heroId.toString(),
      }),
      updateHeroStats(context, {
        ...hero,
        equippedWeapon_id: weaponId.toString(),
      }, weapon),
    ]);
  },
});

/**
 * Handler pour HeroArmory.Unequipped
 * Déséquipe une arme d'un héro et recalcule ses stats
 */
HeroArmory.Unequipped.handlerWithLoader({
  loader: async ({ event, context }: { event: any; context: any }) => {
    const { heroId, weaponId } = event.params;

    const hero = await context.Hero.get(heroId.toString());
    const weapon = await context.Weapon.get(weaponId.toString());

    return { hero, weapon };
  },

  handler: async ({ event, context, loaderReturn }: { event: any; context: any; loaderReturn: any }) => {
    const { heroId, weaponId } = event.params;

    let { hero, weapon } = loaderReturn as { hero: any | null; weapon: any | null };

    if (!hero || !weapon) {
      const [resolvedHero, resolvedWeapon] = await Promise.all([
        hero ? Promise.resolve(hero) : context.Hero.getOrThrow(heroId.toString(), `Hero ${heroId} non trouvé`),
        weapon ? Promise.resolve(weapon) : context.Weapon.getOrThrow(weaponId.toString(), `Weapon ${weaponId} non trouvée`),
      ]);
      hero = resolvedHero;
      weapon = resolvedWeapon;
    }

    // Stocke l'événement brut
    const entity: HeroArmory_Unequipped = {
      id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      heroId,
      weaponId,
    };
    context.HeroArmory_Unequipped.set(entity);

    await Promise.all([
      context.Weapon.set({
        ...weapon,
        equipped: false,
        equippedHeroId: undefined,
      }),
      updateHeroStats(context, {
        ...hero,
        equippedWeapon_id: undefined,
      }, null),
    ]);
  },
}); 