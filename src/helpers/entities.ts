/**
 * Helpers pour la création d'entités avec valeurs par défaut
 * Centralise les getOrCreate pour éviter la répétition et garantir la consistance
 */

/**
 * Version optimisée pour les loaders - utilise context.getOrCreate()
 * @param context Le contexte du loader/handler
 * @param playerId L'ID du joueur (sera normalisé en lowercase)
 * @param overrides Champs à override (optionnel)
 * @returns Le Player créé ou existant
 */
export async function getOrCreatePlayerOptimized(
  context: any,
  playerId: string,
  overrides: Partial<{
    balance: bigint;
    heroCount: number;
    weaponCount: number;
    stakedHeroCount: number;
    gachaBalances: bigint[];
    itemsBalances: bigint[];
    totalSpent: bigint;
  }> = {}
) {
  const playerId_lc = playerId.toLowerCase();
  
  return await context.Player.getOrCreate({
    id: playerId_lc,
    balance: 0n,
    heroCount: 0,
    weaponCount: 0,
    stakedHeroCount: 0,
    heroesByLevel: Array(101).fill(0),
    gachaBalances: [0n, 0n, 0n, 0n], // [bronze, silver, gold, rainbow]
    itemsBalances: Array(21).fill(0n), // [tokenId1, tokenId2, ..., tokenId21]
    totalSpent: 0n, // Total spent across all game activities
    ...overrides, // Override les valeurs si spécifiées
  });
}

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
    itemsBalances: bigint[];
    totalSpent: bigint;
  }> = {}
) {
  const playerId_lc = playerId.toLowerCase();
  
  return await context.Player.getOrCreate({
    id: playerId_lc,
    balance: 0n,
    heroCount: 0,
    weaponCount: 0,
    stakedHeroCount: 0,
    heroesByLevel: Array(101).fill(0),
    gachaBalances: [0n, 0n, 0n, 0n], // [bronze, silver, gold, rainbow]
    itemsBalances: Array(21).fill(0n), // [tokenId1, tokenId2, ..., tokenId21]
    totalSpent: 0n, // Total spent across all game activities
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
    revealed?: boolean;
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
    revealed: heroData.revealed || false,
    damage: heroData.damage || 0n,
    // Rewards fields (default to 0, will be calculated when weapon equipped)
    maxHeroPerDay: 0n,
    baseHeroPerDay: 0n,
    bonusHeroPerDay: 0n,
    effectiveHeroPerDay: 0n,
    maxHeroPerHour: 0n,
    effectiveHeroPerHour: 0n,
    staked: heroData.staked || false,
    stakingType: undefined,
    stakedTimestamp: 0n,
    unstakeAvailableTimestamp: 0n,
    lastClaimTimestamp: 0n,
    totalRewardsClaimed: 0n,
    totalStakingDuration: 0n,
    totalStakes: 0,
    totalUnstakes: 0,
    totalClaims: 0,
    totalFishingFees: 0n,
    totalFishingRewards: 0n,
    fishingRewardsPerZone: [0n,0n,0n,0n],
    totalFishingShards: 0,
    fishingShardsPerZone: [0,0,0,0],
    totalFishingBonuses: 0,
    fishingBonusesPerZone: [0,0,0,0],
    totalFishingSessions: 0,
    fishingSessionsPerZone: [0,0,0,0],
    
    // Death and revival system
    isDead: false,
    deathLocation: undefined, // null when alive or revived
    deathsCount: 0,
    revivalCount: 0,
    spentOnRevive: 0n,
    
    // Fishing-specific death/revival stats
    fishingDeathCount: 0,
    fishingRevivalCount: 0,
    fishingReviveSpent: 0n,
    
    // Dragma-specific death/revival stats
    dragmaDeathCount: 0,
    dragmaRevivalCount: 0,
    dragmaReviveSpent: 0n,
    
    totalAttemptedTrainings: 0,
    totalSuccessfulTrainings: 0,
    totalFailedTrainings: 0,
    attemptedByType: [0,0,0],
    successfulByType: [0,0,0],
    failedByType: [0,0,0],
    totalOutcomeSumByType: [0n,0n,0n],
    outcomesCountByType: [Array(11).fill(0), Array(11).fill(0), Array(11).fill(0)],
    sumOfChancesByType: [Array(11).fill(0n), Array(11).fill(0n), Array(11).fill(0n)],
    chancesCountByType: [0,0,0],
    totalSpent: 0n,
    spentByType: [0n,0n,0n],
    totalTrainingCost: 0n,
    trainingCostByType: [0n,0n,0n],
  });
}

