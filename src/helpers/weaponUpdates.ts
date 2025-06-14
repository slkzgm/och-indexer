import { computeRewards } from "./formulas";
import { getOrCreateGlobalStats, getOrCreatePlayer } from "./";

type Context = any;

export async function handleWeaponDurabilityUpdate(
  context: Context,
  weaponId: bigint,
  newDurability: bigint,
) {
  const weapon = await context.Weapon.get(weaponId.toString());
  if (!weapon) {
    context.log.error(
      `[handleWeaponDurabilityUpdate] Weapon ${weaponId} not found.`,
    );
    return;
  }
  weapon.durability = newDurability;
  context.Weapon.set(weapon);
}

export async function handleWeaponSharpnessUpdate(
  context: Context,
  weaponId: bigint,
  newSharpness: bigint,
) {
  const weapon = await context.Weapon.get(weaponId.toString());
  if (!weapon) {
    context.log.error(
      `[handleWeaponSharpnessUpdate] Weapon ${weaponId} not found.`,
    );
    return;
  }

  const oldSharpness = weapon.sharpness;
  weapon.sharpness = newSharpness;

  // If the weapon is not equipped, or the hero is not staked, no rewards to update.
  if (!weapon.equippedBy_id) {
    context.Weapon.set(weapon);
    return;
  }

  const hero = await context.Hero.get(weapon.equippedBy_id);
  if (!hero || !hero.staked) {
    context.Weapon.set(weapon);
    return;
  }
  
  // Recalculate rewards as sharpness has changed
  const [player, globalStats] = await Promise.all([
    getOrCreatePlayer(context, hero.owner_id),
    getOrCreateGlobalStats(context),
  ]);

  const oldRewards = computeRewards(
    hero.level,
    hero.damage,
    oldSharpness,
    weapon.maxSharpness,
  );
  const newRewards = computeRewards(
    hero.level,
    hero.damage,
    newSharpness,
    weapon.maxSharpness,
  );

  // Update hero with new rewards
  hero.baseHeroPerDay = newRewards.baseHeroPerDay;
  hero.bonusHeroPerDay = newRewards.bonusHeroPerDay;
  hero.dailyReward = newRewards.dailyReward;
  hero.hourlyReward = newRewards.hourlyReward;

  // Update player's aggregated rewards
  player.totalDailyReward =
    player.totalDailyReward - oldRewards.dailyReward + newRewards.dailyReward;
  player.totalHourlyReward =
    player.totalHourlyReward - oldRewards.hourlyReward + newRewards.hourlyReward;

  // Update global aggregated rewards
  globalStats.grandTotalDailyReward =
    globalStats.grandTotalDailyReward -
    oldRewards.dailyReward +
    newRewards.dailyReward;
  globalStats.grandTotalHourlyReward =
    globalStats.grandTotalHourlyReward -
    oldRewards.hourlyReward +
    newRewards.hourlyReward;

  context.Weapon.set(weapon);
  context.Hero.set(hero);
  context.Player.set(player);
  context.GlobalStats.set(globalStats);
} 