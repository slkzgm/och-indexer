import {
  STAKING_MINIMUM_DURATION_SECONDS,
  MAX_LEVEL,
  WEAPON_RARITY_COUNT,
} from "../constants";
import {
  Player,
  GlobalStats,
  Hero,
  WeaponRarity,
  StakingType,
  PlayerStakingStatsByLevelAndRarity,
  GlobalStakingStatsByLevelAndRarity,
} from "generated";
import { computeRewards } from "./formulas";
import { getOrCreateGlobalStats, getOrCreatePlayer } from "./";

type Context = any;

async function getOrCreatePlayerStakingStats(
  context: Context,
  playerId: string,
  level: bigint,
  rarity: WeaponRarity,
): Promise<PlayerStakingStatsByLevelAndRarity> {
  const id = `${playerId}-${level}-${rarity}`;
  const stats = await context.PlayerStakingStatsByLevelAndRarity.get(id);
  if (stats) return stats;

  const newStats = {
    id,
    player_id: playerId,
    level: Number(level),
    rarity,
    count: 0n,
  };
  return newStats;
}

async function getOrCreateGlobalStakingStats(
  context: Context,
  level: bigint,
  rarity: WeaponRarity,
): Promise<GlobalStakingStatsByLevelAndRarity> {
  const id = `${level}-${rarity}`;
  const stats = await context.GlobalStakingStatsByLevelAndRarity.get(id);
  if (stats) return stats;
  
  const newStats = {
    id,
    global_id: "global",
    level: Number(level),
    rarity,
    count: 0n,
  };
  return newStats;
}

export async function handleStake(
  context: Context,
  user: string,
  heroId: bigint,
  timestamp: bigint,
) {
  const hero = await context.Hero.get(heroId.toString());
  if (!hero) {
    context.log.error(`[handleStake] Hero ${heroId} not found.`);
    return;
  }

  const weapon = hero.equippedWeapon_id
    ? await context.Weapon.get(hero.equippedWeapon_id)
    : null;
  if (!weapon) {
    context.log.warn(
      `[handleStake] Hero ${heroId} is staked without a weapon.`,
    );
  }

  const [player, globalStats] = await Promise.all([
    getOrCreatePlayer(context, user),
    getOrCreateGlobalStats(context),
  ]);

  // --- Calculate rewards ---
  const rewards = computeRewards(
    hero.level,
    hero.damage,
    weapon?.sharpness ?? 0n,
    weapon?.maxSharpness ?? 0n,
  );

  // --- Update Hero ---
  if(player.stakedHeroesCount === 0n) {
    globalStats.playersWithStakedHeroesCount += 1n;
  }
  hero.staked = true;
  hero.stakingType = StakingType.Dragma;
  hero.stakedTimestamp = timestamp;
  hero.lastClaimTimestamp = timestamp;
  hero.unstakeAvailableTimestamp =
    timestamp + BigInt(STAKING_MINIMUM_DURATION_SECONDS);
  hero.stakingCount += 1n;
  hero.baseHeroPerDay = rewards.baseHeroPerDay;
  hero.bonusHeroPerDay = rewards.bonusHeroPerDay;
  hero.dailyReward = rewards.dailyReward;
  hero.hourlyReward = rewards.hourlyReward;

  // --- Update Player ---
  player.stakedHeroesCount += 1n;
  player.stakingCount += 1n;
  player.totalDailyReward += rewards.dailyReward;
  player.totalHourlyReward += rewards.hourlyReward;

  // --- Update Global Stats ---
  globalStats.totalStakedHeroesCount += 1n;
  globalStats.totalStakingCount += 1n;
  globalStats.grandTotalDailyReward += rewards.dailyReward;
  globalStats.grandTotalHourlyReward += rewards.hourlyReward;

  // --- Update Distributional Stats ---
  const levelIndex = Number(hero.level) - 1;
  if (levelIndex >= 0 && levelIndex < MAX_LEVEL) {
    player.stakedHeroesCountByLevel[levelIndex] += 1n;
    globalStats.totalStakedHeroesCountByLevel[levelIndex] += 1n;
  }

  if (weapon?.rarity) {
    const rarityIndex = Object.values(WeaponRarity).indexOf(weapon.rarity);
    player.stakedHeroesCountByWeaponRarity[rarityIndex] += 1n;
    globalStats.totalStakedHeroesCountByWeaponRarity[rarityIndex] += 1n;

    const [playerStakingStats, globalStakingStats] = await Promise.all([
      getOrCreatePlayerStakingStats(context, player.id, hero.level, weapon.rarity),
      getOrCreateGlobalStakingStats(context, hero.level, weapon.rarity),
    ]);
    const newPlayerStakingStats = { ...playerStakingStats, count: playerStakingStats.count + 1n };
    const newGlobalStakingStats = { ...globalStakingStats, count: globalStakingStats.count + 1n };
    context.PlayerStakingStatsByLevelAndRarity.set(newPlayerStakingStats);
    context.GlobalStakingStatsByLevelAndRarity.set(newGlobalStakingStats);
  }

  context.Hero.set(hero);
  context.Player.set(player);
  context.GlobalStats.set(globalStats);
}

