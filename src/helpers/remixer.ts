// This file will contain the logic for handling weapon remixer stats.
// We will build this out in the next steps.
import {
  REMIXER_AMOUNT_COUNT,
  REMIXER_AMOUNT_MIN,
  WEAPON_RARITY_COUNT,
} from "../constants";
import { parseWeaponMetadata } from "./formulas";
import { getOrCreateGlobalStats, getOrCreatePlayer } from "./";

type Context = any;

async function getOrCreatePlayerRemixerStats(
  context: Context,
  playerId: string,
  rarity: number,
) {
  const id = `${playerId}-${rarity}`;
  return await context.PlayerRemixerStatsByRarity.getOrCreate({
    id,
    player_id: playerId,
    rarity: rarity,
    remixesByAmount: Array(REMIXER_AMOUNT_COUNT).fill(0n),
    successesByAmount: Array(REMIXER_AMOUNT_COUNT).fill(0n),
    failuresByAmount: Array(REMIXER_AMOUNT_COUNT).fill(0n),
  });
}

async function getOrCreateGlobalRemixerStats(context: Context, rarity: number) {
  const id = rarity.toString();
  return await context.GlobalRemixerStatsByRarity.getOrCreate({
    id,
    rarity: rarity,
    remixesByAmount: Array(REMIXER_AMOUNT_COUNT).fill(0n),
    successesByAmount: Array(REMIXER_AMOUNT_COUNT).fill(0n),
    failuresByAmount: Array(REMIXER_AMOUNT_COUNT).fill(0n),
  });
}

export async function handleRemixGeneration(
  context: Context,
  user: string,
  requestId: bigint,
  weaponId: bigint,
  metadata: bigint,
) {
  // 1. Load the pending request
  const request = await context.WeaponMintRequest.get(requestId.toString());
  if (!request) {
    context.log.error(
      `WeaponMintRequest not found for requestId: ${requestId}`,
    );
    return;
  }

  // 2. Parse new weapon metadata
  const { rarity: newRarity } = parseWeaponMetadata(metadata);

  // 3. Determine outcome
  const remixRarity = request.remixRarity as number;
  const levelDiff = newRarity - remixRarity;
  const isSuccess = levelDiff > 0;
  const isBigSuccess = levelDiff > 1;
  const isFailure = !isSuccess;

  // 4. Load all entities to update
  const [
    player,
    globalStats,
    playerRemixerStats,
    globalRemixerStats,
  ] = await Promise.all([
    getOrCreatePlayer(context, user),
    getOrCreateGlobalStats(context),
    getOrCreatePlayerRemixerStats(context, user, remixRarity),
    getOrCreateGlobalRemixerStats(context, remixRarity),
  ]);

  // 5. Update all stats
  const amountIndex = Number(request.remixAmount) - REMIXER_AMOUNT_MIN;

  // 5.1 Update Player stats
  player.totalRemixes += 1n;
  player.totalRemixCost += request.cost;
  player.totalRemixSuccesses += isSuccess ? 1n : 0n;
  player.totalRemixBigSuccesses += isBigSuccess ? 1n : 0n;
  player.totalRemixFailures += isFailure ? 1n : 0n;

  // 5.2 Update Global stats
  globalStats.totalRemixes += 1n;
  globalStats.totalRemixCost += request.cost;
  globalStats.totalRemixSuccesses += isSuccess ? 1n : 0n;
  globalStats.totalRemixBigSuccesses += isBigSuccess ? 1n : 0n;
  globalStats.totalRemixFailures += isFailure ? 1n : 0n;

  // 5.3 Update PlayerRemixerStatsByRarity
  playerRemixerStats.totalRemixes += 1n;
  playerRemixerStats.totalCost += request.cost;
  playerRemixerStats.successCount += isSuccess ? 1n : 0n;
  playerRemixerStats.bigSuccessCount += isBigSuccess ? 1n : 0n;
  playerRemixerStats.failureCount += isFailure ? 1n : 0n;
  playerRemixerStats.remixesByAmount[amountIndex] += 1n;
  playerRemixerStats.successesByAmount[amountIndex] += isSuccess ? 1n : 0n;
  playerRemixerStats.failuresByAmount[amountIndex] += isFailure ? 1n : 0n;

  // 5.4 Update GlobalRemixerStatsByRarity
  globalRemixerStats.totalRemixes += 1n;
  globalRemixerStats.totalCost += request.cost;
  globalRemixerStats.successCount += isSuccess ? 1n : 0n;
  globalRemixerStats.bigSuccessCount += isBigSuccess ? 1n : 0n;
  globalRemixerStats.failureCount += isFailure ? 1n : 0n;
  globalRemixerStats.remixesByAmount[amountIndex] += 1n;
  globalRemixerStats.successesByAmount[amountIndex] += isSuccess ? 1n : 0n;
  globalRemixerStats.failuresByAmount[amountIndex] += isFailure ? 1n : 0n;

  // 6. Create the new Weapon
  // TODO: This part will be enhanced when we create a full handleWeaponMint helper
  // For now, we just log it.
  context.log.info(`Weapon ${weaponId} generated from remix.`);

  // 7. Delete the temporary request entity
  context.WeaponMintRequest.deleteUnsafe(request.id);

  // 8. Save all updated entities
  context.Player.set(player);
  context.GlobalStats.set(globalStats);
  context.PlayerRemixerStatsByRarity.set(playerRemixerStats);
  context.GlobalRemixerStatsByRarity.set(globalRemixerStats);
}

export {}; 