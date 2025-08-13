import {
  Fishing,
} from "generated";
import { setHeroFishingStaked } from "../helpers/entities";
import { ensureHeroRevealed } from "../helpers/hero";
import { updatePlayerCounts, updatePlayerTotalSpent } from "../helpers/player";
import { getOrCreateFishingGlobalStats, getOrCreateFishingUserStats } from "../helpers/stats";
import { createActivity } from "../helpers/activity";
import { getFishingStakingType, getFishingZoneFromStakingType, calculateFishingFreeReviveAvailable } from "../helpers/calculations";

/**
 * Handler pour Fishing.Staked
 * Stake un héro pour faire de la pêche
 */
Fishing.Staked.handlerWithLoader({
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
    const { owner, heroId, zone, fee } = event.params;
    const timestamp = BigInt(event.block.timestamp);

    const { hero } = loaderReturn as { hero: any | null };
    const existingHero = hero ?? await context.Hero.getOrThrow(heroId.toString(), `Hero ${heroId} non trouvé`);

    // Parallélisation : Stockage event + mise à jour Hero
    await Promise.all([
      // Stocke l'événement brut
      context.Fishing_Staked.set({
        id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
        owner,
        heroId,
        zone,
        fee,
      }),
    ]);
    let stakedHero = await setHeroFishingStaked(context, existingHero, zone, timestamp, { persist: false });
    stakedHero = await ensureHeroRevealed(context, {
      hero: stakedHero,
      user: owner,
      timestamp,
      contract: 'Fishing',
      stakingType: getFishingStakingType(zone),
      persist: false
    });
    if (!existingHero.staked) {
      await updatePlayerCounts(context, existingHero.owner_id, { stakedHeroCount: 1 });
    }

    // Stats et activité
    const zoneNum = Number(zone);
    const global = await getOrCreateFishingGlobalStats(context);
    if (!existingHero.staked) {
      global.totalHeroesPerZone[zoneNum] += 1;
      global.totalHeroes += 1;
      global.currentActiveStaked += 1;
      global.currentActiveStakedPerZone[zoneNum] += 1;
      global.totalStakes += 1;
      global.heroesByLevel[stakedHero.level] += 1;
      global.heroesByLevelPerZone[zoneNum][stakedHero.level] += 1;
      global.stakesByLevelPerZone[zoneNum][stakedHero.level] += 1;
      global.currentActiveByLevelPerZone[zoneNum][stakedHero.level] += 1;
      if (global.currentTotalByLevel) {
        global.currentTotalByLevel[stakedHero.level] += 1;
      }
    }
    global.totalFeesPerZone[zoneNum] += fee;
    global.lastUpdated = timestamp;
    context.FishingGlobalStats.set(global);

    const userStats = await getOrCreateFishingUserStats(context, owner.toLowerCase());
    userStats.heroesPerZone[zoneNum] += 1;
    userStats.totalHeroes += 1;
    userStats.currentActiveStaked += 1;
    userStats.currentActiveStakedPerZone[zoneNum] += 1;
    userStats.totalStakes += 1;
    userStats.heroesByLevel[stakedHero.level] += 1;
    userStats.heroesByLevelPerZone[zoneNum][stakedHero.level] += 1;
    userStats.stakesByLevelPerZone[zoneNum][stakedHero.level] += 1;
    userStats.currentActiveByLevelPerZone[zoneNum][stakedHero.level] += 1;
    if (userStats.currentTotalByLevel) {
      userStats.currentTotalByLevel[stakedHero.level] += 1;
    }
    userStats.feesPerZone[zoneNum] += fee;
    userStats.totalFees += fee;
    userStats.totalSessionsPerZone[zoneNum] += 1;
    context.FishingUserStats.set(userStats);
    
    // Met à jour le totalSpent du joueur avec les fees de staking
    await updatePlayerTotalSpent(context, owner, fee);

    const updatedHero = {...stakedHero, totalFishingSessions: stakedHero.totalFishingSessions + 1, fishingSessionsPerZone: stakedHero.fishingSessionsPerZone.map((val: number, idx: number) => idx === zoneNum ? val + 1 : val), totalFishingFees: stakedHero.totalFishingFees + fee};
    context.Hero.set(updatedHero);

    const id = `${event.chainId}_${event.block.number}_${event.logIndex}`;
    const stakingType = getFishingStakingType(zone);
    await createActivity(context, id, timestamp, owner, 'FISHING_STAKE', {fee: fee.toString(), zone: stakingType}, existingHero.id, 'Fishing', stakingType);
  },
});

/**
 * Handler pour Fishing.UnstakeRequested
 * Demande d'unstake pour un héro en fishing (nécessite un VRF)
 */
