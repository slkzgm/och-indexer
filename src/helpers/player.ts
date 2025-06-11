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
  const playerId_lc = playerId.toLowerCase();

  const player = await context.Player.getOrCreate({
    id: playerId_lc,
    balance: 0n,
  });

  player.balance = player.balance + amountChange;

  context.Player.set(player);
} 