/**
 * Recalcule et met à jour les stats d'un héro (damage et rewards)
 * @param context Le contexte du handler
 * @param hero L'entité Hero à mettre à jour
 * @param weapon L'arme équipée (null si pas d'arme)
 */
export async function updateHeroStats(
  context: any,
  hero: any,
  weapon: any | null
) {
  // Import dynamique pour éviter les dépendances circulaires
  const { calculateHeroDamage, calculateHeroRewards } = require('./calculations');
  
  let damage = 0n;
  let rewards = {
    maxHeroPerDay: 0n,
    baseHeroPerDay: 0n,
    bonusHeroPerDay: 0n,
    effectiveHeroPerDay: 0n,
    maxHeroPerHour: 0n,
    effectiveHeroPerHour: 0n,
  };
  
  // Si une arme est équipée, calcule damage et rewards
  if (weapon) {
    damage = calculateHeroDamage(hero.level, weapon.rarity);
    rewards = calculateHeroRewards(
      damage,
      hero.level,
      weapon.sharpness,
      weapon.maxSharpness
    );
  }
  
  // Met à jour le héro avec les nouvelles stats
  const updatedHero = {
    ...hero,
    damage,
    maxHeroPerDay: rewards.maxHeroPerDay,
    baseHeroPerDay: rewards.baseHeroPerDay,
    bonusHeroPerDay: rewards.bonusHeroPerDay,
    effectiveHeroPerDay: rewards.effectiveHeroPerDay,
    maxHeroPerHour: rewards.maxHeroPerHour,
    effectiveHeroPerHour: rewards.effectiveHeroPerHour,
  };
  
  context.Hero.set(updatedHero);
  return updatedHero;
}

/**
 * Met à jour une arme et recalcule les stats du héro équipé si nécessaire
 * Gère automatiquement le champ broken basé sur la durability
 * @param context Le contexte du handler
 * @param weapon L'arme à mettre à jour
 * @param updates Les champs à mettre à jour
 * @param preloadedHero Le héro préchargé (optionnel)
 */
export async function updateWeaponAndHeroStats(
  context: any,
  weapon: any,
  updates: Partial<{
    sharpness: number;
    maxSharpness: number;
    durability: number;
    maxDurability: number;
    broken: boolean;
  }>,
  preloadedHero: any | null = null,
) {
  // Calcule automatiquement broken si durability est mise à jour
  const newDurability = updates.durability != undefined ? updates.durability : weapon.durability;
  
  // Met à jour l'arme (broken automatique sauf si explicitement fourni)
  const updatedWeapon = {
    ...weapon,
    ...updates,
    broken: updates.broken !== undefined ? updates.broken : newDurability === 0,
  };
  
  context.Weapon.set(updatedWeapon);

  // OPTIMISATION : Recalcule les stats seulement si sharpness ou maxSharpness changent
  const sharpnessChanged = updates.sharpness !== undefined || updates.maxSharpness !== undefined;
  
  if (weapon.equipped && weapon.equippedHeroId && sharpnessChanged) {
    // Utilise le héro préchargé si fourni, sinon récupère-le depuis la BD
    const equippedHero = preloadedHero ?? await context.Hero.get(weapon.equippedHeroId);
    
    // Recalcule les stats pour le héros équipé
    if (equippedHero) {
      await updateHeroStats(context, equippedHero, updatedWeapon);
    }
  }

  return updatedWeapon;
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
    source?: string;
    rarity?: number;
    weaponType?: number;
    sharpness?: number;
    maxSharpness?: number;
    durability?: number;
    maxDurability?: number;
    equipped?: boolean;
    requestId?: string;
    sourceGachaTokenId?: bigint;
    sourceHeroCost?: bigint;
    sourceRemixedWeaponIds?: bigint[];
    sourceRemixRarity?: number;
    sourceRemixType?: string;
  }
) {
  context.Weapon.set({
    id: weaponData.id,
    owner_id: weaponData.owner_id,
    minter: weaponData.minter,
    mintedTimestamp: weaponData.mintedTimestamp,
    source: weaponData.source || "DIRECT_MINT",
    rarity: weaponData.rarity || 0, // 0 = COMMON par défaut
    weaponType: weaponData.weaponType || 0,
    sharpness: weaponData.sharpness || 100,
    maxSharpness: weaponData.maxSharpness || 100,
    durability: weaponData.durability || 100,
    maxDurability: weaponData.maxDurability || 100,
    broken: weaponData.durability === 0 || false, // Broken si durability = 0
    equipped: weaponData.equipped || false,
    equippedHeroId: undefined, // Pas équipée par défaut
    requestId: weaponData.requestId || null,
    sourceGachaTokenId: weaponData.sourceGachaTokenId || undefined,
    sourceHeroCost: weaponData.sourceHeroCost || undefined,
    sourceRemixedWeaponIds: weaponData.sourceRemixedWeaponIds || undefined,
    sourceRemixRarity: weaponData.sourceRemixRarity ?? undefined,
    sourceRemixType: weaponData.sourceRemixType || undefined,
  });
}

