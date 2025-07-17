// src/helpers/stats.ts
export async function getOrCreateDragmaGlobalStats(context: any) {
  let stats = await context.DragmaGlobalStats.get('global');
  if (!stats) {
    stats = {
      id: 'global',
      totalStakedHeroes: 0,
      totalUnstakedHeroes: 0,
      totalRewardsClaimed: 0n,
      totalClaims: 0,
      averageClaimAmount: 0n,
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
      totalStakes: 0,
      totalUnstakes: 0,
      totalRewardsClaimed: 0n,
      totalClaims: 0,
      averageStakingDuration: 0n,
      player_id: userId, // Relation to Player
    };
    await context.DragmaUserStats.set(stats);
  }
  return stats;
}
// Add more as needed for other contracts 