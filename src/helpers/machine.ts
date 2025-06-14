import {
  WEAPON_RARITY_COUNT,
} from "../constants/index";
import { GlobalStats, Player, WeaponRarity } from "generated";
import { getOrCreateGlobalStats, getOrCreatePlayer } from "./index";
import { parseWeaponMetadata } from "./formulas";

type Context = any;

export async function handleHeroWeaponGeneration(
  context: Context,
  user: string,
  requestId: bigint,
  weaponId: bigint,
  metadata: bigint,
) {
  const request = await context.WeaponMintRequest.get(requestId.toString());
  if (!request) {
    context.log.error(
      `WeaponMintRequest not found for HeroWeaponMachine requestId: ${requestId}`,
    );
    return;
  }

  const {
    rarity: rarityIndex,
    maxDurability,
    maxSharpness,
  } = parseWeaponMetadata(metadata);
  const rarity = Object.values(WeaponRarity)[rarityIndex];

  if (!rarity) {
    context.log.error(
      `Invalid rarity for requestId: ${requestId}. RarityIndex: ${rarityIndex}`,
    );
    return;
  }

  const [player, globalStats, weapon] = await Promise.all([
    getOrCreatePlayer(context, user),
    getOrCreateGlobalStats(context),
    context.Weapon.get(weaponId.toString()),
  ]);

  const newPlayer = { ...player };
  const newGlobalStats = { ...globalStats };

  // --- General Stats ---
  newPlayer.weaponsMinted = (newPlayer.weaponsMinted || 0n) + 1n;
  const newPlayerGeneralRarityCounts = newPlayer.weaponsMintedByRarity ? [...newPlayer.weaponsMintedByRarity] : Array(WEAPON_RARITY_COUNT).fill(0n);
  newPlayerGeneralRarityCounts[rarityIndex] = (newPlayerGeneralRarityCounts[rarityIndex] || 0n) + 1n;
  newPlayer.weaponsMintedByRarity = newPlayerGeneralRarityCounts;

  const newGlobalGeneralRarityCounts = newGlobalStats.weaponsGeneratedByRarity ? [...newGlobalStats.weaponsGeneratedByRarity] : Array(WEAPON_RARITY_COUNT).fill(0n);
  newGlobalGeneralRarityCounts[rarityIndex] = (newGlobalGeneralRarityCounts[rarityIndex] || 0n) + 1n;
  newGlobalStats.weaponsGeneratedByRarity = newGlobalGeneralRarityCounts;

  // --- Specific Stats ---
  newPlayer.weaponsMintedFromHeroMachine = (newPlayer.weaponsMintedFromHeroMachine || 0n) + 1n;
  const newPlayerRarityCounts = [...(newPlayer.weaponsMintedFromHeroMachineByRarity || Array(WEAPON_RARITY_COUNT).fill(0n))];
  newPlayerRarityCounts[rarityIndex] = (newPlayerRarityCounts[rarityIndex] || 0n) + 1n;
  newPlayer.weaponsMintedFromHeroMachineByRarity = newPlayerRarityCounts;

  // Update global stats
  newGlobalStats.totalWeaponsMintedFromHeroMachine = (newGlobalStats.totalWeaponsMintedFromHeroMachine || 0n) + 1n;
  const newGlobalRarityCounts = [...(newGlobalStats.totalWeaponsMintedFromHeroMachineByRarity || Array(WEAPON_RARITY_COUNT).fill(0n))];
  newGlobalRarityCounts[rarityIndex] = (newGlobalRarityCounts[rarityIndex] || 0n) + 1n;
  newGlobalStats.totalWeaponsMintedFromHeroMachineByRarity = newGlobalRarityCounts;

  // --- Owned Stats ---
  const newPlayerOwnedRarityCounts = newPlayer.weaponsOwnedByRarity ? [...newPlayer.weaponsOwnedByRarity] : Array(WEAPON_RARITY_COUNT).fill(0n);
  newPlayerOwnedRarityCounts[rarityIndex] = (newPlayerOwnedRarityCounts[rarityIndex] || 0n) + 1n;
  newPlayer.weaponsOwnedByRarity = newPlayerOwnedRarityCounts;

  const newGlobalOwnedRarityCounts = newGlobalStats.totalWeaponsOwnedByRarity ? [...newGlobalStats.totalWeaponsOwnedByRarity] : Array(WEAPON_RARITY_COUNT).fill(0n);
  newGlobalOwnedRarityCounts[rarityIndex] = (newGlobalOwnedRarityCounts[rarityIndex] || 0n) + 1n;
  newGlobalStats.totalWeaponsOwnedByRarity = newGlobalOwnedRarityCounts;

  if (request.cost && request.qty) {
    const individualCost = request.cost / request.qty;
    newPlayer.hero20SpentOnWeapons = (newPlayer.hero20SpentOnWeapons || 0n) + individualCost;
    newGlobalStats.totalHero20SpentOnWeapons = (newGlobalStats.totalHero20SpentOnWeapons || 0n) + individualCost;
  }

  context.Player.set(newPlayer);
  context.GlobalStats.set(newGlobalStats);

  if (weapon) {
    const newWeapon = {
      ...weapon,
      origin: "WEAPON_MACHINE",
      rarity: rarity,
      durability: maxDurability,
      maxDurability: maxDurability,
      sharpness: maxSharpness,
      maxSharpness: maxSharpness,
    };
    context.Weapon.set(newWeapon);
  } else {
    context.log.error(`Weapon ${weaponId} not found during hero weapon machine generation.`);
  }
  
  const newRequest = { ...request };
  newRequest.generatedCount = (newRequest.generatedCount || 0n) + 1n;
  
  if (newRequest.generatedCount >= newRequest.qty) {
    context.WeaponMintRequest.delete(request.id);
  } else {
    context.WeaponMintRequest.set(newRequest);
  }
} 