Fishing.UnstakeRequested.handlerWithLoader({
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
    const { owner, heroId, requestId } = event.params;

    const { hero } = loaderReturn as { hero: any | null };
    const existingHero = hero ?? await context.Hero.getOrThrow(heroId.toString(), `Hero ${heroId} non trouvé`);

    // Stocke l'événement brut
    await context.Fishing_UnstakeRequested.set({
      id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      owner,
      heroId,
      requestId,
    });

    // Pour l'instant, on ne change pas le statut du héro car l'unstake n'est que demandé
    // Le héro reste staked jusqu'à l'événement Unstaked final
  },
});

/**
 * Handler pour Fishing.Unstaked
 * Unstake final avec récompenses de fishing
 */
Fishing.Unstaked.handlerWithLoader({
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
    const { owner, heroId, requestId, zone, amount, weaponShardId, bonusId } = event.params;

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
      context.Fishing_Unstaked.set({
        id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
        owner,
        heroId,
        requestId,
        zone,
        amount,
        weaponShardId,
        bonusId,
      }),
      // Met à jour le héro : staking désactivé
      context.Hero.set(unstakedHero)
    ]);
    if (existingHero.staked) {
      await updatePlayerCounts(context, existingHero.owner_id, { stakedHeroCount: -1 });
    }

    // Stats et activité
    const zoneNum = Number(zone);
    const global = await getOrCreateFishingGlobalStats(context);
    global.totalHeroesPerZone[zoneNum] -= 1;
    global.totalHeroes -= 1;
    global.currentActiveStaked -= 1;
    global.currentActiveStakedPerZone[zoneNum] -= 1;
    global.totalUnstakes += 1;
    global.completedSessions += 1;
    global.completedSessionsPerZone[zoneNum] += 1;
    global.heroesByLevel[existingHero.level] -= 1;
    global.heroesByLevelPerZone[zoneNum][existingHero.level] -= 1;
    global.unstakesByLevelPerZone[zoneNum][existingHero.level] += 1;
    global.completedByLevelPerZone[zoneNum][existingHero.level] += 1;
    global.currentActiveByLevelPerZone[zoneNum][existingHero.level] -= 1;
    if (global.currentTotalByLevel) {
      global.currentTotalByLevel[existingHero.level] -= 1;
    }
    global.rewardsPerZone[zoneNum] += amount;
    global.totalRewardsAmount += amount;
    if (weaponShardId > 0n) {
      global.shardsPerZone[zoneNum] += 1;
      global.totalShardsWon += 1;
    }
    if (bonusId > 0n) {
      global.bonusesPerZone[zoneNum] += 1;
      global.totalBonuses += 1;
    }
    global.lastUpdated = BigInt(event.block.timestamp);
    context.FishingGlobalStats.set(global);

    const userStats = await getOrCreateFishingUserStats(context, owner.toLowerCase());
    userStats.heroesPerZone[zoneNum] -= 1;
    userStats.totalHeroes -= 1;
    userStats.currentActiveStaked -= 1;
    userStats.currentActiveStakedPerZone[zoneNum] -= 1;
    userStats.totalUnstakes += 1;
    userStats.completedSessions += 1;
    userStats.completedSessionsPerZone[zoneNum] += 1;
    userStats.heroesByLevel[existingHero.level] -= 1;
    userStats.heroesByLevelPerZone[zoneNum][existingHero.level] -= 1;
    userStats.unstakesByLevelPerZone[zoneNum][existingHero.level] += 1;
    userStats.completedByLevelPerZone[zoneNum][existingHero.level] += 1;
    userStats.currentActiveByLevelPerZone[zoneNum][existingHero.level] -= 1;
    if (userStats.currentTotalByLevel) {
      userStats.currentTotalByLevel[existingHero.level] -= 1;
    }
    userStats.rewardsPerZone[zoneNum] += amount;
    userStats.totalRewardsAmount += amount;
    if (weaponShardId > 0n) {
      userStats.shardsPerZone[zoneNum] += 1;
      userStats.totalShardsWon += 1;
    }
    if (bonusId > 0n) {
      userStats.bonusesPerZone[zoneNum] += 1;
      userStats.totalBonuses += 1;
    }
    context.FishingUserStats.set(userStats);

    const updatedHero = {...unstakedHero, totalFishingRewards: unstakedHero.totalFishingRewards + amount, fishingRewardsPerZone: unstakedHero.fishingRewardsPerZone.map((val: bigint, idx: number) => idx === zoneNum ? val + amount : val), totalFishingShards: unstakedHero.totalFishingShards + (weaponShardId > 0n ? 1 : 0), fishingShardsPerZone: unstakedHero.fishingShardsPerZone.map((val: number, idx: number) => idx === zoneNum && weaponShardId > 0n ? val + 1 : val), totalFishingBonuses: unstakedHero.totalFishingBonuses + (bonusId > 0n ? 1 : 0), fishingBonusesPerZone: unstakedHero.fishingBonusesPerZone.map((val: number, idx: number) => idx === zoneNum && bonusId > 0n ? val + 1 : val)};
    context.Hero.set(updatedHero);

    const id = `${event.chainId}_${event.block.number}_${event.logIndex}`;
    await createActivity(context, id, BigInt(event.block.timestamp), owner, 'FISHING_UNSTAKE', {amount: amount.toString(), weaponShardId: weaponShardId.toString(), bonusId: bonusId.toString()}, existingHero.id, 'Fishing', getFishingStakingType(zone));
  },
}); 

