import { DAMAGE_COEFFICIENTS } from '../constants';

/**
 * Computes the exact upgrade cost based on the on-chain formula:
 *   cost = (level * 10000e18) / (69 + level)
 *
 * All operations use BigInt to avoid precision loss.
 */
export function getTrainingCost(level: bigint): bigint {
  // 10000e18 = 10^4 * 10^18 = 10^22
  const SCALE = 10000000000000000000000n;
  const numerator = level * SCALE;
  const denominator = 69n + level;
  return numerator / denominator;
}

export function parseWeaponMetadata(metadata: bigint): {
  weaponType: number;
  rarity: number;
  maxDurability: bigint;
  maxSharpness: bigint;
} {
  // TODO: Implement actual metadata parsing logic based on contract
  // This is a placeholder implementation
  const weaponType = Number((metadata >> 248n) & 0xffn);
  const rarity = Number((metadata >> 240n) & 0xffn);
  const maxDurability = (metadata >> 120n) & 0xffffffffffffn;
  const maxSharpness = metadata & 0xffffffffffffn;

  return { weaponType, rarity, maxDurability, maxSharpness };
}

/**
 * Computes the damage for a hero based on its level and weapon rarity.
 * @param level The level of the hero.
 * @param rarity The rarity of the weapon.
 * @returns The computed damage value as a BigInt.
 */
export function computeDamage(level: bigint, rarity: number): bigint {
  const coef = DAMAGE_COEFFICIENTS[rarity] ?? 0n;
  return level * coef;
}

/**
 * Computes the maximum $HERO per day based on damage and hero level:
 *   maxHeroPerDay = (damage * 400) / (20 + heroLevel)
 */
export function computeMaxHeroPerDay(damage: bigint, heroLevel: bigint): bigint {
  if (damage === 0n || heroLevel === 0n) return 0n;
  return (damage * 400n) / (20n + heroLevel);
}

/**
 * Computes the base $HERO per day (80% of maxHeroPerDay):
 *   baseHeroPerDay = 0.8 * maxHeroPerDay
 */
export function computeBaseHeroPerDay(maxHeroPerDay: bigint): bigint {
  return (maxHeroPerDay * 8n) / 10n;
}

/**
 * Computes the bonus $HERO per day (up to 20% scaled by sharpness):
 *   bonusHeroPerDay = 0.2 * maxHeroPerDay * (sharpness / maxSharpness)
 */
export function computeBonusHeroPerDay(
  maxHeroPerDay: bigint,
  sharpness: bigint,
  maxSharpness: bigint
): bigint {
  if (maxSharpness === 0n) return 0n;
  return (maxHeroPerDay * 2n * sharpness) / (10n * maxSharpness);
}

/**
 * Computes the effective $HERO per day with a fixed base of 50:
 *   dailyReward = 50 + baseHeroPerDay + bonusHeroPerDay
 */
export function computeDailyReward(
  baseHeroPerDay: bigint,
  bonusHeroPerDay: bigint
): bigint {
  const dailyReward = 50n + baseHeroPerDay + bonusHeroPerDay;
  return dailyReward * 10n ** 18n; // Convert to 18 decimals
}

export function computeHourlyReward(dailyReward: bigint): bigint {
  return dailyReward / 24n;
}

/**
 * Convenience function to compute all reward metrics at once.
 * It computes damage based on hero level & rarity internally.
 */
export function computeRewards(
  heroLevel: bigint,
  damage: bigint,
  sharpness: bigint,
  maxSharpness: bigint
): {
  baseHeroPerDay: bigint;
  bonusHeroPerDay: bigint;
  dailyReward: bigint;
  hourlyReward: bigint;
} {
  const maxHeroPerDay = computeMaxHeroPerDay(damage, heroLevel);
  const baseHeroPerDay = computeBaseHeroPerDay(maxHeroPerDay);
  const bonusHeroPerDay = computeBonusHeroPerDay(
    maxHeroPerDay,
    sharpness,
    maxSharpness
  );
  const dailyReward = computeDailyReward(baseHeroPerDay, bonusHeroPerDay);
  const hourlyReward = computeHourlyReward(dailyReward);
  return { baseHeroPerDay, bonusHeroPerDay, dailyReward, hourlyReward };
}