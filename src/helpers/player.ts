import {
  CHAOS_CHANCES_SIZE,
  CHAOS_LEVEL_GAIN_RANGE_SIZE,
  MAX_LEVEL,
  UNKNOWN_CHANCES_SIZE,
  UNKNOWN_LEVEL_GAIN_RANGE_SIZE,
  WEAPON_RARITY_COUNT,
  WEAPON_SHARPNESS_COUNT,
} from "../constants";

const NEW_PLAYER_DEFAULTS = {
  balance: 0n,
  tokenIn: 0n,
  tokenOut: 0n,
  tokenTransferEventsIn: 0n,
  tokenTransferEventsOut: 0n,
  totalTrainings: 0n,
  totalTrainingCost: 0n,
  totalLevelGains: 0n,
  normalTrainingCost: 0n,
  chaosTrainingCost: 0n,
  unknownTrainingCost: 0n,
  normalTrainingsCount: 0n,
  chaosTrainingsCount: 0n,
  unknownTrainingsCount: 0n,
  normalLevelGains: 0n,
  chaosLevelGains: 0n,
  unknownLevelGains: 0n,
  chaosLevelGainsDistribution: Array(CHAOS_LEVEL_GAIN_RANGE_SIZE).fill(0n),
  unknownLevelGainsDistribution: Array(
    UNKNOWN_LEVEL_GAIN_RANGE_SIZE,
  ).fill(0n),
  chaosChancesSum: Array(CHAOS_CHANCES_SIZE).fill(0n),
  unknownChancesSum: Array(UNKNOWN_CHANCES_SIZE).fill(0n),
  heroesMinted: 0n,
  heroesBurned: 0n,
  heroesCount: 0n,
  totalHeroesLevel: 0n,
  heroTransfersIn: 0n,
  heroTransfersOut: 0n,
  heroCountByLevel: Array(MAX_LEVEL).fill(0n),
  weaponsMinted: 0n,
  weaponsBurned: 0n,
  weaponsCount: 0n,
  weaponTransfersIn: 0n,
  weaponTransfersOut: 0n,
  gachaMinted: 0n,
  gachaBurned: 0n,
  gachaTransfersIn: 0n,
  gachaTransfersOut: 0n,
  bronzeGachasMinted: 0n,
  bronzeGachasBurned: 0n,
  bronzeGachaTransfersIn: 0n,
  bronzeGachaTransfersOut: 0n,
  silverGachasMinted: 0n,
  silverGachasBurned: 0n,
  silverGachaTransfersIn: 0n,
  silverGachaTransfersOut: 0n,
  goldGachasMinted: 0n,
  goldGachasBurned: 0n,
  goldGachaTransfersIn: 0n,
  goldGachaTransfersOut: 0n,
  rainbowGachasMinted: 0n,
  rainbowGachasBurned: 0n,
  rainbowGachaTransfersIn: 0n,
  rainbowGachaTransfersOut: 0n,
  lastTrainedTimestamp: 0n,
  weaponsMintedFromGachaByRarity: Array(WEAPON_RARITY_COUNT).fill(0n),
  heroesAverageLevel: 0n,
  weaponsMintedByRarity: Array(WEAPON_RARITY_COUNT).fill(0n),
  weaponsBurnedByRarity: Array(WEAPON_RARITY_COUNT).fill(0n),
  weaponsMintedBySharpness: Array(WEAPON_SHARPNESS_COUNT).fill(0n),
  weaponsBurnedBySharpness: Array(WEAPON_SHARPNESS_COUNT).fill(0n),
  totalRemixes: 0n,
  totalRemixCost: 0n,
  totalRemixSuccesses: 0n,
  totalRemixFailures: 0n,
  totalRemixBigSuccesses: 0n,
  totalClaimed: 0n,
  totalStaked: 0n,
  totalUnstaked: 0n,
};

export async function getOrCreatePlayer(context: any, playerId: string) {
  const playerId_lc = playerId.toLowerCase();

  const player = await context.Player.get({
    id: playerId_lc,
  });

  if (player) {
    // Normalise l'entité Player pour gérer les anciens enregistrements
    // qui pourraient ne pas avoir les nouveaux champs du schéma.
    for (const key in NEW_PLAYER_DEFAULTS) {
      if (player[key] == null) {
        player[key] = (NEW_PLAYER_DEFAULTS as any)[key];
      }
    }
    return player;
  } else {
    const newPlayer = {
      id: playerId_lc,
      ...NEW_PLAYER_DEFAULTS,
    };
    context.Player.set(newPlayer);
    return newPlayer;
  }
}

export async function getAndNormalizePlayer(context: any, playerId: string) {
  const player = await context.Player.get(playerId);
  if (!player) {
    return null;
  }

  // Normalise l'entité Player pour gérer les anciens enregistrements.
  for (const key in NEW_PLAYER_DEFAULTS) {
    if (player[key] == null) {
      player[key] = (NEW_PLAYER_DEFAULTS as any)[key];
    }
  }
  return player;
}

/**
 * Met à jour la balance du token Hero20 d'un joueur.
 * Crée le joueur avec une balance de 0 s'il n'existe pas.
 * @param context Le contexte du handler, fournit l'accès aux entités.
 * @param playerId L'adresse du joueur à mettre à jour.
 * @param amountChange La quantité à ajouter (positive) ou à soustraire (négative) de la balance.
 */
export async function updatePlayerBalance(
  context: any, // Le typage sera inféré lors de l'appel dans le handler
  playerId: string,
  amountChange: bigint,
) {
  const player = await getOrCreatePlayer(context, playerId);

  player.balance = player.balance + amountChange;

  if (amountChange > 0n) {
    player.tokenIn = player.tokenIn + amountChange;
    player.tokenTransferEventsIn += 1n;
  } else {
    player.tokenOut = player.tokenOut - amountChange;
    player.tokenTransferEventsOut += 1n;
  }

  context.Player.set(player);
} 