import { Hero20 } from "generated";
import { getOrCreateGlobalStats, updatePlayerBalance } from "../helpers";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

Hero20.Transfer.handler(async ({ event, context }) => {
  const { from, to, amount } = event.params;
  const from_lc = from.toLowerCase();
  const to_lc = to.toLowerCase();

  // Augmente la balance du destinataire
  if (to_lc !== ZERO_ADDRESS) {
    await updatePlayerBalance(context, to_lc, amount);
  }

  // Diminue la balance de l'expéditeur
  if (from_lc !== ZERO_ADDRESS) {
    await updatePlayerBalance(context, from_lc, -amount);
  }

  // Met à jour le compteur global de transferts de tokens,
  // sauf pour les mints/burns.
  if (from_lc !== ZERO_ADDRESS && to_lc !== ZERO_ADDRESS) {
    const globalStats = await getOrCreateGlobalStats(context);
    globalStats.totalTokenTransfers += 1n;
    context.GlobalStats.set(globalStats);
  }
}); 