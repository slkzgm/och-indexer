import { ZERO_ADDRESS } from "../constants/index";

type Context = any; // Le typage sera inféré lors de l'appel dans le handler

/**
 * Met à jour la balance d'un item Gacha (ERC1155) pour un joueur.
 * @param context Le contexte du handler.
 * @param playerId L'adresse du joueur.
 * @param itemId L'ID de l'item Gacha.
 * @param amountChange La quantité à ajouter (positive) ou à soustraire (négative).
 */
export async function updateGachaBalance(
  context: Context,
  playerId: string,
  itemId: bigint,
  amountChange: bigint,
) {
  const playerId_lc = playerId.toLowerCase();
  const itemId_str = itemId.toString();
  const balanceId = `${playerId_lc}-${itemId_str}`;

  // S'assure que l'entité de l'item Gacha lui-même existe.
  // Utile pour pouvoir requêter des infos sur l'item plus tard.
  await context.GachaItem.getOrCreate({ id: itemId_str });

  // S'assure que le joueur existe.
  await context.Player.getOrCreate({
    id: playerId_lc,
    balance: 0n, // Balance du token ERC20
  });

  // Récupère ou crée la balance de cet item pour ce joueur.
  const gachaBalance = await context.GachaBalance.getOrCreate({
    id: balanceId,
    player_id: playerId_lc,
    item_id: itemId_str,
    balance: 0n, // Valeur par défaut si c'est la première fois que le joueur reçoit cet item.
  });

  // Met à jour la balance et sauvegarde.
  gachaBalance.balance = gachaBalance.balance + amountChange;
  context.GachaBalance.set(gachaBalance);
} 