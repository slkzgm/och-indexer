import {
  DragmaUnderlings,
} from "generated";
import { calculateUnstakeAvailable } from "../helpers/calculations";
import { updateWeaponAndHeroStats } from "../helpers/entities";
import { updatePlayerCounts } from "../helpers/player";
import { getOrCreateDragmaUnderlingsGlobalStats, getOrCreateDragmaUnderlingsUserStats } from "../helpers/stats";
import { createActivity } from "../helpers/activity";

/**
 * Handler pour DragmaUnderlings.Staked
 * Stake un héro pour gagner des rewards
 */
DragmaUnderlings.Staked.handlerWithLoader({
  loader: async ({ event, context }: { event: any; context: any }) => {
    const { heroId } = event.params;
    
    if (context.isPreload) {
      // Premier run : charge le héro (doit exister)
      const hero = await context.Hero.get(heroId.toString());
      return { hero };
    } else {
      // Second run : récupération optimisée
      const hero = await context.Hero.get(heroId.toString());
      return { hero };
    }
  },

  handler: async ({ event, context, loaderReturn }: { event: any; context: any; loaderReturn: any }) => {
    const { user, heroId } = event.params;
    const timestamp = BigInt(event.block.timestamp);

    const { hero } = loaderReturn as { hero: any | null };
    const existingHero = hero ?? await context.Hero.getOrThrow(heroId.toString(), `Hero ${heroId} non trouvé`);

    // Parallélisation : Stockage event + mise à jour Hero
    const stakedHero = {
      ...existingHero,
      staked: true,
      stakingType: "DRAGMA_UNDERLINGS" as const,
      stakedTimestamp: timestamp,
      unstakeAvailableTimestamp: calculateUnstakeAvailable(timestamp),
      lastClaimTimestamp: timestamp,
      revealed: true, // Mark as revealed on first staking
    };
    await Promise.all([
      // Stocke l'événement brut
      context.DragmaUnderlings_Staked.set({
        id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
        user,
        heroId,
      }),
      // Met à jour le héro : staking activé + revealed
      context.Hero.set(stakedHero),
      (async () => {
        if (!existingHero.staked) {
          const global = await getOrCreateDragmaUnderlingsGlobalStats(context);
          global.totalStakedHeroes += 1;
          global.currentStakedHeroes += 1;
          global.heroesByLevel[existingHero.level] += 1;
          global.lastUpdated = timestamp;
          context.DragmaUnderlingsGlobalStats.set(global);

          const userStats = await getOrCreateDragmaUnderlingsUserStats(context, user.toLowerCase());
          userStats.totalStakes += 1;
          userStats.stakedHeroes += 1;
          userStats.currentStakedHeroes += 1;
          userStats.heroesByLevel[existingHero.level] += 1;
          context.DragmaUnderlingsUserStats.set(userStats);
        }
        await createActivity(context, `${event.chainId}_${event.block.number}_${event.logIndex}`, timestamp, user, 'DRAGMA_UNDERLINGS_STAKE', { heroId: heroId.toString() }, heroId.toString(), 'DragmaUnderlings', 'DRAGMA_UNDERLINGS');
      })()
    ]);
    if (!existingHero.staked) {
      await updatePlayerCounts(context, existingHero.owner_id, { stakedHeroCount: 1 });
    }
    const updatedHeroWithCounts = {
      ...stakedHero,
      totalStakes: stakedHero.totalStakes + 1,
    };
    context.Hero.set(updatedHeroWithCounts);
  },
});

/**
 * Handler pour DragmaUnderlings.Unstaked
 * Unstake un héro (arrête les rewards)
 */
