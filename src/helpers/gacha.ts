import {
  BRONZE_GACHA_ID,
  GOLD_GACHA_ID,
  RAINBOW_GACHA_ID,
  SILVER_GACHA_ID,
  WEAPON_RARITY_COUNT,
  ZERO_ADDRESS,
} from "../constants/index";
import { GachaType, GlobalStats, Player, WeaponRarity } from "generated";
import { getOrCreateGlobalStats, getOrCreatePlayer } from "./";
import { parseWeaponMetadata } from "./formulas";

type Context = any;

async function _updateGachaBalance(
  context: Context,
  playerId: string,
  itemId: string,
  amountChange: bigint,
) {
  const playerId_lc = playerId.toLowerCase();
  const balanceId = `${playerId_lc}-${itemId}`;

  const gachaBalance = await context.GachaBalance.getOrCreate({
    id: balanceId,
    player_id: playerId_lc,
    item_id: itemId,
  });

  gachaBalance.balance += amountChange;
  context.GachaBalance.set(gachaBalance);
}

function _updateGachaStats(
  player: Player,
  globalStats: GlobalStats,
  itemId: bigint,
  amount: bigint,
  type: "mint" | "burn",
) {
  const newPlayer = { ...player };
  const newGlobalStats = { ...globalStats };

  if (type === "mint") {
    newPlayer.gachaMinted = (newPlayer.gachaMinted || 0n) + amount;
    newGlobalStats.totalGachasMinted = (newGlobalStats.totalGachasMinted || 0n) + amount;
    newGlobalStats.gachasCount = (newGlobalStats.gachasCount || 0n) + amount;

    switch (itemId) {
      case BRONZE_GACHA_ID:
        newPlayer.bronzeGachasMinted = (newPlayer.bronzeGachasMinted || 0n) + amount;
        newGlobalStats.totalBronzeGachasMinted = (newGlobalStats.totalBronzeGachasMinted || 0n) + amount;
        newGlobalStats.bronzeGachasCount = (newGlobalStats.bronzeGachasCount || 0n) + amount;
        break;
      case SILVER_GACHA_ID:
        newPlayer.silverGachasMinted = (newPlayer.silverGachasMinted || 0n) + amount;
        newGlobalStats.totalSilverGachasMinted = (newGlobalStats.totalSilverGachasMinted || 0n) + amount;
        newGlobalStats.silverGachasCount = (newGlobalStats.silverGachasCount || 0n) + amount;
        break;
      case GOLD_GACHA_ID:
        newPlayer.goldGachasMinted = (newPlayer.goldGachasMinted || 0n) + amount;
        newGlobalStats.totalGoldGachasMinted = (newGlobalStats.totalGoldGachasMinted || 0n) + amount;
        newGlobalStats.goldGachasCount = (newGlobalStats.goldGachasCount || 0n) + amount;
        break;
      case RAINBOW_GACHA_ID:
        newPlayer.rainbowGachasMinted = (newPlayer.rainbowGachasMinted || 0n) + amount;
        newGlobalStats.totalRainbowGachasMinted = (newGlobalStats.totalRainbowGachasMinted || 0n) + amount;
        newGlobalStats.rainbowGachasCount = (newGlobalStats.rainbowGachasCount || 0n) + amount;
        break;
    }
  } else {
    // type === "burn"
    newPlayer.gachaBurned = (newPlayer.gachaBurned || 0n) + amount;
    newGlobalStats.totalGachasBurned = (newGlobalStats.totalGachasBurned || 0n) + amount;
    newGlobalStats.gachasCount = (newGlobalStats.gachasCount || 0n) - amount;

    switch (itemId) {
      case BRONZE_GACHA_ID:
        newPlayer.bronzeGachasBurned = (newPlayer.bronzeGachasBurned || 0n) + amount;
        newGlobalStats.totalBronzeGachasBurned = (newGlobalStats.totalBronzeGachasBurned || 0n) + amount;
        newGlobalStats.bronzeGachasCount = (newGlobalStats.bronzeGachasCount || 0n) - amount;
        break;
      case SILVER_GACHA_ID:
        newPlayer.silverGachasBurned = (newPlayer.silverGachasBurned || 0n) + amount;
        newGlobalStats.totalSilverGachasBurned = (newGlobalStats.totalSilverGachasBurned || 0n) + amount;
        newGlobalStats.silverGachasCount = (newGlobalStats.silverGachasCount || 0n) - amount;
        break;
      case GOLD_GACHA_ID:
        newPlayer.goldGachasBurned = (newPlayer.goldGachasBurned || 0n) + amount;
        newGlobalStats.totalGoldGachasBurned = (newGlobalStats.totalGoldGachasBurned || 0n) + amount;
        newGlobalStats.goldGachasCount = (newGlobalStats.goldGachasCount || 0n) - amount;
        break;
      case RAINBOW_GACHA_ID:
        newPlayer.rainbowGachasBurned = (newPlayer.rainbowGachasBurned || 0n) + amount;
        newGlobalStats.totalRainbowGachasBurned = (newGlobalStats.totalRainbowGachasBurned || 0n) + amount;
        newGlobalStats.rainbowGachasCount = (newGlobalStats.rainbowGachasCount || 0n) - amount;
        break;
    }
  }
  return { newPlayer, newGlobalStats };
}