/**
 * Handler pour Fishing.Dead
 * Un héro meurt pendant la pêche
 */
Fishing.Dead.handlerWithLoader({
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
    const { owner, heroId, requestId } = event.params;
    const timestamp = BigInt(event.block.timestamp);

    const { hero } = loaderReturn as { hero: any | null };
    const existingHero = hero ?? await context.Hero.getOrThrow(heroId.toString(), `Hero ${heroId} non trouvé`);

    // Stocke l'événement brut
    await context.Fishing_Dead.set({
      id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      owner,
      heroId,
      requestId,
    });

    const zone = getFishingZoneFromStakingType(existingHero.stakingType);
    
    // Met à jour le héro : marqué comme mort et unstaked
    const deadHero = {
      ...existingHero,
      isDead: true,
      deathLocation: 'FISHING',
      lastDeathZone: zone,
      staked: false, // Un héros mort n'est plus considéré comme staked
      stakingType: undefined, // Reset staking type quand mort
      deathsCount: existingHero.deathsCount + 1,
      fishingDeathCount: existingHero.fishingDeathCount + 1,
      fishingDeathPerZone: existingHero.fishingDeathPerZone.map((val: number, idx: number) => 
        idx === zone ? val + 1 : val
      ),
      freeReviveAvailable: calculateFishingFreeReviveAvailable(timestamp, zone),
    };
    context.Hero.set(deadHero);

    // Stats globales: if hero was staked, decrement current counts first
    const global = await getOrCreateFishingGlobalStats(context);
    if (existingHero.staked) {
      // Move from active to dead without changing totalHeroes
      global.currentActiveStaked -= 1;
      global.currentActiveStakedPerZone[zone] -= 1;
      global.heroesByLevel[existingHero.level] -= 1;
      global.heroesByLevelPerZone[zone][existingHero.level] -= 1;
      global.currentActiveByLevelPerZone[zone][existingHero.level] -= 1;
      await updatePlayerCounts(context, existingHero.owner_id, { stakedHeroCount: -1 });
    }
    global.currentDeadByLevelPerZone[zone][existingHero.level] += 1;
    if (global.currentDeadByLevel) {
      global.currentDeadByLevel[existingHero.level] += 1;
    }
    global.currentDeadHeroes += 1;
    global.currentDeadHeroesPerZone[zone] += 1;
    global.totalDeaths += 1;
    global.deathsPerZone[zone] += 1;
    global.lastUpdated = timestamp;
    context.FishingGlobalStats.set(global);

    // Stats utilisateur
    const userStats = await getOrCreateFishingUserStats(context, owner.toLowerCase());
    if (existingHero.staked) {
      userStats.heroesPerZone[zone] -= 1;
      userStats.totalHeroes -= 1;
      userStats.currentActiveStaked -= 1;
      userStats.currentActiveStakedPerZone[zone] -= 1;
      userStats.heroesByLevel[existingHero.level] -= 1;
      userStats.heroesByLevelPerZone[zone][existingHero.level] -= 1;
      userStats.currentActiveByLevelPerZone[zone][existingHero.level] -= 1;
    }
    userStats.currentDeadByLevelPerZone[zone][existingHero.level] += 1;
    if (userStats.currentDeadByLevel) {
      userStats.currentDeadByLevel[existingHero.level] += 1;
    }
    userStats.currentDeadHeroes += 1;
    userStats.currentDeadHeroesPerZone[zone] += 1;
    userStats.totalDeaths += 1;
    userStats.deathsPerZone[zone] += 1;
    context.FishingUserStats.set(userStats);

    // Activité
    const id = `${event.chainId}_${event.block.number}_${event.logIndex}`;
    await createActivity(context, id, timestamp, owner, 'DEATH', {heroId: heroId.toString(), zone: existingHero.stakingType || getFishingStakingType(BigInt(zone))}, existingHero.id, 'Fishing', existingHero.stakingType);
  },
});

