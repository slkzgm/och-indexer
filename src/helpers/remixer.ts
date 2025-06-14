// This file will contain the logic for handling weapon remixer stats.
// We will build this out in the next steps.
import {
  REMIXER_AMOUNT_COUNT,
  REMIXER_AMOUNT_MIN,
  WEAPON_RARITY_COUNT,
  WEAPON_RARITY_NAMES,
} from "../constants";
import { parseWeaponMetadata } from "./formulas";
import { getOrCreateGlobalStats, getOrCreatePlayer } from "./";
import { PlayerRemixerStatsByRarity, GlobalRemixerStatsByRarity } from "generated";
import type { WeaponRarity } from "generated";

type Context = any;

async function getOrCreatePlayerRemixerStats(context: Context, playerId: string, rarity: WeaponRarity): Promise<PlayerRemixerStatsByRarity> {
    const id = `${playerId}-${rarity}`;
    // Load existing or create with default arrays
    const stats = await context.PlayerRemixerStatsByRarity.getOrCreate({
        id: id,
        player_id: playerId,
        rarity: rarity,
        remixesByAmount: Array(REMIXER_AMOUNT_COUNT).fill(0n),
        successesByAmount: Array(REMIXER_AMOUNT_COUNT).fill(0n),
        failuresByAmount: Array(REMIXER_AMOUNT_COUNT).fill(0n),
    });
    // Normalize missing numeric and array fields
    let updated = false;
    if (stats.totalRemixes == null) { stats.totalRemixes = 0n; updated = true; }
    if (stats.totalCost == null) { stats.totalCost = 0n; updated = true; }
    if (stats.successCount == null) { stats.successCount = 0n; updated = true; }
    if (stats.failureCount == null) { stats.failureCount = 0n; updated = true; }
    if (stats.bigSuccessCount == null) { stats.bigSuccessCount = 0n; updated = true; }
    if (!stats.remixesByAmount || stats.remixesByAmount.length !== REMIXER_AMOUNT_COUNT) {
        stats.remixesByAmount = Array(REMIXER_AMOUNT_COUNT).fill(0n);
        updated = true;
    }
    if (!stats.successesByAmount || stats.successesByAmount.length !== REMIXER_AMOUNT_COUNT) {
        stats.successesByAmount = Array(REMIXER_AMOUNT_COUNT).fill(0n);
        updated = true;
    }
    if (!stats.failuresByAmount || stats.failuresByAmount.length !== REMIXER_AMOUNT_COUNT) {
        stats.failuresByAmount = Array(REMIXER_AMOUNT_COUNT).fill(0n);
        updated = true;
    }
    if (updated) {
        context.PlayerRemixerStatsByRarity.set(stats);
    }
    return stats;
}

async function getOrCreateGlobalRemixerStats(context: Context, rarity: WeaponRarity): Promise<GlobalRemixerStatsByRarity> {
    const id = rarity;
    // Load existing or create with default arrays
    const stats = await context.GlobalRemixerStatsByRarity.getOrCreate({
        id: id,
        global_id: 'global',
        rarity: rarity,
        remixesByAmount: Array(REMIXER_AMOUNT_COUNT).fill(0n),
        successesByAmount: Array(REMIXER_AMOUNT_COUNT).fill(0n),
        failuresByAmount: Array(REMIXER_AMOUNT_COUNT).fill(0n),
    });
    // Normalize and persist any missing or incorrect-length arrays
    let updated = false;
    if (!stats.remixesByAmount || stats.remixesByAmount.length !== REMIXER_AMOUNT_COUNT) {
        stats.remixesByAmount = Array(REMIXER_AMOUNT_COUNT).fill(0n);
        updated = true;
    }
    if (!stats.successesByAmount || stats.successesByAmount.length !== REMIXER_AMOUNT_COUNT) {
        stats.successesByAmount = Array(REMIXER_AMOUNT_COUNT).fill(0n);
        updated = true;
    }
    if (!stats.failuresByAmount || stats.failuresByAmount.length !== REMIXER_AMOUNT_COUNT) {
        stats.failuresByAmount = Array(REMIXER_AMOUNT_COUNT).fill(0n);
        updated = true;
    }
    if (updated) {
        context.GlobalRemixerStatsByRarity.set(stats);
    }
    return stats;
}

