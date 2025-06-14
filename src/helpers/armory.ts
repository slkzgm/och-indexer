import {
  GlobalArmoryStatsByLevel,
  GlobalStats,
  Hero,
  Player,
  PlayerArmoryStatsByLevel,
  Weapon,
} from 'generated';
import { DAMAGE_COEFFICIENTS, WEAPON_RARITY_COUNT } from '../constants';

/**
 * Computes the damage for a hero based on its level and weapon rarity.
 */
export function computeDamage(level: bigint, rarity: number): bigint {
  const coef = DAMAGE_COEFFICIENTS[rarity] ?? 0n;
  return level * coef;
}

type Context = {
    Hero: { set: (hero: Hero) => void; };
    Weapon: { set: (weapon: Weapon) => void; };
    Player: { set: (player: Player) => void; };
    GlobalStats: { set: (stats: GlobalStats) => void; };
    PlayerArmoryStatsByLevel: { get: (id: string) => Promise<PlayerArmoryStatsByLevel | undefined>; set: (stats: PlayerArmoryStatsByLevel) => void; };
    GlobalArmoryStatsByLevel: { get: (id: string) => Promise<GlobalArmoryStatsByLevel | undefined>; set: (stats: GlobalArmoryStatsByLevel) => void; };
};

/**
 * Handles the logic for equipping a weapon to a hero.
 * It updates hero, weapon, player, and global stats.
 *
 * NOTE: This function assumes the hero does NOT have a weapon currently equipped.
 * The caller is responsible for handling any previously equipped weapon first.
 */
