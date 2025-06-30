import { getOrCreatePlayer } from "./entities";

// Mapping des IDs Items vers les index dans l'array (token IDs 1, 2, 3)
const ITEMS_TYPE_INDEX: Record<string, number> = {
  "1": 0, // Token ID 1 -> index 0
  "2": 1, // Token ID 2 -> index 1
  "3": 2, // Token ID 3 -> index 2
};

/**
 * Détermine l'index dans l'array des balances basé sur l'ID Items
 * @param itemId L'ID de l'item Items
 * @returns L'index dans l'array (0-2)
 */
function getItemsIndex(itemId: bigint): number {
  const index = ITEMS_TYPE_INDEX[itemId.toString()];
  if (index === undefined) {
    console.warn(`ID Items non supporté: ${itemId}, token IDs supportés: 1, 2, 3`);
    return 0; // Default à l'index 0
  }
  return index;
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