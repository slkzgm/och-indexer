// src/helpers/stats.ts
export async function getOrCreateDragmaGlobalStats(context: any) {
  let stats = await context.DragmaGlobalStats.get('global');
  if (!stats) {
    stats = {
      id: 'global',
      totalStakedHeroes: 0,
      currentStakedHeroes: 0,
      totalUnstakedHeroes: 0,
      totalRewardsClaimed: 0n,
      totalClaims: 0,
      averageClaimAmount: 0n,
      heroesByLevel: Array(101).fill(0),
      lastUpdated: 0n,
    };
    await context.DragmaGlobalStats.set(stats);
  }
  return stats;
}

export async function getOrCreateDragmaUserStats(context: any, userId: string) {
  let stats = await context.DragmaUserStats.get(userId);
  if (!stats) {
    stats = {
      id: userId,
      stakedHeroes: 0,
      currentStakedHeroes: 0,
      totalStakes: 0,
      totalUnstakes: 0,
      totalRewardsClaimed: 0n,
      totalClaims: 0,
      averageStakingDuration: 0n,
      heroesByLevel: Array(101).fill(0),
      player_id: userId, // Relation to Player
    };
    await context.DragmaUserStats.set(stats);
  }
  return stats;
}

export async function getOrCreateFishingGlobalStats(context: any) {
  let stats = await context.FishingGlobalStats.get('global');
  if (!stats) {
    stats = {
      id: 'global',
      totalHeroes: 0,
      totalHeroesPerZone: [0,0,0],
      heroesByLevel: Array(101).fill(0),
      totalFeesPerZone: [0n,0n,0n],
      totalRewardsAmount: 0n,
      rewardsPerZone: [0n,0n,0n],
      totalShardsWon: 0,
      shardsPerZone: [0,0,0],
      totalBonuses: 0,
      bonusesPerZone: [0,0,0],
      lastUpdated: 0n,
    };
    await context.FishingGlobalStats.set(stats);
  }
  return stats;
}
export async function getOrCreateFishingUserStats(context: any, userId: string) {
  let stats = await context.FishingUserStats.get(userId);
  if (!stats) {
    stats = {
      id: userId,
      totalHeroes: 0,
      heroesPerZone: [0,0,0],
      heroesByLevel: Array(101).fill(0),
      totalFees: 0n,
      feesPerZone: [0n,0n,0n],
      totalRewardsAmount: 0n,
      rewardsPerZone: [0n,0n,0n],
      totalShardsWon: 0,
      shardsPerZone: [0,0,0],
      totalBonuses: 0,
      bonusesPerZone: [0,0,0],
      totalSessionsPerZone: [0,0,0],
      player_id: userId,
    };
    await context.FishingUserStats.set(stats);
  }
  return stats;
}

export async function getOrCreateHeroesGlobalStats(context: any) {
  let stats = await context.HeroesGlobalStats.get('global');
  if (!stats) {
    stats = {
      id: 'global',
      totalHeroes: 0,
      totalMinted: 0,
      totalBurned: 0,
      heroesByLevel: Array(101).fill(0),
      lastUpdated: 0n,
    };
    await context.HeroesGlobalStats.set(stats);
  }
  return stats;
}
// Add more as needed for other contracts 