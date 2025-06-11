import { Hero20 } from "generated";
import { updatePlayerBalance } from "../helpers/player";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

Hero20.Transfer.handler(async ({ event, context }) => {
  const { from, to, amount } = event.params;

  // Augmente la balance du destinataire
  if (to !== ZERO_ADDRESS) {
    await updatePlayerBalance(context, to, amount);
  }

  // Diminue la balance de l'expéditeur
  if (from !== ZERO_ADDRESS) {
    await updatePlayerBalance(context, from, -amount);
  }
}); 