DragmaUnderlings.Unstaked.handlerWithLoader({
  loader: async ({ event, context }: { event: any; context: any }) => {
    const { heroId } = event.params;
    
    if (context.isPreload) {
      const hero = await context.Hero.get(heroId.toString());
      return { hero };
    } else {
      const hero = await context.Hero.get(heroId.toString());
      return { hero };
    }
  },

  handler: async ({ event, context, loaderReturn }: { event: any; context: any; loaderReturn: any }) => {
    const { user, heroId } = event.params;
    const timestamp = BigInt(event.block.timestamp);

    const { hero } = loaderReturn as { hero: any | null };
    const existingHero = hero ?? await context.Hero.getOrThrow(heroId.toString(), `Hero ${heroId} non trouvé`);

    // Parallélisation optimisée
    const unstakedHero = {
      ...existingHero,
      staked: false,
      stakingType: undefined,
      stakedTimestamp: 0n,
      unstakeAvailableTimestamp: 0n,
      lastClaimTimestamp: 0n,
    };
    await Promise.all([
      // Stocke l'événement brut
      context.DragmaUnderlings_Unstaked.set({
        id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
        user,
        heroId,
      }),
      // Met à jour le héro : staking désactivé
      context.Hero.set(unstakedHero),
      (async () => {
        if (existingHero.staked) {
          const duration = timestamp - (existingHero.stakedTimestamp || 0n);
          const global = await getOrCreateDragmaUnderlingsGlobalStats(context);
          global.totalUnstakedHeroes += 1;
          global.totalStakedHeroes -= 1;
          global.currentStakedHeroes -= 1;
          global.heroesByLevel[existingHero.level] -= 1;
          global.lastUpdated = timestamp;
          context.DragmaUnderlingsGlobalStats.set(global);

          const userStats = await getOrCreateDragmaUnderlingsUserStats(context, user.toLowerCase());
          const prevCount = BigInt(userStats.totalUnstakes);
          const newTotalUnstakes = prevCount + 1n; // Since we're incrementing after
          userStats.totalUnstakes = Number(newTotalUnstakes);
          userStats.stakedHeroes -= 1;
          userStats.currentStakedHeroes -= 1;
          userStats.heroesByLevel[existingHero.level] -= 1;
          const prevTotal = prevCount;
          userStats.averageStakingDuration = prevCount > 0n ? (userStats.averageStakingDuration * prevTotal + duration) / newTotalUnstakes : duration;
          context.DragmaUnderlingsUserStats.set(userStats);
        }
        await createActivity(context, `${event.chainId}_${event.block.number}_${event.logIndex}`, timestamp, user, 'DRAGMA_UNDERLINGS_UNSTAKE', { heroId: heroId.toString() }, heroId.toString(), 'DRAGMA_UNDERLINGS');
      })()
    ]);
    if (existingHero.staked) {
      await updatePlayerCounts(context, existingHero.owner_id, { stakedHeroCount: -1 });
    }
    const updatedHeroWithCounts = {
      ...unstakedHero,
      totalUnstakes: unstakedHero.totalUnstakes + 1,
      totalStakingDuration: unstakedHero.totalStakingDuration + (timestamp - (existingHero.stakedTimestamp || 0n)),
    };
    context.Hero.set(updatedHeroWithCounts);
  },
});

/**
 * Handler pour DragmaUnderlings.Claimed
 * Claim les rewards d'un héro
 */
DragmaUnderlings.Claimed.handlerWithLoader({
  loader: async ({ event, context }: { event: any; context: any }) => {
    const { heroId } = event.params;
    
    if (context.isPreload) {
      const hero = await context.Hero.get(heroId.toString());
      return { hero };
    } else {
      const hero = await context.Hero.get(heroId.toString());
      return { hero };
    }
  },

  handler: async ({ event, context, loaderReturn }: { event: any; context: any; loaderReturn: any }) => {
    const { user, heroId, amount } = event.params;
    const timestamp = BigInt(event.block.timestamp);

    const { hero } = loaderReturn as { hero: any | null };
    const existingHero = hero ?? await context.Hero.getOrThrow(heroId.toString(), `Hero ${heroId} non trouvé`);

    // Parallélisation optimisée
    await Promise.all([
      // Stocke l'événement brut
      context.DragmaUnderlings_Claimed.set({
        id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
        user,
        heroId,
        amount,
      }),
      
      (async () => {
        const global = await getOrCreateDragmaUnderlingsGlobalStats(context);
        global.totalRewardsClaimed += amount;
        global.totalClaims += 1;
        global.averageClaimAmount = global.totalClaims > 0 ? global.totalRewardsClaimed / BigInt(global.totalClaims) : 0n;
        global.lastUpdated = timestamp;
        context.DragmaUnderlingsGlobalStats.set(global);

        const userStats = await getOrCreateDragmaUnderlingsUserStats(context, user.toLowerCase());
        userStats.totalRewardsClaimed += amount;
        userStats.totalClaims += 1;
        context.DragmaUnderlingsUserStats.set(userStats);

        // Mise à jour complète du hero en une seule fois
        context.Hero.set({
          ...existingHero,
          lastClaimTimestamp: timestamp,
          totalRewardsClaimed: existingHero.totalRewardsClaimed + amount,
          totalClaims: existingHero.totalClaims + 1,
        });
        await createActivity(context, `${event.chainId}_${event.block.number}_${event.logIndex}`, timestamp, user, 'DRAGMA_UNDERLINGS_CLAIM', { heroId: heroId.toString(), amount: amount.toString() }, heroId.toString(), 'DRAGMA_UNDERLINGS');
      })()
    ]);
  },
});

