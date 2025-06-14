import { Hero20 } from "generated";
import { updatePlayerBalance } from "../helpers/player";
import { ZERO_ADDRESS } from "../constants";

Hero20.Transfer.handler(async ({ event, context }) => {
  const { from, to, amount } = event.params;

  // Validation : montant positif
  if (amount <= 0n) {
    return; // Ignore les transferts avec montant <= 0
  }

  // Validation : addresses différentes
  if (from.toLowerCase() === to.toLowerCase()) {
    return; // Ignore les auto-transferts
  }

  // Diminue la balance de l'expéditeur (sauf si c'est un mint)
  if (from !== ZERO_ADDRESS) {
    await updatePlayerBalance(context, from, -amount);
  }

  // Augmente la balance du destinataire (sauf si c'est un burn)
  if (to !== ZERO_ADDRESS) {
    await updatePlayerBalance(context, to, amount);
  }
}); 