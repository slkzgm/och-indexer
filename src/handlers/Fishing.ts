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
      
      // Met à jour le héro : staking activé pour fishing avec le bon type selon la zone
      setHeroFishingStaked(context, existingHero, zone, timestamp)
    ]);
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
    context.FishingUserStats.set(userStats);

    const updatedHero = {...existingHero, totalFishingSessions: existingHero.totalFishingSessions + 1, totalFishingFees: existingHero.totalFishingFees + fee};
    context.Hero.set(updatedHero);

    const id = `${event.chainId}_${event.block.number}_${event.logIndex}`;
    const stakingType = getFishingStakingType(zone);
    await createActivity(context, id, timestamp, owner, 'FISHING_STAKE', {fee: fee.toString(), zone: zone.toString()}, existingHero.id, 'Fishing', stakingType);
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
      context.Hero.set({
        ...existingHero,
        staked: false,
        stakingType: undefined,
        stakedTimestamp: 0n,
        unstakeAvailableTimestamp: 0n,
        lastClaimTimestamp: 0n,
      })
    ]);
    if (existingHero.staked) {
      await updatePlayerCounts(context, existingHero.owner_id, { stakedHeroCount: -1 });
    }

    // Stats et activité
    const zoneNum = Number(existingHero.zone);
    const global = await getOrCreateFishingGlobalStats(context);
    global.totalHeroesPerZone[zoneNum] -= 1;
    global.totalRewardsAmount += amount;
    global.totalShardsWon += Number(weaponShardId > 0n);
    global.totalBonuses += Number(bonusId > 0n);
    global.lastUpdated = BigInt(event.block.timestamp);
    context.FishingGlobalStats.set(global);

    const userStats = await getOrCreateFishingUserStats(context, owner.toLowerCase());
    userStats.heroesPerZone[zoneNum] -= 1;
    userStats.feesPerZone[zoneNum] += amount;
    userStats.totalFees += amount;
    userStats.totalFishingRewards += amount;
    userStats.totalFishingShards += Number(weaponShardId > 0n);
    userStats.totalFishingBonuses += Number(bonusId > 0n);
    context.FishingUserStats.set(userStats);

    const updatedHero = {...existingHero, totalFishingRewards: existingHero.totalFishingRewards + amount, totalFishingShards: existingHero.totalFishingShards + (weaponShardId > 0n ? 1 : 0), totalFishingBonuses: existingHero.totalFishingBonuses + (bonusId > 0n ? 1 : 0)};
    context.Hero.set(updatedHero);

    const id = `${event.chainId}_${event.block.number}_${event.logIndex}`;
    await createActivity(context, id, BigInt(event.block.timestamp), owner, 'FISHING_UNSTAKE', {amount: amount.toString(), weaponShardId: weaponShardId.toString(), bonusId: bonusId.toString()}, existingHero.id, 'Fishing', getFishingStakingType(zone));
  },
}); 