import { getOrCreatePlayer } from "./entities";

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