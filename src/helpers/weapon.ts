import { WEAPON_RARITY_COUNT, ZERO_ADDRESS, WEAPON_REMIXER_CONTRACT, WEAPON_RARITY_NAMES } from "../constants";
import { Player, GlobalStats, Weapon } from "generated";
import { getOrCreatePlayer, getOrCreateGlobalStats } from "./index";
import { parseWeaponMetadata } from "./formulas";

type Context = any;

export async function handleDirectWeaponMint(
    context: Context,
    weaponId: string,
    metadata: bigint
) {
    const {
        rarity: rarityIndex,
        maxDurability,
        maxSharpness,
    } = parseWeaponMetadata(metadata);
    const rarity = WEAPON_RARITY_NAMES[rarityIndex];

    const weapon = await context.Weapon.get(weaponId);
    if (!weapon) {
        context.log.error(`[handleDirectWeaponMint] Weapon ${weaponId} not found.`);
        return;
    }
    if (weapon.origin) {
        // Origin already set by another handler (Gacha, HeroMachine), so we skip.
        return;
    }

    const [player, globalStats] = await Promise.all([
        getOrCreatePlayer(context, weapon.owner_id),
        getOrCreateGlobalStats(context),
    ]);

    const newPlayer = { ...player };
    const newGlobalStats = { ...globalStats };

    // --- General Stats ---
    newPlayer.weaponsMinted = (newPlayer.weaponsMinted || 0n) + 1n;
    const newPlayerRarityCounts = newPlayer.weaponsMintedByRarity ? [...newPlayer.weaponsMintedByRarity] : Array(WEAPON_RARITY_COUNT).fill(0n);
    newPlayerRarityCounts[rarityIndex] = (newPlayerRarityCounts[rarityIndex] || 0n) + 1n;
    newPlayer.weaponsMintedByRarity = newPlayerRarityCounts;
    
    // --- Specific Stats ---
    newPlayer.weaponsMintedFromDirectMint = (newPlayer.weaponsMintedFromDirectMint || 0n) + 1n;
    const newPlayerDirectMintRarityCounts = newPlayer.weaponsMintedFromDirectMintByRarity ? [...newPlayer.weaponsMintedFromDirectMintByRarity] : Array(WEAPON_RARITY_COUNT).fill(0n);
    newPlayerDirectMintRarityCounts[rarityIndex] = (newPlayerDirectMintRarityCounts[rarityIndex] || 0n) + 1n;
    newPlayer.weaponsMintedFromDirectMintByRarity = newPlayerDirectMintRarityCounts;

    // --- Global Stats ---
    const newGlobalRarityCounts = newGlobalStats.weaponsGeneratedByRarity ? [...newGlobalStats.weaponsGeneratedByRarity] : Array(WEAPON_RARITY_COUNT).fill(0n);
    newGlobalRarityCounts[rarityIndex] = (newGlobalRarityCounts[rarityIndex] || 0n) + 1n;
    newGlobalStats.weaponsGeneratedByRarity = newGlobalRarityCounts;
    
    // --- Specific Global Stats ---
    newGlobalStats.totalWeaponsMintedFromDirectMint = (newGlobalStats.totalWeaponsMintedFromDirectMint || 0n) + 1n;
    const newGlobalDirectMintRarityCounts = newGlobalStats.totalWeaponsMintedFromDirectMintByRarity ? [...newGlobalStats.totalWeaponsMintedFromDirectMintByRarity] : Array(WEAPON_RARITY_COUNT).fill(0n);
    newGlobalDirectMintRarityCounts[rarityIndex] = (newGlobalDirectMintRarityCounts[rarityIndex] || 0n) + 1n;
    newGlobalStats.totalWeaponsMintedFromDirectMintByRarity = newGlobalDirectMintRarityCounts;

    // --- Owned Stats ---
    const newPlayerOwnedRarityCounts = newPlayer.weaponsOwnedByRarity ? [...newPlayer.weaponsOwnedByRarity] : Array(WEAPON_RARITY_COUNT).fill(0n);
    newPlayerOwnedRarityCounts[rarityIndex] = (newPlayerOwnedRarityCounts[rarityIndex] || 0n) + 1n;
    newPlayer.weaponsOwnedByRarity = newPlayerOwnedRarityCounts;

    const newGlobalOwnedRarityCounts = newGlobalStats.totalWeaponsOwnedByRarity ? [...newGlobalStats.totalWeaponsOwnedByRarity] : Array(WEAPON_RARITY_COUNT).fill(0n);
    newGlobalOwnedRarityCounts[rarityIndex] = (newGlobalOwnedRarityCounts[rarityIndex] || 0n) + 1n;
    newGlobalStats.totalWeaponsOwnedByRarity = newGlobalOwnedRarityCounts;

    context.Player.set(newPlayer);
    context.GlobalStats.set(newGlobalStats);

    const newWeapon = {
        ...weapon,
        origin: "DIRECT_MINT",
        rarity: rarity,
        durability: maxDurability,
        maxDurability: maxDurability,
        sharpness: maxSharpness,
        maxSharpness: maxSharpness,
    };
    context.Weapon.set(newWeapon);
}

