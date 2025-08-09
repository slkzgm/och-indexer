// src/helpers/stats.ts

export async function getOrCreateDragmaUnderlingsGlobalStats(context: any) {
  let stats = await context.DragmaUnderlingsGlobalStats.get('global');
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
    await context.DragmaUnderlingsGlobalStats.set(stats);
  }
  return stats;
}

export async function getOrCreateDragmaUnderlingsUserStats(context: any, userId: string) {
  let stats = await context.DragmaUnderlingsUserStats.get(userId);
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
    await context.DragmaUnderlingsUserStats.set(stats);
  }
  return stats;
}

export async function getOrCreateFishingGlobalStats(context: any) {
  let stats = await context.FishingGlobalStats.get('global');
  if (!stats) {
    stats = {
      id: 'global',
      totalHeroes: 0,
      totalHeroesPerZone: [0,0,0,0],
      heroesByLevelPerZone: [Array(101).fill(0), Array(101).fill(0), Array(101).fill(0), Array(101).fill(0)],
      stakesByLevelPerZone: [Array(101).fill(0), Array(101).fill(0), Array(101).fill(0), Array(101).fill(0)],
      unstakesByLevelPerZone: [Array(101).fill(0), Array(101).fill(0), Array(101).fill(0), Array(101).fill(0)],
      completedByLevelPerZone: [Array(101).fill(0), Array(101).fill(0), Array(101).fill(0), Array(101).fill(0)],
      currentActiveByLevelPerZone: [Array(101).fill(0), Array(101).fill(0), Array(101).fill(0), Array(101).fill(0)],
      currentDeadByLevelPerZone: [Array(101).fill(0), Array(101).fill(0), Array(101).fill(0), Array(101).fill(0)],
      totalStakes: 0,
      totalUnstakes: 0,
      completedSessions: 0,
      completedSessionsPerZone: [0,0,0,0],
      currentActiveStaked: 0,
      currentActiveStakedPerZone: [0,0,0,0],
      currentDeadHeroes: 0,
      currentDeadHeroesPerZone: [0,0,0,0],
      currentDeadByLevel: Array(101).fill(0),
      heroesByLevel: Array(101).fill(0),
      totalFees: 0n,
      totalFeesPerZone: [0n,0n,0n,0n],
      totalRewardsAmount: 0n,
      rewardsPerZone: [0n,0n,0n,0n],
      totalShardsWon: 0,
      shardsPerZone: [0,0,0,0],
      totalBonuses: 0,
      bonusesPerZone: [0,0,0,0],
      
      // Death and revival stats
      totalDeaths: 0,
      deathsPerZone: [0,0,0,0], // [SLIME_BAY, SHROOM_GROTTO, SKEET_PIER, MAGMA_MIRE]
      totalRevivals: 0,
      totalSpentOnRevive: 0n,
      
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
      heroesPerZone: [0,0,0,0],
      heroesByLevelPerZone: [Array(101).fill(0), Array(101).fill(0), Array(101).fill(0), Array(101).fill(0)],
      stakesByLevelPerZone: [Array(101).fill(0), Array(101).fill(0), Array(101).fill(0), Array(101).fill(0)],
      unstakesByLevelPerZone: [Array(101).fill(0), Array(101).fill(0), Array(101).fill(0), Array(101).fill(0)],
      completedByLevelPerZone: [Array(101).fill(0), Array(101).fill(0), Array(101).fill(0), Array(101).fill(0)],
      currentActiveByLevelPerZone: [Array(101).fill(0), Array(101).fill(0), Array(101).fill(0), Array(101).fill(0)],
      currentDeadByLevelPerZone: [Array(101).fill(0), Array(101).fill(0), Array(101).fill(0), Array(101).fill(0)],
      totalStakes: 0,
      totalUnstakes: 0,
      completedSessions: 0,
      completedSessionsPerZone: [0,0,0,0],
      currentActiveStaked: 0,
      currentActiveStakedPerZone: [0,0,0,0],
      currentDeadHeroes: 0,
      currentDeadHeroesPerZone: [0,0,0,0],
      currentDeadByLevel: Array(101).fill(0),
      heroesByLevel: Array(101).fill(0),
      totalFees: 0n,
      feesPerZone: [0n,0n,0n,0n],
      totalRewardsAmount: 0n,
      rewardsPerZone: [0n,0n,0n,0n],
      totalShardsWon: 0,
      shardsPerZone: [0,0,0,0],
      totalBonuses: 0,
      bonusesPerZone: [0,0,0,0],
      totalSessionsPerZone: [0,0,0,0],
      
      // Death and revival stats
      totalDeaths: 0,
      deathsPerZone: [0,0,0,0], // [SLIME_BAY, SHROOM_GROTTO, SKEET_PIER, MAGMA_MIRE]
      totalRevivals: 0,
      totalSpentOnRevive: 0n,
      
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

export async function getOrCreateGymGlobalStats(context: any) {
  let stats = await context.GymGlobalStats.get('global');
  if (!stats) {
    stats = {
      id: 'global',
      totalAttemptedTrainings: 0,
      totalSuccessfulTrainings: 0,
      totalFailedTrainings: 0,
      attemptedByType: [0,0,0],
      successfulByType: [0,0,0],
      failedByType: [0,0,0],
      totalOutcomeSumByType: [0n,0n,0n],
      outcomesCountByType: [Array(11).fill(0), Array(11).fill(0), Array(11).fill(0)],
      sumOfChancesByType: [Array(11).fill(0n), Array(11).fill(0n), Array(11).fill(0n)],
      chancesCountByType: [0,0,0],
      totalSpent: 0n,
      spentByType: [0n,0n,0n],
      lastUpdated: 0n,
    };
    await context.GymGlobalStats.set(stats);
  }
  return stats;
}

export async function getOrCreateGymUserStats(context: any, userId: string) {
  let stats = await context.GymUserStats.get(userId);
  if (!stats) {
    stats = {
      id: userId,
      totalAttemptedTrainings: 0,
      totalSuccessfulTrainings: 0,
      totalFailedTrainings: 0,
      attemptedByType: [0,0,0],
      successfulByType: [0,0,0],
      failedByType: [0,0,0],
      totalOutcomeSumByType: [0n,0n,0n],
      outcomesCountByType: [Array(11).fill(0), Array(11).fill(0), Array(11).fill(0)],
      sumOfChancesByType: [Array(11).fill(0n), Array(11).fill(0n), Array(11).fill(0n)],
      chancesCountByType: [0,0,0],
      totalSpent: 0n,
      spentByType: [0n,0n,0n],
      player_id: userId,
    };
    await context.GymUserStats.set(stats);
  }
  return stats;
}
export async function getOrCreateDragmaGlobalStats(context: any) {
  let stats = await context.DragmaGlobalStats.get('global');
  if (!stats) {
    stats = {
      id: 'global',
      totalHeroes: 0,
      totalHeroesPerZone: [0,0,0,0],
      stakesByLevelPerZone: [Array(101).fill(0), Array(101).fill(0), Array(101).fill(0), Array(101).fill(0)],
      unstakesByLevelPerZone: [Array(101).fill(0), Array(101).fill(0), Array(101).fill(0), Array(101).fill(0)],
      completedByLevelPerZone: [Array(101).fill(0), Array(101).fill(0), Array(101).fill(0), Array(101).fill(0)],
      currentActiveByLevelPerZone: [Array(101).fill(0), Array(101).fill(0), Array(101).fill(0), Array(101).fill(0)],
      currentDeadByLevelPerZone: [Array(101).fill(0), Array(101).fill(0), Array(101).fill(0), Array(101).fill(0)],
      totalStakes: 0,
      totalUnstakes: 0,
      completedSessions: 0,
      completedSessionsPerZone: [0,0,0,0],
      currentActiveStaked: 0,
      currentActiveStakedPerZone: [0,0,0,0],
      currentDeadHeroes: 0,
      currentDeadHeroesPerZone: [0,0,0,0],
      currentDeadByLevel: Array(101).fill(0),
      heroesByLevel: Array(101).fill(0),
      heroesByLevelPerZone: [Array(101).fill(0), Array(101).fill(0), Array(101).fill(0), Array(101).fill(0)], // [zone][level] - [TAILS, LEGS, TORSO, HEAD] × [0-100]
      totalFeesPerZone: [0n,0n,0n,0n],
      totalRewardsAmount: 0n,
      // Score tracking
      totalScore: 0n,
      scorePerZone: [0n,0n,0n,0n],
      // Score tracking (all outcomes)
      totalScoreAll: 0n,
      scorePerZoneAll: [0n,0n,0n,0n],
      rewardsPerZone: [[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0]], // [zone] × [primary, secondary1, secondary2, secondary3, tertiary]
      totalShardsWon: 0,
      shardsPerZone: [0,0,0,0],
      totalBonuses: 0,
      bonusesPerZone: [0,0,0,0],
      
      // Gacha tracking
      totalGachaWon: 0,
      gachaByTokenId: [0,0,0,0], // [BRONZE, SILVER, GOLD, RAINBOW]
      gachaPerZone: [0,0,0,0], // [TAILS, LEGS, TORSO, HEAD]
      gachaByZoneAndTokenId: [[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]], // [zone][tokenId]
      
      // Death and revival stats
      totalDeaths: 0,
      deathsPerZone: [0,0,0,0], // [TAILS, LEGS, TORSO, HEAD]
      totalRevivals: 0,
      totalSpentOnRevive: 0n,
      
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
      totalHeroes: 0,
      heroesPerZone: [0,0,0,0],
      stakesByLevelPerZone: [Array(101).fill(0), Array(101).fill(0), Array(101).fill(0), Array(101).fill(0)],
      unstakesByLevelPerZone: [Array(101).fill(0), Array(101).fill(0), Array(101).fill(0), Array(101).fill(0)],
      completedByLevelPerZone: [Array(101).fill(0), Array(101).fill(0), Array(101).fill(0), Array(101).fill(0)],
      currentActiveByLevelPerZone: [Array(101).fill(0), Array(101).fill(0), Array(101).fill(0), Array(101).fill(0)],
      currentDeadByLevelPerZone: [Array(101).fill(0), Array(101).fill(0), Array(101).fill(0), Array(101).fill(0)],
      totalStakes: 0,
      totalUnstakes: 0,
      completedSessions: 0,
      completedSessionsPerZone: [0,0,0,0],
      currentActiveStaked: 0,
      currentActiveStakedPerZone: [0,0,0,0],
      currentDeadHeroes: 0,
      currentDeadHeroesPerZone: [0,0,0,0],
      currentDeadByLevel: Array(101).fill(0),
      heroesByLevel: Array(101).fill(0),
      heroesByLevelPerZone: [Array(101).fill(0), Array(101).fill(0), Array(101).fill(0), Array(101).fill(0)], // [zone][level] - [TAILS, LEGS, TORSO, HEAD] × [0-100]
      totalFees: 0n,
      feesPerZone: [0n,0n,0n,0n],
      totalRewardsAmount: 0n,
      // Score tracking
      totalScore: 0n,
      scorePerZone: [0n,0n,0n,0n],
      // Score tracking (all outcomes)
      totalScoreAll: 0n,
      scorePerZoneAll: [0n,0n,0n,0n],
      rewardsPerZone: [[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0]], // [zone] × [primary, secondary1, secondary2, secondary3, tertiary]
      totalShardsWon: 0,
      shardsPerZone: [0,0,0,0],
      totalBonuses: 0,
      bonusesPerZone: [0,0,0,0],
      totalSessionsPerZone: [0,0,0,0],
      
      // Gacha tracking
      totalGachaWon: 0,
      gachaByTokenId: [0,0,0,0], // [BRONZE, SILVER, GOLD, RAINBOW]
      gachaPerZone: [0,0,0,0], // [TAILS, LEGS, TORSO, HEAD]
      gachaByZoneAndTokenId: [[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]], // [zone][tokenId]
      
      // Death and revival stats
      totalDeaths: 0,
      deathsPerZone: [0,0,0,0], // [TAILS, LEGS, TORSO, HEAD]
      totalRevivals: 0,
      totalSpentOnRevive: 0n,
      
      player_id: userId,
    };
    await context.DragmaUserStats.set(stats);
  }
  return stats;
}

// Add more as needed for other contracts 