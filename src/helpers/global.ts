import {
  CHAOS_CHANCES_SIZE,
  CHAOS_LEVEL_GAIN_RANGE_SIZE,
  MAX_LEVEL,
  UNKNOWN_CHANCES_SIZE,
  UNKNOWN_LEVEL_GAIN_RANGE_SIZE,
  WEAPON_RARITY_COUNT,
  WEAPON_SHARPNESS_COUNT,
} from "../constants";

const GLOBAL_STATS_ID = "global_stats";

const NEW_GLOBAL_STATS_DEFAULTS = {
  // Entity Counts
  playerCount: 0n,
  heroesCount: 0n,
  totalHeroesLevel: 0n,
  weaponsCount: 0n,
  gachasCount: 0n,
  bronzeGachasCount: 0n,
  silverGachasCount: 0n,
  goldGachasCount: 0n,
  rainbowGachasCount: 0n,
  heroCountByLevel: Array(MAX_LEVEL).fill(0n),

  // Transfer Counts
  totalTokenTransfers: 0n,
  totalHeroTransfers: 0n,
  totalWeaponTransfers: 0n,
  totalGachaTransfers: 0n,
  totalBronzeGachaTransfers: 0n,
  totalSilverGachaTransfers: 0n,
  totalGoldGachaTransfers: 0n,
  totalRainbowGachaTransfers: 0n,

  // Mint/Burn Statistics
  totalHeroesMinted: 0n,
  totalHeroesBurned: 0n,
  totalWeaponsMinted: 0n,
  totalWeaponsBurned: 0n,
  totalGachasMinted: 0n,
  totalGachasBurned: 0n,
  totalBronzeGachasMinted: 0n,
  totalBronzeGachasBurned: 0n,
  totalSilverGachasMinted: 0n,
  totalSilverGachasBurned: 0n,
  totalGoldGachasMinted: 0n,
  totalGoldGachasBurned: 0n,
  totalRainbowGachasMinted: 0n,
  totalRainbowGachasBurned: 0n,
  weaponsGeneratedByRarity: Array(WEAPON_RARITY_COUNT).fill(0n),
  weaponsGeneratedBySharpness: Array(WEAPON_SHARPNESS_COUNT).fill(0n),

  // Staking / Claiming
  totalClaimed: 0n,
  totalStaked: 0n,
  totalUnstaked: 0n,

  // Training Statistics
  totalTrainings: 0n,
  totalTrainingCost: 0n,
  totalLevelGains: 0n,
  totalNormalTrainingsCount: 0n,
  totalChaosTrainingsCount: 0n,
  totalUnknownTrainingsCount: 0n,
  totalNormalTrainingCost: 0n,
  totalChaosTrainingCost: 0n,
  totalUnknownTrainingCost: 0n,
  totalNormalLevelGains: 0n,
  totalChaosLevelGains: 0n,
  totalUnknownLevelGains: 0n,
  totalChaosLevelGainsDistribution: Array(
    CHAOS_LEVEL_GAIN_RANGE_SIZE,
  ).fill(0n),
  totalUnknownLevelGainsDistribution: Array(
    UNKNOWN_LEVEL_GAIN_RANGE_SIZE,
  ).fill(0n),
  totalChaosChancesSum: Array(CHAOS_CHANCES_SIZE).fill(0n),
  totalUnknownChancesSum: Array(UNKNOWN_CHANCES_SIZE).fill(0n),

  // Remixer Stats
  totalRemixes: 0n,
  totalRemixCost: 0n,
  totalRemixSuccesses: 0n,
  totalRemixFailures: 0n,
  totalRemixBigSuccesses: 0n,
  totalWeaponsGenerated: 0n,
  totalWeaponsMintedByRarity: Array(WEAPON_RARITY_COUNT).fill(0n),
  totalWeaponsBurnedByRarity: Array(WEAPON_RARITY_COUNT).fill(0n),
  totalWeaponsMintedBySharpness: Array(WEAPON_SHARPNESS_COUNT).fill(0n),
  totalWeaponsBurnedBySharpness: Array(WEAPON_SHARPNESS_COUNT).fill(0n),
};

export async function getOrCreateGlobalStats(context: any) {
  const globalStats = await context.GlobalStats.get({
    id: GLOBAL_STATS_ID,
  });

  if (globalStats) {
    // Normalise l'entité GlobalStats pour gérer les anciens enregistrements
    // qui pourraient ne pas avoir les nouveaux champs du schéma.
    for (const key in NEW_GLOBAL_STATS_DEFAULTS) {
      if (globalStats[key] == null) {
        globalStats[key] = (NEW_GLOBAL_STATS_DEFAULTS as any)[key];
      }
    }
    return globalStats;
  } else {
    const newGlobalStats = {
      id: GLOBAL_STATS_ID,
      ...NEW_GLOBAL_STATS_DEFAULTS,
    };
    context.GlobalStats.set(newGlobalStats);
    return newGlobalStats;
  }
} 