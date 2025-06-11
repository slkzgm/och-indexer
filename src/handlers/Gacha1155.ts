import { Gacha1155 } from "generated";
import { ZERO_ADDRESS } from "../constants";
import { updateGachaBalance } from "../helpers/gacha";

Gacha1155.TransferBatch.handler(async ({ event, context }) => {
  const { from, to, ids, amounts } = event.params;

  for (let i = 0; i < ids.length; i++) {
    const itemId = ids[i];
    const amount = amounts[i];

    // Ne traite pas les transferts depuis/vers l'adresse nulle
    if (from !== ZERO_ADDRESS) {
      await updateGachaBalance(context, from, itemId, -amount);
    }
    if (to !== ZERO_ADDRESS) {
      await updateGachaBalance(context, to, itemId, amount);
    }
  }
});

Gacha1155.TransferSingle.handler(async ({ event, context }) => {
  const { from, to, id, amount } = event.params;

  // Ne traite pas les transferts depuis/vers l'adresse nulle
  if (from !== ZERO_ADDRESS) {
    await updateGachaBalance(context, from, id, -amount);
  }
  if (to !== ZERO_ADDRESS) {
    await updateGachaBalance(context, to, id, amount);
  }
}); 