export async function handleWeaponTransfer(
  context: Context,
  tokenId: bigint,
  from: string,
  to: string,
  timestamp: bigint,
) {
  const from_lc = from.toLowerCase();
  const to_lc = to.toLowerCase();
  const tokenId_str = tokenId.toString();
  const globalStats = await getOrCreateGlobalStats(context);

  // SACRIFICE TO REMIXER
  if (to_lc === WEAPON_REMIXER_CONTRACT.toLowerCase()) {
    const [player, weapon] = await Promise.all([
      getOrCreatePlayer(context, from_lc),
      context.Weapon.getOrThrow(tokenId_str, `Weapon ${tokenId_str} not found on sacrifice to remixer.`),
    ]);

    if (weapon.rarity) {
      const rarityIndex = WEAPON_RARITY_NAMES.indexOf(weapon.rarity);
      player.weaponsOwnedByRarity[rarityIndex] -= 1n;
      player.weaponsSacrificedToRemixerByRarity[rarityIndex] += 1n;
      globalStats.totalWeaponsOwnedByRarity[rarityIndex] -= 1n;
      globalStats.totalWeaponsSacrificedToRemixerByRarity[rarityIndex] += 1n;
    }
    
    player.weaponsCount -= 1n;
    player.weaponsSacrificedToRemixer += 1n;
    globalStats.weaponsCount -= 1n;
    globalStats.totalWeaponsSacrificedToRemixer += 1n;
    
    context.Player.set(player);
    context.GlobalStats.set(globalStats);
    context.Weapon.delete(tokenId_str); 
    return;
  }
  
  // MINT
  if (from_lc === ZERO_ADDRESS) {
    const minter = await getOrCreatePlayer(context, to_lc);
    minter.weaponsCount += 1n;
    globalStats.weaponsCount += 1n;

    context.Player.set(minter);
    context.GlobalStats.set(globalStats);

    // Initialize new weapon with all required fields
    context.Weapon.set({
      id: tokenId_str,
      owner_id: to_lc,
      minter_id: to_lc,
      origin: "DIRECT_MINT",
      rarity: WEAPON_RARITY_NAMES[0], // placeholder until metadata arrives
      mintedTimestamp: timestamp,
      transferCount: 0n,
      durability: 0n,
      maxDurability: 0n,
      repairedCount: 0n,
      repairSpent: 0n,
      sharpness: 0n,
      maxSharpness: 0n,
      sharpenedCount: 0n,
      sharpenSpent: 0n,
      totalStakedHeroesCount: 0n,
      playersWithStakedHeroesCount: 0n,
      totalStakingCount: 0n,
      grandTotalDailyReward: 0n,
      grandTotalHourlyReward: 0n,
      grandTotalClaimedFromStaking: 0n,
      grandTotalStakedTime: 0n,
      totalStakedHeroesCountByLevel: [],
      totalStakedHeroesCountByWeaponRarity: Array(WEAPON_RARITY_COUNT).fill(0n),
    });
    return;
  }
  
  const weapon = await context.Weapon.getOrThrow(tokenId_str, `Weapon ${tokenId_str} not found on transfer.`);

  // BURN
  if (to_lc === ZERO_ADDRESS) {
    const fromPlayer = await getOrCreatePlayer(context, from_lc);
    
    if (weapon.rarity) {
        const rarityIndex = WEAPON_RARITY_NAMES.indexOf(weapon.rarity);
        fromPlayer.weaponsOwnedByRarity[rarityIndex] -= 1n;
        fromPlayer.weaponsBurnedByRarity[rarityIndex] += 1n;
        globalStats.totalWeaponsOwnedByRarity[rarityIndex] -= 1n;
        globalStats.totalWeaponsBurnedByRarity[rarityIndex] += 1n;
    }
    
    fromPlayer.weaponsBurned += 1n;
    fromPlayer.weaponsCount -= 1n;
    globalStats.totalWeaponsBurned += 1n;
    globalStats.weaponsCount -= 1n;
    
    weapon.transferCount += 1n;
    
    context.Player.set(fromPlayer);
    context.GlobalStats.set(globalStats);
    context.Weapon.set(weapon);
    // On ne supprime pas l'arme, on la considère juste comme "burn" mais on garde son historique
    return;
  }
  
  // TRANSFER
  const fromPlayer = await getOrCreatePlayer(context, from_lc);
  const toPlayer = from_lc === to_lc ? fromPlayer : await getOrCreatePlayer(context, to_lc);

  if (weapon.rarity) {
      const rarityIndex = WEAPON_RARITY_NAMES.indexOf(weapon.rarity);
      fromPlayer.weaponsOwnedByRarity[rarityIndex] -= 1n;
      toPlayer.weaponsOwnedByRarity[rarityIndex] += 1n;
  }
  
  fromPlayer.weaponsCount -= 1n;
  fromPlayer.weaponTransfersOut += 1n;
  toPlayer.weaponsCount += 1n;
  toPlayer.weaponTransfersIn += 1n;

  globalStats.totalWeaponTransfers += 1n;

  weapon.owner_id = to_lc;
  weapon.transferCount += 1n;

  context.Player.set(fromPlayer);
  if (from_lc !== to_lc) {
      context.Player.set(toPlayer);
  }
  context.Weapon.set(weapon);
  context.GlobalStats.set(globalStats);
} 