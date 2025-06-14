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
  const playerId_lc = playerId.toLowerCase();

  const player = await context.Player.getOrCreate({
    id: playerId_lc,
    balance: 0n,
    heroCount: 0,
    weaponCount: 0,
    stakedHeroCount: 0,
    gachaBalances: [0n, 0n, 0n, 0n],
  });

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
  const playerId_lc = playerId.toLowerCase();

  const player = await context.Player.getOrCreate({
    id: playerId_lc,
    balance: 0n,
    heroCount: 0,
    weaponCount: 0,
    stakedHeroCount: 0,
    gachaBalances: [0n, 0n, 0n, 0n],
  });

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