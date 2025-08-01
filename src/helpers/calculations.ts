/**
 * Fonctions de calcul pour le jeu OCH
 * Centralise tous les calculs : training, damage, rewards, etc.
 */

// Constants pour les calculs
const TRAINING_COOLDOWN_SECONDS = 11 * 60 * 60 + 45 * 60; // 11h45
const MIN_HERO_LEVEL = 1;

// Constants pour DragmaUnderlings staking
const UNSTAKE_COOLDOWN_SECONDS = 6 * 60 * 60; // 6h

// Constants pour Fishing staking
const FISHING_UNSTAKE_COOLDOWN_SECONDS = 11 * 60 * 60 + 45 * 60; // 11h45

// Constants pour Dragma staking
const DRAGMA_UNSTAKE_COOLDOWN_SECONDS = 11 * 60 * 60 + 45 * 60; // 11h45

// Mapping des zones fishing vers les StakingType
const FISHING_ZONE_TO_STAKING_TYPE: Record<number, string> = {
  0: "FISHING_SLIME_BAY",
  1: "FISHING_SHROOM_GROTTO",
  2: "FISHING_SKEET_PIER",
  3: "FISHING_MAGMA_MIRE",
};

const DRAGMA_ZONE_TO_STAKING_TYPE: Record<number, string> = {
  0: "DRAGMA_TAILS",
  1: "DRAGMA_LEGS",
  2: "DRAGMA_TORSO",
  3: "DRAGMA_HEAD",
};

// Constants pour les rewards (en wei)
const WEI_SCALE = BigInt("1000000000000000000"); // 1e18
const BASE_REWARD_WEI = 50n * WEI_SCALE; // 50 tokens base

// Weapon coefficients par rareté [0=COMMON, 1=UNCOMMON, 2=RARE, 3=EPIC, 4=HEROIC, 5=LEGENDARY, 6=MYTHIC]
const WEAPON_COEFFICIENTS = [1, 2, 3, 5, 8, 13, 21];

/**
 * Calcule le coût d'entraînement d'un héro selon son niveau
 * Formule: (Level * 10000e18) / (69 + Level)
 * @param level Le niveau actuel du héro
 * @returns Le coût en wei (1e18) pour s'entraîner
 */
export function calculateTrainingCost(level: number): bigint {
  const lvl = BigInt(level);
  // 10000e18 = 10^4 * 10^18 = 10^22
  const SCALE = BigInt("10000000000000000000000");
  const numerator = lvl * SCALE;
  const denominator = BigInt(69 + level);
  return numerator / denominator;
}

/**
 * Calcule le timestamp de disponibilité pour le prochain training
 * @param lastTrainingTimestamp Le timestamp du dernier training
 * @returns Le timestamp où le héro pourra s'entraîner à nouveau
 */
export function calculateNextTrainingAvailable(lastTrainingTimestamp: bigint): bigint {
  return lastTrainingTimestamp + BigInt(TRAINING_COOLDOWN_SECONDS);
}

/**
 * Calcule le timestamp de disponibilité pour unstake (DragmaUnderlings)
 * @param stakedTimestamp Le timestamp du début du staking
 * @returns Le timestamp où le héro pourra être unstake
 */
export function calculateUnstakeAvailable(stakedTimestamp: bigint): bigint {
  return stakedTimestamp + BigInt(UNSTAKE_COOLDOWN_SECONDS);
}

/**
 * Calcule le timestamp de disponibilité pour unstake fishing
 * @param stakedTimestamp Le timestamp du début du staking fishing
 * @returns Le timestamp où le héro pourra être unstake
 */
export function calculateFishingUnstakeAvailable(stakedTimestamp: bigint): bigint {
  return stakedTimestamp + BigInt(FISHING_UNSTAKE_COOLDOWN_SECONDS);
}

/**
 * Calcule le timestamp de disponibilité pour unstake Dragma
 * @param stakedTimestamp Le timestamp du début du staking Dragma
 * @returns Le timestamp où le héro pourra être unstake
 */
export function calculateDragmaUnstakeAvailable(stakedTimestamp: bigint): bigint {
  return stakedTimestamp + BigInt(DRAGMA_UNSTAKE_COOLDOWN_SECONDS);
}

/**
 * Détermine le type de staking fishing basé sur la zone
 * @param zone La zone de fishing (0, 1, 2, 3)
 * @returns Le type de staking correspondant
 */
export function getFishingStakingType(zone: bigint): string {
  const zoneNumber = Number(zone);
  const stakingType = FISHING_ZONE_TO_STAKING_TYPE[zoneNumber];
  
  if (!stakingType) {
    console.warn(`Zone fishing non supportée: ${zone}, utilisation de FISHING_SLIME_BAY par défaut`);
    return "FISHING_SLIME_BAY";
  }
  
  return stakingType;
}

/**
 * Détermine le type de staking Dragma basé sur la zone
 * @param zone La zone de Dragma (0, 1, 2, 3)
 * @returns Le type de staking correspondant
 */