/**
 * Handler pour DragmaUnderlings.WeaponDurabilityUpdated
 * Met à jour la durability d'une arme (peut la casser si durability = 0)
 * OPTIMISÉ : Pas de recalcul des stats car durability n'affecte pas les rewards
 */
DragmaUnderlings.WeaponDurabilityUpdated.handlerWithLoader({
  loader: async ({ event, context }: { event: any; context: any }) => {
    const { weaponId, newDurability } = event.params;
    
    if (context.isPreload) {
      // Premier run : charge l'arme et peut faire une mise à jour simple
      const weapon = await context.Weapon.get(weaponId.toString());
      
      // OPTIMISATION AVANCÉE: Peut faire la mise à jour directement dans le loader
      // si c'est une opération simple (durability n'affecte pas les calculs complexes)
      if (weapon) {
        const newDurabilityNum = Number(newDurability);
        await context.Weapon.set({
          ...weapon,
          durability: newDurabilityNum,
          broken: newDurabilityNum === 0,
        });
        return { weapon, updated: true };
      }
      
      return { weapon, updated: false };
    } else {
      // Second run : juste récupération
      const weapon = await context.Weapon.get(weaponId.toString());
      return { weapon, updated: false };
    }
  },

  handler: async ({ event, context, loaderReturn }: { event: any; context: any; loaderReturn: any }) => {
    const { user, weaponId, oldDurability, newDurability } = event.params;

    const { weapon, updated } = loaderReturn as { weapon: any | null; updated: boolean };

    // Stocke toujours l'événement brut
    await context.DragmaUnderlings_WeaponDurabilityUpdated.set({
      id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      user,
      weaponId,
      oldDurability,
      newDurability,
    });

    // Si pas encore mis à jour dans le loader, le faire maintenant
    if (!updated) {
      const existingWeapon = weapon ?? await context.Weapon.getOrThrow(weaponId.toString(), `Weapon ${weaponId} non trouvée`);
      
      const newDurabilityNum = Number(newDurability);
      await context.Weapon.set({
        ...existingWeapon,
        durability: newDurabilityNum,
        broken: newDurabilityNum === 0,
      });
      await createActivity(context, `${event.chainId}_${event.block.number}_${event.logIndex}`, BigInt(event.block.timestamp), user, 'DURABILITY_UPDATE', { weaponId: weaponId.toString(), oldDurability: oldDurability.toString(), newDurability: newDurability.toString() }, undefined); // Pas de heroId direct, mais optionnel
    }
  },
});

/**
 * Handler pour DragmaUnderlings.WeaponSharpnessUpdated
 * Met à jour la sharpness d'une arme (affecte les rewards du héro)
 */
DragmaUnderlings.WeaponSharpnessUpdated.handlerWithLoader({
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
    const { user, weaponId, oldSharpness, newSharpness } = event.params;

    const { weapon, hero } = loaderReturn as { weapon: any | null; hero: any | null };
    const existingWeapon = weapon ?? await context.Weapon.getOrThrow(weaponId.toString(), `Weapon ${weaponId} non trouvée`);

    // Parallélisation : Stockage event + mise à jour weapon+hero
    await Promise.all([
      // Stocke l'événement brut
      context.DragmaUnderlings_WeaponSharpnessUpdated.set({
        id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
        user,
        weaponId,
        oldSharpness,
        newSharpness,
      }),
      
      // Met à jour la sharpness ET recalcule les rewards
      updateWeaponAndHeroStats(context, existingWeapon, {
        sharpness: Number(newSharpness),
      }, hero)
    ]);
    await createActivity(context, `${event.chainId}_${event.block.number}_${event.logIndex}`, BigInt(event.block.timestamp), user, 'SHARPNESS_UPDATE', { weaponId: weaponId.toString(), oldSharpness: oldSharpness.toString(), newSharpness: newSharpness.toString() }, undefined);
  },
}); 