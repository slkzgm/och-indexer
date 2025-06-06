/**
 * Computes the maximum $HERO per day based on damage and hero level:
 *   maxHeroPerDay = (damage * 400) / (20 + heroLevel)
 */
export function computeMaxHeroPerDay(damage: bigint, heroLevel: bigint): bigint {
  return (damage * BigInt(400)) / (BigInt(20) + heroLevel);
}

/**
 * Computes the base $HERO per day (80% of maxHeroPerDay):
 *   baseHeroPerDay = 0.8 * maxHeroPerDay
 */
export function computeBaseHeroPerDay(maxHeroPerDay: bigint): bigint {
  return (maxHeroPerDay * BigInt(8)) / BigInt(10);
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
  return (maxHeroPerDay * BigInt(2) * sharpness) / (BigInt(10) * maxSharpness);
}

/**
 * Computes the effective $HERO per day with a fixed base of 50:
 *   dailyReward = 50 + baseHeroPerDay + bonusHeroPerDay
 */
export function computeDailyReward(
  baseHeroPerDay: bigint,
  bonusHeroPerDay: bigint
): bigint {
  return BigInt(50) + baseHeroPerDay + bonusHeroPerDay;
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
  maxHeroPerDay: bigint;
  baseHeroPerDay: bigint;
  bonusHeroPerDay: bigint;
  dailyReward: bigint;
} {
  const maxHeroPerDay = computeMaxHeroPerDay(damage, heroLevel);
  const baseHeroPerDay = computeBaseHeroPerDay(maxHeroPerDay);
  const bonusHeroPerDay = computeBonusHeroPerDay(
    maxHeroPerDay,
    sharpness,
    maxSharpness
  );
  const dailyReward = computeDailyReward(baseHeroPerDay, bonusHeroPerDay);
  return { maxHeroPerDay, baseHeroPerDay, bonusHeroPerDay, dailyReward };
}

const DAMAGE_COEFFICIENTS: bigint[] = [
  BigInt(1),
  BigInt(2),
  BigInt(3),
  BigInt(5),
  BigInt(8),
  BigInt(13),
  BigInt(21),
]

export function computeDamage(level: bigint, rarity: bigint): bigint {
  const coef = DAMAGE_COEFFICIENTS[Number(rarity)] ?? BigInt(0);
  return level * coef;
} 

/**
 * Computes the exact upgrade cost based on the on-chain formula:
 *   cost = (level * 10000e18) / (69 + level)
 *
 * All operations use BigInt to avoid precision loss.
 */
export function computeUpgradeCost(currentLevel: number): bigint {
    const lvl = BigInt(currentLevel);
    // 10000e18 = 10^4 * 10^18 = 10^22
    const SCALE = BigInt("10000000000000000000000");
    const numerator = lvl * SCALE;
    const denominator = BigInt(69 + currentLevel);
    return numerator / denominator;
}