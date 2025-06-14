import { WeaponRarity } from "generated";
import { getOrCreateGlobalStats, getOrCreatePlayer } from ".";

type Context = any;

async function handleBlacksmithActivity(
  context: Context,
  weaponId: bigint,
  amount: bigint,
  activityType: 'repair' | 'sharpen'
) {
  const weapon = await context.Weapon.get(weaponId.toString());
  if (!weapon) {
    context.log.error(`[handleBlacksmithActivity] Weapon ${weaponId} not found.`);
    return;
  }
  if (!weapon.rarity) {
    context.log.error(`[handleBlacksmithActivity] Weapon ${weaponId} has no rarity.`);
    return;
  }

  const [player, globalStats] = await Promise.all([
    getOrCreatePlayer(context, weapon.owner_id),
    getOrCreateGlobalStats(context),
  ]);

  const rarityIndex = Object.values(WeaponRarity).indexOf(weapon.rarity);

  if (activityType === 'repair') {
    // Update weapon
    weapon.durability = weapon.maxDurability;
    weapon.repairedCount += 1n;
    weapon.repairSpent += amount;

    // Update player
    player.totalRepairs += 1n;
    player.totalRepairCost += amount;
    player.repairsByRarity[rarityIndex] += 1n;
    player.repairCostByRarity[rarityIndex] += amount;

    // Update global
    globalStats.totalRepairs += 1n;
    globalStats.totalRepairCost += amount;
    globalStats.repairsByRarity[rarityIndex] += 1n;
    globalStats.repairCostByRarity[rarityIndex] += amount;

  } else { // sharpen
    // Update weapon
    weapon.sharpness = weapon.maxSharpness;
    weapon.sharpenedCount += 1n;
    weapon.sharpenSpent += amount;

    // Update player
    player.totalSharpens += 1n;
    player.totalSharpenCost += amount;
    player.sharpensByRarity[rarityIndex] += 1n;
    player.sharpenCostByRarity[rarityIndex] += amount;

    // Update global
    globalStats.totalSharpens += 1n;
    globalStats.totalSharpenCost += amount;
    globalStats.sharpensByRarity[rarityIndex] += 1n;
    globalStats.sharpenCostByRarity[rarityIndex] += amount;
  }

  context.Weapon.set(weapon);
  context.Player.set(player);
  context.GlobalStats.set(globalStats);
}


export async function handleWeaponRepaired(
  context: Context,
  weaponId: bigint,
  amount: bigint
) {
  await handleBlacksmithActivity(context, weaponId, amount, 'repair');
}

export async function handleWeaponSharpened(
  context: Context,
  weaponId: bigint,
  amount: bigint
) {
  await handleBlacksmithActivity(context, weaponId, amount, 'sharpen');
} 