export function getDragmaStakingType(zone: bigint): string {
  const zoneNumber = Number(zone);
  const stakingType = DRAGMA_ZONE_TO_STAKING_TYPE[zoneNumber];
  
  if (!stakingType) {
    console.warn(`Zone Dragma non supportée: ${zone}, utilisation de DRAGMA_TAILS par défaut`);
    return "DRAGMA_TAILS";
  }
  
  return stakingType;
}

/**
 * Valide qu'une zone fishing est supportée
 * @param zone La zone à valider
 * @returns true si la zone est valide
 */
export function isValidFishingZone(zone: bigint): boolean {
  const zoneNumber = Number(zone);
  return zoneNumber >= 0 && zoneNumber <= 3 && FISHING_ZONE_TO_STAKING_TYPE[zoneNumber] !== undefined;
}

export function isValidDragmaZone(zone: bigint): boolean {
  const zoneNumber = Number(zone);
  return zoneNumber >= 0 && zoneNumber <= 3 && DRAGMA_ZONE_TO_STAKING_TYPE[zoneNumber] !== undefined;
}

/**
 * Valide qu'un niveau de héro est dans les limites acceptables
 * @param level Le niveau à valider
 * @returns Le niveau validé (minimum 1)
 */
export function validateHeroLevel(level: number): number {
  return Math.max(level, MIN_HERO_LEVEL);
}

/**
 * Calcule le damage d'un héro basé sur son niveau et sa weapon
 * Formule: damage = level * weaponCoef[rarity]
 * @param level Le niveau du héro
 * @param weaponRarity La rareté de l'arme (0-6)
 * @returns Le damage total
 */
export function calculateHeroDamage(level: number, weaponRarity: number): bigint {
  const coef = WEAPON_COEFFICIENTS[weaponRarity] || 1; // Default COMMON si rareté invalide
  return BigInt(level * coef);
}

/**
 * Calcule les rewards journaliers d'un héro
 * @param damage Le damage total du héro
 * @param level Le niveau du héro
 * @param sharpness La sharpness actuelle de l'arme
 * @param maxSharpness La sharpness maximale de l'arme
 * @returns Les rewards calculés en wei
 */
export function calculateHeroRewards(
  damage: bigint,
  level: number,
  sharpness: number,
  maxSharpness: number
): {
  maxHeroPerDay: bigint;
  baseHeroPerDay: bigint;
  bonusHeroPerDay: bigint;
  effectiveHeroPerDay: bigint;
  maxHeroPerHour: bigint;
  effectiveHeroPerHour: bigint;
} {
  // 1. Maximum $HERO/day: (Damage × 400 × 1e18) / (20 + Hero Level)
  const maxHeroPerDay = (damage * 400n * WEI_SCALE) / BigInt(20 + level);
  
  // 2. Base $HERO/day: 80% of max = (max * 80) / 100
  const baseHeroPerDay = (maxHeroPerDay * 80n) / 100n;
  
  // 3. Sharpness bonus: 20% of max, scaled by sharpness ratio
  // bonusHeroPerDay = (maxHeroPerDay * 20 * sharpness) / (100 * maxSharpness)
  const bonusHeroPerDay = maxSharpness > 0 
    ? (maxHeroPerDay * 20n * BigInt(sharpness)) / (100n * BigInt(maxSharpness))
    : 0n;
  
  // 4. Effective $HERO/day: base + bonus + 50 fixed
  const effectiveHeroPerDay = BASE_REWARD_WEI + baseHeroPerDay + bonusHeroPerDay;
  
  // 5. Hourly equivalents (division par 24)
  const maxHeroPerHour = maxHeroPerDay / 24n;
  const effectiveHeroPerHour = effectiveHeroPerDay / 24n;
  
  return {
    maxHeroPerDay,
    baseHeroPerDay,
    bonusHeroPerDay,
    effectiveHeroPerDay,
    maxHeroPerHour,
    effectiveHeroPerHour,
  };
}

/**
 * Parse les métadonnées d'une weapon depuis un uint32
 * Bits layout:
 *  - bits [0..7]   : rarity
 *  - bits [8..15]  : weaponType
 *  - bits [16..23] : maxSharpness
 *  - bits [24..31] : maxDurability
 * @param metadata Le metadata en uint32
 * @returns Les propriétés parsées de l'arme
 */
export function parseWeaponMetadata(metadata: bigint): {
  rarity: number;
  weaponType: number;
  maxSharpness: number;
  maxDurability: number;
} {
  const meta = Number(metadata);
  
  return {
    rarity: meta & 0xff,                    // bits [0..7]
    weaponType: (meta >> 8) & 0xff,         // bits [8..15]
    maxSharpness: (meta >> 16) & 0xff,      // bits [16..23]
    maxDurability: (meta >> 24) & 0xff,     // bits [24..31]
  };
}

