import {
  Fishing,
  Fishing_Staked,
  Fishing_UnstakeRequested,
  Fishing_Unstaked,
} from "generated";
import { setHeroFishingStaked } from "../helpers/entities";
import { updatePlayerCounts } from "../helpers/player";
import { getOrCreateFishingGlobalStats, getOrCreateFishingUserStats } from "../helpers/stats";
import { createActivity } from "../helpers/activity";
import { getFishingStakingType } from "../helpers/calculations";

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
    const stakedHero = await setHeroFishingStaked(context, existingHero, zone, timestamp);
    if (!existingHero.staked) {
      await updatePlayerCounts(context, existingHero.owner_id, { stakedHeroCount: 1 });
    }

    // Stats et activité
    const zoneNum = Number(zone);
    const global = await getOrCreateFishingGlobalStats(context);
    global.totalHeroesPerZone[zoneNum] += !existingHero.staked ? 1 : 0;
    global.totalFeesPerZone[zoneNum] += fee;
    global.lastUpdated = timestamp;
    context.FishingGlobalStats.set(global);

    const userStats = await getOrCreateFishingUserStats(context, owner.toLowerCase());
    userStats.heroesPerZone[zoneNum] += 1;
    userStats.feesPerZone[zoneNum] += fee;
    userStats.totalFees += fee;
    userStats.totalSessionsPerZone[zoneNum] += 1;
    context.FishingUserStats.set(userStats);

    const updatedHero = {...stakedHero, totalFishingSessions: stakedHero.totalFishingSessions + 1, fishingSessionsPerZone: stakedHero.fishingSessionsPerZone.map((val: number, idx: number) => idx === zoneNum ? val + 1 : val), totalFishingFees: stakedHero.totalFishingFees + fee};
    context.Hero.set(updatedHero);

    const id = `${event.chainId}_${event.block.number}_${event.logIndex}`;
    const stakingType = getFishingStakingType(zone);
    await createActivity(context, id, timestamp, owner, 'FISHING_STAKE', {fee: fee.toString(), zone: zone.toString()}, existingHero.id, 'Fishing', stakingType);
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