/**
 * Handler pour Fishing.Revived
 * Un héro est ressuscité
 */
Fishing.Revived.handlerWithLoader({
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
    const { owner, heroId, cost } = event.params;
    const timestamp = BigInt(event.block.timestamp);

    const { hero } = loaderReturn as { hero: any | null };
    const existingHero = hero ?? await context.Hero.getOrThrow(heroId.toString(), `Hero ${heroId} non trouvé`);

    // Stocke l'événement brut
    await context.Fishing_Revived.set({
      id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      owner,
      heroId,
      cost,
    });

    // Met à jour le héro : ressuscité (reste unstaked, doit être restaké manuellement)
    const revivedHero = {
      ...existingHero,
      isDead: false,
      deathLocation: undefined, // Reset death location when revived
      staked: false, // Un héros ressuscité reste unstaked, doit être restaké manuellement
      stakingType: undefined, // Reset staking type quand ressuscité
      revivalCount: existingHero.revivalCount + 1,
      spentOnRevive: existingHero.spentOnRevive + cost,
      fishingRevivalCount: existingHero.fishingRevivalCount + 1,
      fishingReviveSpent: existingHero.fishingReviveSpent + cost,
      freeReviveAvailable: 0n,
    };
    context.Hero.set(revivedHero);

    // Stats globales
    const global = await getOrCreateFishingGlobalStats(context);
    global.totalRevivals += 1;
    global.totalSpentOnRevive += cost;
    if (existingHero.deathLocation === 'FISHING') {
      const zone = typeof existingHero.lastDeathZone === 'number' ? existingHero.lastDeathZone : getFishingZoneFromStakingType(existingHero.stakingType);
      global.currentDeadHeroes = Math.max(0, (global.currentDeadHeroes || 0) - 1);
      if (typeof zone === 'number' && zone >= 0 && zone < 4) {
        global.currentDeadHeroesPerZone[zone] = Math.max(0, global.currentDeadHeroesPerZone[zone] - 1);
        if (global.currentDeadByLevelPerZone) {
          global.currentDeadByLevelPerZone[zone][existingHero.level] = Math.max(0, global.currentDeadByLevelPerZone[zone][existingHero.level] - 1);
        }
      }
      if (global.currentDeadByLevel) {
        global.currentDeadByLevel[existingHero.level] = Math.max(0, global.currentDeadByLevel[existingHero.level] - 1);
      }
    }
    global.lastUpdated = timestamp;
    context.FishingGlobalStats.set(global);

    // Stats utilisateur
    const userStats = await getOrCreateFishingUserStats(context, owner.toLowerCase());
    userStats.totalRevivals += 1;
    userStats.totalSpentOnRevive += cost;
    if (existingHero.deathLocation === 'FISHING') {
      const zone = typeof existingHero.lastDeathZone === 'number' ? existingHero.lastDeathZone : getFishingZoneFromStakingType(existingHero.stakingType);
      userStats.currentDeadHeroes = Math.max(0, (userStats.currentDeadHeroes || 0) - 1);
      if (typeof zone === 'number' && zone >= 0 && zone < 4) {
        userStats.currentDeadHeroesPerZone[zone] = Math.max(0, userStats.currentDeadHeroesPerZone[zone] - 1);
        if (userStats.currentDeadByLevelPerZone) {
          userStats.currentDeadByLevelPerZone[zone][existingHero.level] = Math.max(0, userStats.currentDeadByLevelPerZone[zone][existingHero.level] - 1);
        }
      }
      if (userStats.currentDeadByLevel) {
        userStats.currentDeadByLevel[existingHero.level] = Math.max(0, userStats.currentDeadByLevel[existingHero.level] - 1);
      }
    }
    context.FishingUserStats.set(userStats);

    // Met à jour le totalSpent du joueur
    await updatePlayerTotalSpent(context, owner, cost);

    // Activité
    const id = `${event.chainId}_${event.block.number}_${event.logIndex}`;
    const zoneForActivity = typeof existingHero.lastDeathZone === 'number' ? existingHero.lastDeathZone : getFishingZoneFromStakingType(existingHero.stakingType);
    const zoneEnum = typeof zoneForActivity === 'number' ? getFishingStakingType(BigInt(zoneForActivity)) : (existingHero.stakingType || undefined);
    await createActivity(context, id, timestamp, owner, 'REVIVAL', {heroId: heroId.toString(), cost: cost.toString(), zone: zoneEnum}, existingHero.id, 'Fishing', existingHero.stakingType);
  },
}); 