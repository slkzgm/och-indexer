import { ZERO_ADDRESS } from "../constants/index";

// Mapping des IDs Gacha vers les index dans l'array
const GACHA_TYPE_INDEX: Record<string, number> = {
  "1": 0, // BRONZE
  "2": 1, // SILVER
  "3": 2, // GOLD
  "4": 3, // RAINBOW
};

/**
 * Détermine l'index dans l'array des balances basé sur l'ID Gacha
 * @param itemId L'ID de l'item Gacha
 * @returns L'index dans l'array (0-3)
 */
function getGachaIndex(itemId: bigint): number {
  return GACHA_TYPE_INDEX[itemId.toString()] ?? 0; // Default à BRONZE
}

/**
 * Met à jour la balance d'un item Gacha (ERC1155) pour un joueur.
 * @param context Le contexte du handler
 * @param playerId L'adresse du joueur
 * @param itemId L'ID de l'item Gacha
 * @param amountChange La quantité à ajouter (positive) ou à soustraire (négative)
 */
export async function updateGachaBalance(
  context: any, // Utilise le type généré par Envio
  playerId: string,
  itemId: bigint,
  amountChange: bigint,
) {
  // Validation : montant non-zéro
  if (amountChange === 0n) {
    return;
  }

  const playerId_lc = playerId.toLowerCase();
  const gachaIndex = getGachaIndex(itemId);

  // S'assure que le joueur existe avec des balances par défaut
  const player = await context.Player.getOrCreate({
    id: playerId_lc,
    balance: 0n,
    heroCount: 0,
    weaponCount: 0,
    stakedHeroCount: 0,
    gachaBalances: [0n, 0n, 0n, 0n], // [bronze, silver, gold, rainbow]
  });

  // Met à jour la balance du type spécifique
  const newBalances = [...player.gachaBalances];
  const newBalance = newBalances[gachaIndex] + amountChange;
  
  // Validation : balance ne peut pas être négative
  if (newBalance < 0n) {
    console.warn(`Tentative de balance négative pour ${playerId_lc}, index ${gachaIndex}: ${newBalance}`);
    return;
  }

  newBalances[gachaIndex] = newBalance;
  player.gachaBalances = newBalances;
  context.Player.set(player);
} 