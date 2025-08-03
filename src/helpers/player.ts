import { getOrCreatePlayer, getOrCreatePlayerOptimized } from "./entities";

/**
 * Met à jour la balance du token Hero20 d'un joueur.
 * Crée le joueur avec une balance de 0 s'il n'existe pas.
 * @param context Le contexte du handler
 * @param playerId L'adresse du joueur à mettre à jour
 * @param amountChange La quantité à ajouter (positive) ou à soustraire (négative) de la balance
 */
export async function updatePlayerBalance(
  context: any, // Utilise le type généré par Envio
  playerId: string,
  amountChange: bigint,
) {
  const player = await getOrCreatePlayer(context, playerId);
  player.balance = player.balance + amountChange;
  context.Player.set(player);
}

/**
 * Met à jour les compteurs d'un joueur de manière atomique
 * @param context Le contexte du handler
 * @param playerId L'adresse du joueur
 * @param changes Les changements à appliquer aux compteurs
 */
export async function updatePlayerCounts(
  context: any, // Utilise le type généré par Envio
  playerId: string,
  changes: {
    heroCount?: number;
    weaponCount?: number;
    stakedHeroCount?: number;
  }
) {
  const player = await getOrCreatePlayer(context, playerId);

  if (changes.heroCount !== undefined) {
    player.heroCount += changes.heroCount;
  }
  if (changes.weaponCount !== undefined) {
    player.weaponCount += changes.weaponCount;
  }
  if (changes.stakedHeroCount !== undefined) {
    player.stakedHeroCount += changes.stakedHeroCount;
  }

  context.Player.set(player);
}

/**
 * Met à jour le totalSpent d'un joueur
 * @param context Le contexte du handler
 * @param playerId L'ID du joueur
 * @param amountChange Le montant à ajouter (positif) ou soustraire (négatif)
 */
export async function updatePlayerTotalSpent(
  context: any,
  playerId: string,
  amountChange: bigint
) {
  if (amountChange === 0n) {
    return;
  }

  const player = await context.Player.get(playerId.toLowerCase());
  if (player) {
    player.totalSpent += amountChange;
    // Gestion des montants négatifs (peut arriver lors de l'indexing initial)
    if (player.totalSpent < 0n) {
      console.log(`TotalSpent négatif détecté pour ${playerId}: ${player.totalSpent}. Mise à 0.`);
      player.totalSpent = 0n;
    }
    context.Player.set(player);
  }
} 

/**
 * Met à jour plusieurs balances de players en une seule fois (optimisé pour le batching)
 * @param context Le contexte du handler
 * @param updates Array de {playerId, balanceChange}
 * @returns Les players mis à jour (pour permettre un seul context.Player.set() à la fin)
 */
export async function updatePlayerBalancesBatch(
  context: any,
  updates: Array<{playerId: string, balanceChange: bigint}>,
) {
  if (updates.length === 0) {
    return [];
  }

  const players = [];
  
  for (const {playerId, balanceChange} of updates) {
    if (balanceChange === 0n) continue;

    const player = await getOrCreatePlayerOptimized(context, playerId);
    const newBalance = player.balance + balanceChange;
    
    // Gestion des balances négatives (normal lors de l'indexing initial)
    if (newBalance < 0n) {
      console.log(`Balance négative détectée pour ${playerId}: ${player.balance} + ${balanceChange} = ${newBalance}. Mise à 0.`);
      player.balance = 0n;
    } else {
      player.balance = newBalance;
    }
    
    players.push(player);
  }

  return players;
} 

/**
 * Met à jour plusieurs compteurs de players en une seule fois (optimisé pour le batching)
 * @param context Le contexte du handler
 * @param updates Array de {playerId, changes}
 * @returns Les players mis à jour (pour permettre un seul context.Player.set() à la fin)
 */
export async function updatePlayerCountsBatch(
  context: any,
  updates: Array<{
    playerId: string;
    changes: {
      heroCount?: number;
      weaponCount?: number;
      stakedHeroCount?: number;
    };
  }>,
) {
  if (updates.length === 0) {
    return [];
  }

  const players = [];
  
  for (const {playerId, changes} of updates) {
    const player = await getOrCreatePlayerOptimized(context, playerId);

    if (changes.heroCount !== undefined) {
      player.heroCount += changes.heroCount;
    }
    if (changes.weaponCount !== undefined) {
      player.weaponCount += changes.weaponCount;
    }
    if (changes.stakedHeroCount !== undefined) {
      player.stakedHeroCount += changes.stakedHeroCount;
    }
    
    players.push(player);
  }

  return players;
} 