/**
 * Crée une WeaponRequest pour tracking des requests
 * @param context Le contexte du handler
 * @param requestData Les données de la request
 */
export function createWeaponRequest(
  context: any,
  requestData: {
    id: string;
    source: string;
    requester: string;
    timestamp: bigint;
    expectedWeapons: number;
    gachaTokenId?: bigint;
    gachaQty?: number;
    heroSlot?: bigint;
    heroQty?: number;
    heroCost?: bigint;
    heroCostPerWeapon?: bigint;
    remixedWeaponIds?: bigint[];
    remixRarity?: number;
    remixType?: string;
    remixCost?: bigint;
  }
) {
  context.WeaponRequest.set({
    id: requestData.id,
    source: requestData.source,
    requester: requestData.requester,
    timestamp: requestData.timestamp,
    expectedWeapons: requestData.expectedWeapons,
    generatedWeapons: 0,
    completed: false,
    generatedWeaponIds: [],
    gachaTokenId: requestData.gachaTokenId || undefined,
    gachaQty: requestData.gachaQty || undefined,
    heroSlot: requestData.heroSlot || undefined,
    heroQty: requestData.heroQty || undefined,
    heroCost: requestData.heroCost || undefined,
    heroCostPerWeapon: requestData.heroCostPerWeapon || undefined,
    remixedWeaponIds: requestData.remixedWeaponIds || undefined,
    remixRarity: requestData.remixRarity ?? undefined,
    remixType: requestData.remixType || undefined,
    remixCost: requestData.remixCost || undefined,
  });
}

/**
 * Met à jour un héro pour le staking fishing avec le bon type selon la zone
 * @param context Le contexte du handler
 * @param hero L'entité Hero à mettre à jour
 * @param zone La zone de fishing
 * @param timestamp Le timestamp du staking
 */
export async function setHeroFishingStaked(
  context: any,
  hero: any,
  zone: bigint,
  timestamp: bigint
) {
  // Import dynamique pour éviter les dépendances circulaires
  const { getFishingStakingType, calculateFishingUnstakeAvailable } = require('./calculations');
  
  const stakingType = getFishingStakingType(zone);
  
  const updatedHero = {
    ...hero,
    staked: true,
    stakingType,
    stakedTimestamp: timestamp,
    unstakeAvailableTimestamp: calculateFishingUnstakeAvailable(timestamp),
    lastClaimTimestamp: timestamp,
    revealed: true, // Mark as revealed on first staking
  };
  
  context.Hero.set(updatedHero);
  return updatedHero;
}

export async function getOrCreateRemixGlobalStats(context: any) {
  let global = await context.RemixGlobalStats.get('global');
  if (!global) {
    global = {
      id: 'global',
      totalRemixes: BigInt(0),
      remixesByNumWeapons: [BigInt(0), BigInt(0), BigInt(0), BigInt(0)],
      totalSpent: BigInt(0),
      spentByNumWeapons: [BigInt(0), BigInt(0), BigInt(0), BigInt(0)],
      outcomesByTypeAndRarity: Array.from({length: 4}, () => Array.from({length: 6}, () => [BigInt(0), BigInt(0), BigInt(0)])),
      lastUpdated: BigInt(0),
    };
    context.RemixGlobalStats.set(global);
  }
  return global;
}

export async function getOrCreateRemixUserStats(context: any, userId: string) {
  let userStats = await context.RemixUserStats.get(userId);
  if (!userStats) {
    const player = await context.Player.get(userId) || await getOrCreatePlayerOptimized(context, userId);
    userStats = {
      id: userId,
      totalRemixes: BigInt(0),
      remixesByNumWeapons: [BigInt(0), BigInt(0), BigInt(0), BigInt(0)],
      totalSpent: BigInt(0),
      spentByNumWeapons: [BigInt(0), BigInt(0), BigInt(0), BigInt(0)],
      outcomesByTypeAndRarity: Array.from({length: 4}, () => Array.from({length: 6}, () => [BigInt(0), BigInt(0), BigInt(0)])),
      player_id: userId,
    };
    context.RemixUserStats.set(userStats);
  }
  return userStats;
}