export async function handleGachaTransfer(
  context: Context,
  from: string,
  to: string,
  itemId: bigint,
  amount: bigint,
) {
  const from_lc = from.toLowerCase();
  const to_lc = to.toLowerCase();
  const itemId_str = itemId.toString();
  
  if (from_lc === ZERO_ADDRESS) {
    const [player, globalStats] = await Promise.all([
      getOrCreatePlayer(context, to_lc),
      getOrCreateGlobalStats(context),
    ]);
    await context.GachaItem.getOrCreate({ id: itemId_str });
    await _updateGachaBalance(context, to_lc, itemId_str, amount);
    const { newPlayer, newGlobalStats } = _updateGachaStats(player, globalStats, itemId, amount, "mint");
    context.Player.set(newPlayer);
    context.GlobalStats.set(newGlobalStats);
    return;
  }

  if (to_lc === ZERO_ADDRESS) {
    const [player, globalStats] = await Promise.all([
      getOrCreatePlayer(context, from_lc),
       getOrCreateGlobalStats(context),
    ]);
    await context.GachaItem.getOrCreate({ id: itemId_str });
    await _updateGachaBalance(context, from_lc, itemId_str, -amount);
    const { newPlayer, newGlobalStats } = _updateGachaStats(player, globalStats, itemId, amount, "burn");
    context.Player.set(newPlayer);
    context.GlobalStats.set(newGlobalStats);
    return;
  }

  const [fromPlayer, toPlayer, gachaItem, globalStats] = await Promise.all([
    getOrCreatePlayer(context, from_lc),
    getOrCreatePlayer(context, to_lc),
    context.GachaItem.getOrCreate({ id: itemId_str }),
    getOrCreateGlobalStats(context),
  ]);

  await Promise.all([
    _updateGachaBalance(context, from_lc, itemId_str, -amount),
    _updateGachaBalance(context, to_lc, itemId_str, amount),
  ]);
  
  const newFromPlayer = { ...fromPlayer };
  const newToPlayer = { ...toPlayer };
  const newGachaItem = { ...gachaItem };
  const newGlobalStats = { ...globalStats };

  newFromPlayer.gachaTransfersOut = (newFromPlayer.gachaTransfersOut || 0n) + 1n;
  newToPlayer.gachaTransfersIn = (newToPlayer.gachaTransfersIn || 0n) + 1n;
  newGachaItem.transferCount = (newGachaItem.transferCount || 0n) + 1n;
  newGlobalStats.totalGachaTransfers = (newGlobalStats.totalGachaTransfers || 0n) + 1n;

  switch (itemId) {
    case BRONZE_GACHA_ID:
      newFromPlayer.bronzeGachaTransfersOut = (newFromPlayer.bronzeGachaTransfersOut || 0n) + 1n;
      newToPlayer.bronzeGachaTransfersIn = (newToPlayer.bronzeGachaTransfersIn || 0n) + 1n;
      newGlobalStats.totalBronzeGachaTransfers = (newGlobalStats.totalBronzeGachaTransfers || 0n) + 1n;
      break;
    case SILVER_GACHA_ID:
      newFromPlayer.silverGachaTransfersOut = (newFromPlayer.silverGachaTransfersOut || 0n) + 1n;
      newToPlayer.silverGachaTransfersIn = (newToPlayer.silverGachaTransfersIn || 0n) + 1n;
      newGlobalStats.totalSilverGachaTransfers = (newGlobalStats.totalSilverGachaTransfers || 0n) + 1n;
      break;
    case GOLD_GACHA_ID:
      newFromPlayer.goldGachaTransfersOut = (newFromPlayer.goldGachaTransfersOut || 0n) + 1n;
      newToPlayer.goldGachaTransfersIn = (newToPlayer.goldGachaTransfersIn || 0n) + 1n;
      newGlobalStats.totalGoldGachaTransfers = (newGlobalStats.totalGoldGachaTransfers || 0n) + 1n;
      break;
    case RAINBOW_GACHA_ID:
      newFromPlayer.rainbowGachaTransfersOut = (newFromPlayer.rainbowGachaTransfersOut || 0n) + 1n;
      newToPlayer.rainbowGachaTransfersIn = (newToPlayer.rainbowGachaTransfersIn || 0n) + 1n;
      newGlobalStats.totalRainbowGachaTransfers = (newGlobalStats.totalRainbowGachaTransfers || 0n) + 1n;
      break;
  }

  context.Player.set(newFromPlayer);
  context.Player.set(newToPlayer);
  context.GachaItem.set(newGachaItem);
  context.GlobalStats.set(newGlobalStats);
}