export async function handleEquip(
  context: Context,
  heroEntity: Hero,
  weaponEntity: Weapon,
  playerEntity: Player,
  globalStatsEntity: GlobalStats,
): Promise<void> {
  // Clone entities to make them mutable
  const hero = { ...heroEntity };
  const weapon = { ...weaponEntity };
  const player = { ...playerEntity };
  const globalStats = { ...globalStatsEntity };

  const newDamage = computeDamage(BigInt(hero.level), Number(weapon.rarity));
  const weaponRarity = Number(weapon.rarity);

  // 1. Update Hero and Weapon entities
  hero.damage = newDamage;
  hero.equippedWeapon_id = weapon.id;
  weapon.equippedBy_id = hero.id;

  // 2. Update Player stats
  player.equippedHeroesCount = (player.equippedHeroesCount ?? 0n) + 1n;
  player.totalEquippedDamage = (player.totalEquippedDamage ?? 0n) + newDamage;
  
  const newPlayerRarities = player.equippedHeroesCountByWeaponRarity ? player.equippedHeroesCountByWeaponRarity.map(BigInt) : Array(WEAPON_RARITY_COUNT).fill(0n);
  newPlayerRarities[weaponRarity] = (newPlayerRarities[weaponRarity] ?? 0n) + 1n;
  player.equippedHeroesCountByWeaponRarity = newPlayerRarities;

  const newPlayerDamageByRarity = player.totalEquippedDamageByWeaponRarity ? player.totalEquippedDamageByWeaponRarity.map(BigInt) : Array(WEAPON_RARITY_COUNT).fill(0n);
  newPlayerDamageByRarity[weaponRarity] = (newPlayerDamageByRarity[weaponRarity] ?? 0n) + newDamage;
  player.totalEquippedDamageByWeaponRarity = newPlayerDamageByRarity;

  // 3. Update Global stats
  globalStats.totalEquippedHeroesCount = (globalStats.totalEquippedHeroesCount ?? 0n) + 1n;
  globalStats.grandTotalEquippedDamage = (globalStats.grandTotalEquippedDamage ?? 0n) + newDamage;

  const newGlobalRarities = globalStats.totalEquippedHeroesCountByWeaponRarity ? globalStats.totalEquippedHeroesCountByWeaponRarity.map(BigInt) : Array(WEAPON_RARITY_COUNT).fill(0n);
  newGlobalRarities[weaponRarity] = (newGlobalRarities[weaponRarity] ?? 0n) + 1n;
  globalStats.totalEquippedHeroesCountByWeaponRarity = newGlobalRarities;

  const newGlobalDamageByRarity = globalStats.grandTotalEquippedDamageByWeaponRarity ? globalStats.grandTotalEquippedDamageByWeaponRarity.map(BigInt) : Array(WEAPON_RARITY_COUNT).fill(0n);
  newGlobalDamageByRarity[weaponRarity] = (newGlobalDamageByRarity[weaponRarity] ?? 0n) + newDamage;
  globalStats.grandTotalEquippedDamageByWeaponRarity = newGlobalDamageByRarity;

  // 4. Update stats by level (Player and Global)
  const playerLevelStats = await context.PlayerArmoryStatsByLevel.get(`${player.id}-${hero.level}`);
  if (playerLevelStats) {
      const newPlayerLevelStats = { ...playerLevelStats };
      newPlayerLevelStats.equippedHeroesCount = (newPlayerLevelStats.equippedHeroesCount ?? 0n) + 1n;
      newPlayerLevelStats.totalDamage = (newPlayerLevelStats.totalDamage ?? 0n) + newDamage;
      const rarities = newPlayerLevelStats.equippedCountByRarity ? newPlayerLevelStats.equippedCountByRarity.map(BigInt) : Array(WEAPON_RARITY_COUNT).fill(0n);
      rarities[weaponRarity] = (rarities[weaponRarity] ?? 0n) + 1n;
      newPlayerLevelStats.equippedCountByRarity = rarities;
      context.PlayerArmoryStatsByLevel.set(newPlayerLevelStats);
  }
  
  const globalLevelStats = await context.GlobalArmoryStatsByLevel.get(hero.level.toString());
  if (globalLevelStats) {
      const newGlobalLevelStats = { ...globalLevelStats };
      newGlobalLevelStats.equippedHeroesCount = (newGlobalLevelStats.equippedHeroesCount ?? 0n) + 1n;
      newGlobalLevelStats.totalDamage = (newGlobalLevelStats.totalDamage ?? 0n) + newDamage;
      const rarities = newGlobalLevelStats.equippedCountByRarity ? newGlobalLevelStats.equippedCountByRarity.map(BigInt) : Array(WEAPON_RARITY_COUNT).fill(0n);
      rarities[weaponRarity] = (rarities[weaponRarity] ?? 0n) + 1n;
      newGlobalLevelStats.equippedCountByRarity = rarities;
      context.GlobalArmoryStatsByLevel.set(newGlobalLevelStats);
  }

  // Set the modified entities
  context.Hero.set(hero);
  context.Weapon.set(weapon);
  context.Player.set(player);
  context.GlobalStats.set(globalStats);
}

/**
 * Handles the logic for unequipping a weapon from a hero.
 * It updates hero, weapon, player, and global stats.
 */
