import { Gacha1155 } from "generated";
import { handleGachaTransfer } from "../helpers";

Gacha1155.TransferBatch.handler(async ({ event, context }) => {
  const { from, to, ids, amounts } = event.params;

  for (let i = 0; i < ids.length; i++) {
    await handleGachaTransfer(context, from, to, ids[i], amounts[i]);
  }
});

Gacha1155.TransferSingle.handler(async ({ event, context }) => {
  const { from, to, id, amount } = event.params;

  await handleGachaTransfer(context, from, to, id, amount);
}); 