function getGachaType(gachaId: bigint): GachaType | null {
  if (gachaId === BRONZE_GACHA_ID) return "Bronze";
  if (gachaId === SILVER_GACHA_ID) return "Silver";
  if (gachaId === GOLD_GACHA_ID) return "Gold";
  if (gachaId === RAINBOW_GACHA_ID) return "Rainbow";
  return null;
}

export async function handleGachaWeaponGeneration(
  context: Context,
  user: string,
  requestId: bigint,
  weaponId: bigint,
  metadata: bigint,
) {
  const request = await context.WeaponMintRequest.get(requestId.toString());
  if (!request) {
    context.log.error(
      `WeaponMintRequest not found for Gacha requestId: ${requestId}`,
    );
    return;
  }

  const {
    rarity: rarityIndex,
    maxDurability,
    maxSharpness,
  } = parseWeaponMetadata(metadata);
  const gachaType = getGachaType(request.gachaRaritySource);
  const rarity = Object.values(WeaponRarity)[rarityIndex];

  if (!gachaType || !rarity) {
    context.log.error(
      `Invalid gachaType or rarity for requestId: ${requestId}. GachaId: ${request.gachaRaritySource}, RarityIndex: ${rarityIndex}`,
    );
    return;
  }

  const [player, globalStats, weapon, playerGachaStat, globalGachaStat] = await Promise.all([
    getOrCreatePlayer(context, user),
    getOrCreateGlobalStats(context),
    context.Weapon.get(weaponId.toString()),
    context.PlayerGachaStat.getOrCreate({
      id: `${user.toLowerCase()}-${gachaType}`,
      player_id: user.toLowerCase(),
      gachaType: gachaType,
      countsByRarity: Array(WEAPON_RARITY_COUNT).fill(0n),
    }),
    context.GlobalGachaStat.getOrCreate({
      id: gachaType,
      gachaType: gachaType,
      global_id: "global_stats", // Assuming "global_stats" is the ID for GlobalStats singleton
      countsByRarity: Array(WEAPON_RARITY_COUNT).fill(0n),
    }),
  ]);

  const newPlayer = { ...player };
  const newGlobalStats = { ...globalStats };
  const newPlayerGachaStat = { ...playerGachaStat };
  const newGlobalGachaStat = { ...globalGachaStat };

  newPlayerGachaStat.totalOpened = (newPlayerGachaStat.totalOpened || 0n) + 1n;
  newPlayerGachaStat.countsByRarity = newPlayerGachaStat.countsByRarity.map((count: bigint, index: number) => index === rarityIndex ? count + 1n : count);

  newGlobalGachaStat.totalOpened = (newGlobalGachaStat.totalOpened || 0n) + 1n;
  newGlobalGachaStat.countsByRarity = newGlobalGachaStat.countsByRarity.map((count: bigint, index: number) => index === rarityIndex ? count + 1n : count);

  newPlayer.weaponsMintedFromGachaByRarity = newPlayer.weaponsMintedFromGachaByRarity.map((count: bigint, index: number) => index === rarityIndex ? count + 1n : count);

  context.PlayerGachaStat.set(newPlayerGachaStat);
  context.GlobalGachaStat.set(newGlobalGachaStat);
  context.Player.set(newPlayer);

  if (weapon) {
    const newWeapon = {
      ...weapon,
      gachaType: gachaType,
      rarity: rarity,
      durability: maxDurability,
      maxDurability: maxDurability,
      sharpness: maxSharpness,
      maxSharpness: maxSharpness,
    };
    context.Weapon.set(newWeapon);
  } else {
    context.log.error(`Weapon ${weaponId} not found during gacha generation.`);
  }

  context.WeaponMintRequest.delete(request.id);
}