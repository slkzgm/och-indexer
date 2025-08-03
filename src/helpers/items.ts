import { getOrCreatePlayer } from "./entities";

/**
 * Détermine l'index dans l'array des balances basé sur l'ID Items
 * @param itemId L'ID de l'item Items
 * @returns L'index dans l'array (0-99)
 */
function getItemsIndex(itemId: bigint): number {
  const itemIdNum = Number(itemId);
  if (itemIdNum >= 1 && itemIdNum <= 100) {
    return itemIdNum - 1; // Token ID 1 -> index 0, Token ID 100 -> index 99
  }
  console.warn(`ID Items non supporté: ${itemId}, token IDs supportés: 1-100`);
  return 0; // Default à l'index 0
}

/**
 * Met à jour la balance d'un item Items (ERC1155) pour un joueur.
 * @param context Le contexte du handler
 * @param playerId L'adresse du joueur
 * @param itemId L'ID de l'item Items
 * @param amountChange La quantité à ajouter (positive) ou à soustraire (négative)
 * @param preloadedPlayer Optionnel : entité Player déjà chargée pour économiser un accès BD
 */
export async function updateItemsBalance(
  context: any,
  playerId: string,
  itemId: bigint,
  amountChange: bigint,
  preloadedPlayer?: any,
) {
  // Validation : montant non-zéro
  if (amountChange === 0n) {
    return;
  }

  const itemsIndex = getItemsIndex(itemId);

  // Réutilise l'entité déjà chargée si fournie, sinon fallback sur getOrCreatePlayer
  const player = preloadedPlayer || await getOrCreatePlayer(context, playerId);

  // Met à jour la balance du type spécifique
  const newBalances = [...player.itemsBalances];
  const currentBalance = newBalances[itemsIndex];
  const newBalance = currentBalance + amountChange;
  
  // Gestion des balances négatives : peut arriver lors de l'indexing initial
  if (newBalance < 0n) {
    console.log(`Balance négative Items détectée pour ${playerId}, token ID ${itemsIndex + 1}: ${currentBalance} + ${amountChange} = ${newBalance}. Mise à 0.`);
    newBalances[itemsIndex] = 0n;
  } else {
    newBalances[itemsIndex] = newBalance;
  }

  player.itemsBalances = newBalances;
  context.Player.set(player);
}

/**
 * Met à jour plusieurs balances d'items en une seule fois (optimisé pour le batching)
 * @param context Le contexte du handler
 * @param playerId L'adresse du joueur
 * @param updates Array de {itemId, amountChange}
 * @param preloadedPlayer Optionnel : entité Player déjà chargée
 * @returns Le player mis à jour (pour permettre un seul context.Player.set() à la fin)
 */
export async function updateItemsBalancesBatch(
  context: any,
  playerId: string,
  updates: Array<{itemId: bigint, amountChange: bigint}>,
  preloadedPlayer?: any,
) {
  if (updates.length === 0) {
    return preloadedPlayer || await getOrCreatePlayer(context, playerId);
  }

  const player = preloadedPlayer || await getOrCreatePlayer(context, playerId);
  const newBalances = [...player.itemsBalances];

  for (const {itemId, amountChange} of updates) {
    if (amountChange === 0n) continue;

    const itemsIndex = getItemsIndex(itemId);
    const currentBalance = newBalances[itemsIndex];
    const newBalance = currentBalance + amountChange;
    
    // Gestion des balances négatives
    if (newBalance < 0n) {
      console.log(`Balance négative Items détectée pour ${playerId}, token ID ${itemsIndex + 1}: ${currentBalance} + ${amountChange} = ${newBalance}. Mise à 0.`);
      newBalances[itemsIndex] = 0n;
    } else {
      newBalances[itemsIndex] = newBalance;
    }
  }

  player.itemsBalances = newBalances;
  return player;
} 