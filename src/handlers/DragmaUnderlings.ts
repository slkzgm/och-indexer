import {
  DragmaUnderlings,
  DragmaUnderlings_Claimed,
  DragmaUnderlings_Staked,
  DragmaUnderlings_Unstaked,
  DragmaUnderlings_WeaponDurabilityUpdated,
  DragmaUnderlings_WeaponSharpnessUpdated,
} from "generated";
import { calculateUnstakeAvailable } from "../helpers/calculations";
import { updateWeaponAndHeroStats } from "../helpers/entities";

/**
 * Handler pour DragmaUnderlings.Staked
 * Stake un héro pour gagner des rewards
 */
DragmaUnderlings.Staked.handlerWithLoader({
  loader: async ({ event, context }: { event: any; context: any }) => {
    const { heroId } = event.params;
    const hero = await context.Hero.get(heroId.toString());
    return { hero };
  },

  handler: async ({ event, context, loaderReturn }: { event: any; context: any; loaderReturn: any }) => {
    const { user, heroId } = event.params;
    const timestamp = BigInt(event.block.timestamp);

    const { hero } = loaderReturn as { hero: any | null };

    const existingHero = hero ?? await context.Hero.getOrThrow(heroId.toString(), `Hero ${heroId} non trouvé`);

    // Stocke l'événement brut
    const entity: DragmaUnderlings_Staked = {
      id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      user,
      heroId,
    };
    context.DragmaUnderlings_Staked.set(entity);

    // Met à jour le héro : staking activé
    const updatedHero = {
      ...existingHero,
      staked: true,
      stakingType: "DRAGMA_UNDERLINGS" as const,
      stakedTimestamp: timestamp,
      unstakeAvailableTimestamp: calculateUnstakeAvailable(timestamp),
      lastClaimTimestamp: timestamp,
    };

    context.Hero.set(updatedHero);
  },
});

/**
 * Handler pour DragmaUnderlings.Unstaked
 * Unstake un héro (arrête les rewards)
 */
DragmaUnderlings.Unstaked.handlerWithLoader({
  loader: async ({ event, context }: { event: any; context: any }) => {
    const { heroId } = event.params;
    const hero = await context.Hero.get(heroId.toString());
    return { hero };
  },

  handler: async ({ event, context, loaderReturn }: { event: any; context: any; loaderReturn: any }) => {
    const { user, heroId } = event.params;

    const { hero } = loaderReturn as { hero: any | null };
    const existingHero = hero ?? await context.Hero.getOrThrow(heroId.toString(), `Hero ${heroId} non trouvé`);

    // Stocke l'événement brut
    const entity: DragmaUnderlings_Unstaked = {
      id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      user,
      heroId,
    };
    context.DragmaUnderlings_Unstaked.set(entity);

    // Met à jour le héro : staking désactivé
    const updatedHero = {
      ...existingHero,
      staked: false,
      stakingType: undefined,
      stakedTimestamp: undefined,
      unstakeAvailableTimestamp: undefined,
      lastClaimTimestamp: undefined,
    };

    context.Hero.set(updatedHero);
  },
});

/**
 * Handler pour DragmaUnderlings.Claimed
 * Claim les rewards d'un héro
 */
DragmaUnderlings.Claimed.handlerWithLoader({
  loader: async ({ event, context }: { event: any; context: any }) => {
    const { heroId } = event.params;
    const hero = await context.Hero.get(heroId.toString());
    return { hero };
  },

  handler: async ({ event, context, loaderReturn }: { event: any; context: any; loaderReturn: any }) => {
    const { user, heroId, amount } = event.params;
    const timestamp = BigInt(event.block.timestamp);

    const { hero } = loaderReturn as { hero: any | null };
    const existingHero = hero ?? await context.Hero.getOrThrow(heroId.toString(), `Hero ${heroId} non trouvé`);

    // Stocke l'événement brut
    const entity: DragmaUnderlings_Claimed = {
      id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      user,
      heroId,
      amount,
    };
    context.DragmaUnderlings_Claimed.set(entity);

    // Met à jour le timestamp du dernier claim
    const updatedHero = {
      ...existingHero,
      lastClaimTimestamp: timestamp,
    };

    context.Hero.set(updatedHero);
  },
});

/**
 * Handler pour DragmaUnderlings.WeaponDurabilityUpdated
 * Met à jour la durability d'une arme (peut la casser si durability = 0)
 * OPTIMISÉ : Pas de recalcul des stats car durability n'affecte pas les rewards
 */
DragmaUnderlings.WeaponDurabilityUpdated.handlerWithLoader({
  loader: async ({ event, context }: { event: any; context: any }) => {
    const { weaponId } = event.params;
    const weapon = await context.Weapon.get(weaponId.toString());
    return { weapon };
  },

  handler: async ({ event, context, loaderReturn }: { event: any; context: any; loaderReturn: any }) => {
    const { user, weaponId, oldDurability, newDurability } = event.params;

    const { weapon } = loaderReturn as { weapon: any | null };
    const existingWeapon = weapon ?? await context.Weapon.getOrThrow(weaponId.toString(), `Weapon ${weaponId} non trouvée`);

    // Stocke l'événement brut
    const entity: DragmaUnderlings_WeaponDurabilityUpdated = {
      id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      user,
      weaponId,
      oldDurability,
      newDurability,
    };
    context.DragmaUnderlings_WeaponDurabilityUpdated.set(entity);

    // Met à jour seulement l'arme (durability n'affecte pas les rewards)
    const newDurabilityNum = Number(newDurability);
    const updatedWeapon = {
      ...existingWeapon,
      durability: newDurabilityNum,
      broken: newDurabilityNum === 0,
    };

    context.Weapon.set(updatedWeapon);
  },
});

/**
 * Handler pour DragmaUnderlings.WeaponSharpnessUpdated
 * Met à jour la sharpness d'une arme (affecte les rewards du héro)
 */
DragmaUnderlings.WeaponSharpnessUpdated.handlerWithLoader({
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
    const { user, weaponId, oldSharpness, newSharpness } = event.params;

    const { weapon, hero } = loaderReturn as { weapon: any | null; hero: any | null };
    const existingWeapon = weapon ?? await context.Weapon.getOrThrow(weaponId.toString(), `Weapon ${weaponId} non trouvée`);

    // Stocke l'événement brut
    const entity: DragmaUnderlings_WeaponSharpnessUpdated = {
      id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      user,
      weaponId,
      oldSharpness,
      newSharpness,
    };
    context.DragmaUnderlings_WeaponSharpnessUpdated.set(entity);

    // Met à jour la sharpness ET recalcule les rewards
    await updateWeaponAndHeroStats(context, existingWeapon, {
      sharpness: Number(newSharpness),
    }, hero);
  },
}); 