export async function handleRemixerWeaponGeneration(
    context: Context,
    user: string,
    requestId: bigint,
    weaponId: bigint,
    metadata: bigint
) {
    const request = await context.WeaponMintRequest.get(requestId.toString());
    if (!request) {
        context.log.error(`[handleRemixerWeaponGeneration] WeaponMintRequest ${requestId} not found.`);
        return;
    }

    const rawCost = request.cost;
    const cost = rawCost == null ? 0n : typeof rawCost === 'string' ? BigInt(rawCost) : rawCost;
    const { rarity: newRarityValue, maxDurability, maxSharpness } = parseWeaponMetadata(metadata);
    const newRarity = WEAPON_RARITY_NAMES[newRarityValue] as WeaponRarity;
    // Coerce legacy or new remixRarity to enum string
    const oldRarity: WeaponRarity =
      typeof request.remixRarity === "bigint"
        ? (WEAPON_RARITY_NAMES[Number(request.remixRarity)] as WeaponRarity)
        : (request.remixRarity as WeaponRarity);
    
    const levelDiff = newRarityValue - WEAPON_RARITY_NAMES.indexOf(oldRarity);
    const isSuccess = levelDiff > 0;
    const isBigSuccess = levelDiff > 1;
    const isFailure = !isSuccess;

    const [player, globalStats, weapon, playerRemixerStats, globalRemixerStats] = await Promise.all([
        getOrCreatePlayer(context, user),
        getOrCreateGlobalStats(context),
        context.Weapon.get(weaponId.toString()),
        getOrCreatePlayerRemixerStats(context, user, oldRarity),
        getOrCreateGlobalRemixerStats(context, oldRarity),
    ]);
    const newPlayerRemixerStats = { ...playerRemixerStats };
    const newGlobalRemixerStats = { ...globalRemixerStats };

    if (!weapon) {
        context.log.error(`[handleRemixerWeaponGeneration] Weapon ${weaponId} not found.`);
        return;
    }
    
    // Safely derive remix amount index, defaulting to skip per-amount stats if invalid
    const remixAmt = request.remixAmount ?? 0n;
    const amountIndex = Number(remixAmt) - REMIXER_AMOUNT_MIN;
    player.totalRemixes += 1n;
    player.totalRemixCost += cost;
    player.totalRemixSuccesses += isSuccess ? 1n : 0n;
    player.totalRemixBigSuccesses += isBigSuccess ? 1n : 0n;
    player.totalRemixFailures += isFailure ? 1n : 0n;

    globalStats.totalRemixes += 1n;
    globalStats.totalRemixCost += cost;
    globalStats.totalRemixSuccesses += isSuccess ? 1n : 0n;
    globalStats.totalRemixBigSuccesses += isBigSuccess ? 1n : 0n;
    globalStats.totalRemixFailures += isFailure ? 1n : 0n;

    newPlayerRemixerStats.totalRemixes += 1n;
    newPlayerRemixerStats.totalCost += cost;
    newPlayerRemixerStats.successCount += isSuccess ? 1n : 0n;
    newPlayerRemixerStats.bigSuccessCount += isBigSuccess ? 1n : 0n;
    newPlayerRemixerStats.failureCount += isFailure ? 1n : 0n;
    // Only update per-amount arrays if index is in range
    if (amountIndex >= 0 && amountIndex < REMIXER_AMOUNT_COUNT) {
        newPlayerRemixerStats.remixesByAmount[amountIndex] += 1n;
        newPlayerRemixerStats.successesByAmount[amountIndex] += isSuccess ? 1n : 0n;
        newPlayerRemixerStats.failuresByAmount[amountIndex] += isFailure ? 1n : 0n;
    }

    newGlobalRemixerStats.totalRemixes += 1n;
    newGlobalRemixerStats.totalCost += cost;
    newGlobalRemixerStats.successCount += isSuccess ? 1n : 0n;
    newGlobalRemixerStats.bigSuccessCount += isBigSuccess ? 1n : 0n;
    newGlobalRemixerStats.failureCount += isFailure ? 1n : 0n;
    if (amountIndex >= 0 && amountIndex < REMIXER_AMOUNT_COUNT) {
        newGlobalRemixerStats.remixesByAmount[amountIndex] += 1n;
        newGlobalRemixerStats.successesByAmount[amountIndex] += isSuccess ? 1n : 0n;
        newGlobalRemixerStats.failuresByAmount[amountIndex] += isFailure ? 1n : 0n;
    }

    // --- 2. Update Weapon Lifecycle Stats ---
    player.weaponsGeneratedFromRemixer += 1n;
    player.weaponsMinted += 1n;
    globalStats.totalWeaponsGeneratedFromRemixer += 1n;
    globalStats.totalWeaponsMinted += 1n;
    // Only update per-rarity arrays if rarity index is valid
    if (newRarityValue >= 0 && newRarityValue < WEAPON_RARITY_COUNT) {
        player.weaponsGeneratedFromRemixerByRarity[newRarityValue] += 1n;
        player.weaponsMintedByRarity[newRarityValue] += 1n;
        player.weaponsOwnedByRarity[newRarityValue] += 1n;
        globalStats.totalWeaponsGeneratedFromRemixerByRarity[newRarityValue] += 1n;
        globalStats.totalWeaponsMintedByRarity[newRarityValue] += 1n;
        globalStats.weaponsGeneratedByRarity[newRarityValue] += 1n;
        globalStats.totalWeaponsOwnedByRarity[newRarityValue] += 1n;
    } else {
        context.log.warn(`[handleRemixerWeaponGeneration] invalid rarity index ${newRarityValue}`);
    }

    // --- 3. Update Weapon Entity ---
    weapon.origin = "REMIXER";
    weapon.rarity = newRarity;
    weapon.durability = maxDurability;
    weapon.maxDurability = maxDurability;
    weapon.sharpness = maxSharpness;
    weapon.maxSharpness = maxSharpness;

    // --- 4. Save Everything ---
    context.Player.set(player);
    context.GlobalStats.set(globalStats);
    context.Weapon.set(weapon);
    context.PlayerRemixerStatsByRarity.set(newPlayerRemixerStats);
    context.GlobalRemixerStatsByRarity.set(newGlobalRemixerStats);
    context.WeaponMintRequest.deleteUnsafe(request.id);
}

export {}; 