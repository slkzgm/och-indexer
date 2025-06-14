/**
 * Helpers pour la création d'entités avec valeurs par défaut
 * Centralise les getOrCreate pour éviter la répétition et garantir la consistance
 */

/**
 * Crée ou récupère un Player avec toutes les valeurs par défaut
 * @param context Le contexte du handler
 * @param playerId L'ID du joueur (sera normalisé en lowercase)
 * @param overrides Champs à override (optionnel)
 * @returns Le Player créé ou existant
 */
export async function getOrCreatePlayer(
  context: any,
  playerId: string,
  overrides: Partial<{
    balance: bigint;
    heroCount: number;
    weaponCount: number;
    stakedHeroCount: number;
    gachaBalances: bigint[];
  }> = {}
) {
  const playerId_lc = playerId.toLowerCase();
  
  return await context.Player.getOrCreate({
    id: playerId_lc,
    balance: 0n,
    heroCount: 0,
    weaponCount: 0,
    stakedHeroCount: 0,
    gachaBalances: [0n, 0n, 0n, 0n], // [bronze, silver, gold, rainbow]
    ...overrides, // Override les valeurs si spécifiées
  });
}

/**
 * Crée un Hero avec toutes les valeurs par défaut
 * Note: Utilise .set() car les Heroes sont toujours créés, jamais récupérés
 * @param context Le contexte du handler
 * @param heroData Les données obligatoires du héro
 */
export function createHero(
  context: any,
  heroData: {
    id: string;
    owner_id: string;
    minter: string;
    mintedTimestamp: bigint;
    level?: number;
    lastTrainingTimestamp?: bigint;
    nextTrainingCost?: bigint;
    nextTrainingAvailable?: bigint;
    damage?: bigint;
    staked?: boolean;
  }
) {
  // Import dynamique pour éviter les dépendances circulaires
  const { calculateTrainingCost } = require('./calculations');
  
  const level = heroData.level || 1;
  
  context.Hero.set({
    id: heroData.id,
    owner_id: heroData.owner_id,
    minter: heroData.minter,
    mintedTimestamp: heroData.mintedTimestamp,
    level: level,
    lastTrainingTimestamp: heroData.lastTrainingTimestamp || 0n,
    nextTrainingCost: heroData.nextTrainingCost || calculateTrainingCost(level),
    nextTrainingAvailable: heroData.nextTrainingAvailable || 0n,
    damage: heroData.damage || 0n,
    staked: heroData.staked || false,
  });
}

/**
 * Crée un Weapon avec toutes les valeurs par défaut
 * Note: Utilise .set() car les Weapons sont toujours créés, jamais récupérés
 * @param context Le contexte du handler
 * @param weaponData Les données obligatoires de l'arme
 */
export function createWeapon(
  context: any,
  weaponData: {
    id: string;
    owner_id: string;
    minter: string;
    mintedTimestamp: bigint;
    origin?: string;
    rarity?: string;
    sharpness?: number;
    maxSharpness?: number;
    durability?: number;
    maxDurability?: number;
    equipped?: boolean;
  }
) {
  context.Weapon.set({
    id: weaponData.id,
    owner_id: weaponData.owner_id,
    minter: weaponData.minter,
    mintedTimestamp: weaponData.mintedTimestamp,
    origin: weaponData.origin || "DIRECT_MINT",
    rarity: weaponData.rarity || "COMMON",
    sharpness: weaponData.sharpness || 100,
    maxSharpness: weaponData.maxSharpness || 100,
    durability: weaponData.durability || 100,
    maxDurability: weaponData.maxDurability || 100,
    equipped: weaponData.equipped || false,
  });
} 