export async function handleUnequip(
  context: Context,
  heroEntity: Hero,
  weaponEntity: Weapon,
  playerEntity: Player,
  globalStatsEntity: GlobalStats,
): Promise<void> {
  // Clone entities
  const hero = { ...heroEntity };
  const weapon = { ...weaponEntity };
  const player = { ...playerEntity };
  const globalStats = { ...globalStatsEntity };

  const oldDamage = hero.damage;
  const weaponRarity = Number(weapon.rarity);

  // 1. Update Hero and Weapon entities
  hero.damage = 0n;
  hero.equippedWeapon_id = undefined;
  weapon.equippedBy_id = undefined;

  // 2. Update Player stats
  player.equippedHeroesCount = (player.equippedHeroesCount ?? 1n) - 1n;
  player.totalEquippedDamage = (player.totalEquippedDamage ?? oldDamage) - oldDamage;
  
  const newPlayerRarities = player.equippedHeroesCountByWeaponRarity ? player.equippedHeroesCountByWeaponRarity.map(BigInt) : Array(WEAPON_RARITY_COUNT).fill(0n);
  newPlayerRarities[weaponRarity] = (newPlayerRarities[weaponRarity] ?? 1n) - 1n;
  player.equippedHeroesCountByWeaponRarity = newPlayerRarities;

  const newPlayerDamageByRarity = player.totalEquippedDamageByWeaponRarity ? player.totalEquippedDamageByWeaponRarity.map(BigInt) : Array(WEAPON_RARITY_COUNT).fill(0n);
  newPlayerDamageByRarity[weaponRarity] = (newPlayerDamageByRarity[weaponRarity] ?? oldDamage) - oldDamage;
  player.totalEquippedDamageByWeaponRarity = newPlayerDamageByRarity;

  // 3. Update Global stats
  globalStats.totalEquippedHeroesCount = (globalStats.totalEquippedHeroesCount ?? 1n) - 1n;
  globalStats.grandTotalEquippedDamage = (globalStats.grandTotalEquippedDamage ?? oldDamage) - oldDamage;

  const newGlobalRarities = globalStats.totalEquippedHeroesCountByWeaponRarity ? globalStats.totalEquippedHeroesCountByWeaponRarity.map(BigInt) : Array(WEAPON_RARITY_COUNT).fill(0n);
  newGlobalRarities[weaponRarity] = (newGlobalRarities[weaponRarity] ?? 1n) - 1n;
  globalStats.totalEquippedHeroesCountByWeaponRarity = newGlobalRarities;

  const newGlobalDamageByRarity = globalStats.grandTotalEquippedDamageByWeaponRarity ? globalStats.grandTotalEquippedDamageByWeaponRarity.map(BigInt) : Array(WEAPON_RARITY_COUNT).fill(0n);
  newGlobalDamageByRarity[weaponRarity] = (newGlobalDamageByRarity[weaponRarity] ?? oldDamage) - oldDamage;
  globalStats.grandTotalEquippedDamageByWeaponRarity = newGlobalDamageByRarity;

  // 4. Update stats by level (Player and Global)
  const playerLevelStats = await context.PlayerArmoryStatsByLevel.get(`${player.id}-${hero.level}`);
  if (playerLevelStats) {
      const newPlayerLevelStats = { ...playerLevelStats };
      newPlayerLevelStats.equippedHeroesCount = (newPlayerLevelStats.equippedHeroesCount ?? 1n) - 1n;
      newPlayerLevelStats.totalDamage = (newPlayerLevelStats.totalDamage ?? oldDamage) - oldDamage;
      const rarities = newPlayerLevelStats.equippedCountByRarity ? newPlayerLevelStats.equippedCountByRarity.map(BigInt) : Array(WEAPON_RARITY_COUNT).fill(0n);
      rarities[weaponRarity] = (rarities[weaponRarity] ?? 1n) - 1n;
      newPlayerLevelStats.equippedCountByRarity = rarities;
      context.PlayerArmoryStatsByLevel.set(newPlayerLevelStats);
  }

  const globalLevelStats = await context.GlobalArmoryStatsByLevel.get(hero.level.toString());
  if (globalLevelStats) {
      const newGlobalLevelStats = { ...globalLevelStats };
      newGlobalLevelStats.equippedHeroesCount = (newGlobalLevelStats.equippedHeroesCount ?? 1n) - 1n;
      newGlobalLevelStats.totalDamage = (newGlobalLevelStats.totalDamage ?? oldDamage) - oldDamage;
      const rarities = newGlobalLevelStats.equippedCountByRarity ? newGlobalLevelStats.equippedCountByRarity.map(BigInt) : Array(WEAPON_RARITY_COUNT).fill(0n);
      rarities[weaponRarity] = (rarities[weaponRarity] ?? 1n) - 1n;
      newGlobalLevelStats.equippedCountByRarity = rarities;
      context.GlobalArmoryStatsByLevel.set(newGlobalLevelStats);
  }
  
  context.Hero.set(hero);
  context.Weapon.set(weapon);
  context.Player.set(player);
  context.GlobalStats.set(globalStats);
} 