export async function handleUnstake(
  context: Context,
  user: string,
  heroId: bigint,
  timestamp: bigint,
) {
  const hero = await context.Hero.get(heroId.toString());
  if (!hero) {
    context.log.error(`[handleUnstake] Hero ${heroId} not found.`);
    return;
  }
  if (!hero.staked) {
    context.log.warn(`[handleUnstake] Hero ${heroId} was not staked.`);
    return;
  }
  
  const weapon = hero.equippedWeapon_id ? await context.Weapon.get(hero.equippedWeapon_id) : null;

  const [player, globalStats] = await Promise.all([
    getOrCreatePlayer(context, user),
    getOrCreateGlobalStats(context),
  ]);

  const stakedDuration = timestamp - hero.stakedTimestamp;

  // --- Update Hero ---
  hero.staked = false;
  hero.stakingType = undefined;
  hero.totalStakedTime += stakedDuration;
  const dailyReward = hero.dailyReward; // Store before resetting
  const hourlyReward = hero.hourlyReward; // Store before resetting
  hero.dailyReward = 0n;
  hero.baseHeroPerDay = 0n;
  hero.bonusHeroPerDay = 0n;
  hero.hourlyReward = 0n;
  
  // --- Update Player ---
  player.stakedHeroesCount -= 1n;
  player.totalDailyReward -= dailyReward;
  player.totalHourlyReward -= hourlyReward;
  player.totalStakedTime += stakedDuration;
  if(player.stakedHeroesCount === 0n) {
    globalStats.playersWithStakedHeroesCount -= 1n;
  }

  // --- Update Global Stats ---
  globalStats.totalStakedHeroesCount -= 1n;
  globalStats.grandTotalDailyReward -= dailyReward;
  globalStats.grandTotalHourlyReward -= hourlyReward;
  globalStats.grandTotalStakedTime += stakedDuration;

  // --- Update Distributional Stats ---
  const levelIndex = Number(hero.level) - 1;
  if (levelIndex >= 0 && levelIndex < MAX_LEVEL) {
    player.stakedHeroesCountByLevel[levelIndex] -= 1n;
    globalStats.totalStakedHeroesCountByLevel[levelIndex] -= 1n;
  }
  
  if (weapon?.rarity) {
    const rarityIndex = Object.values(WeaponRarity).indexOf(weapon.rarity);
    player.stakedHeroesCountByWeaponRarity[rarityIndex] -= 1n;
    globalStats.totalStakedHeroesCountByWeaponRarity[rarityIndex] -= 1n;

    const [playerStakingStats, globalStakingStats] = await Promise.all([
        getOrCreatePlayerStakingStats(context, player.id, hero.level, weapon.rarity),
        getOrCreateGlobalStakingStats(context, hero.level, weapon.rarity),
    ]);
    const newPlayerStakingStats = { ...playerStakingStats, count: playerStakingStats.count - 1n };
    const newGlobalStakingStats = { ...globalStakingStats, count: globalStakingStats.count - 1n };
    context.PlayerStakingStatsByLevelAndRarity.set(newPlayerStakingStats);
    context.GlobalStakingStatsByLevelAndRarity.set(newGlobalStakingStats);
  }

  context.Hero.set(hero);
  context.Player.set(player);
  context.GlobalStats.set(globalStats);
}

export async function handleClaim(
  context: Context,
  user: string,
  heroId: bigint,
  amount: bigint,
  timestamp: bigint,
) {
  const hero = await context.Hero.get(heroId.toString());
  if (!hero) {
    context.log.error(`[handleClaim] Hero ${heroId} not found.`);
    return;
  }

  const [player, globalStats] = await Promise.all([
    getOrCreatePlayer(context, user),
    getOrCreateGlobalStats(context),
  ]);

  // --- Update Entities ---
  hero.stakingTotalClaimed += amount;
  hero.lastClaimTimestamp = timestamp;
  player.stakingTotalClaimed += amount;
  // Also update the old totalClaimed for backward compatibility or general stats
  player.totalClaimed += amount; 
  globalStats.grandTotalClaimedFromStaking += amount;
  globalStats.totalClaimed += amount;


  context.Hero.set(hero);
  context.Player.set(player);
  context.GlobalStats.set(globalStats);
} 