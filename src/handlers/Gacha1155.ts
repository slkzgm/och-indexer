import { Gacha1155 } from "generated";
import { ZERO_ADDRESS } from "../constants";
import { updateGachaBalance } from "../helpers/gacha";
import { getOrCreatePlayer } from "../helpers/entities";

// ----------------------------
// TRANSFER BATCH avec loader
// ----------------------------

Gacha1155.TransferBatch.handlerWithLoader({
  // Loader read-only : pré-charge les Player (s'ils existent déjà)
  loader: async ({ event, context }: { event: any; context: any }) => {
    const { from, to } = event.params;

    const [sender, receiver] = await Promise.all([
      from !== ZERO_ADDRESS ? context.Player.get(from.toLowerCase()) : Promise.resolve(null),
      to !== ZERO_ADDRESS ? context.Player.get(to.toLowerCase()) : Promise.resolve(null),
    ]);

    return { sender, receiver };
  },

  handler: async ({ event, context, loaderReturn }: { event: any; context: any; loaderReturn: any }) => {
    const { from, to, ids, amounts } = event.params;

    let { sender, receiver } = loaderReturn as { sender: any | null; receiver: any | null };

    // Crée les Players si nécessaire (mint / première interaction)
    if (from !== ZERO_ADDRESS && !sender) {
      sender = await getOrCreatePlayer(context, from);
    }
    if (to !== ZERO_ADDRESS && !receiver) {
      receiver = await getOrCreatePlayer(context, to);
    }

    for (let i = 0; i < ids.length; i++) {
      const itemId = ids[i] as bigint;
      const amount = amounts[i] as bigint;

      if (from !== ZERO_ADDRESS && sender) {
        await updateGachaBalance(context, from, itemId, -amount, sender);
      }
      if (to !== ZERO_ADDRESS && receiver) {
        await updateGachaBalance(context, to, itemId, amount, receiver);
      }
    }
  },
});

// ----------------------------
// TRANSFER SINGLE avec loader
// ----------------------------

Gacha1155.TransferSingle.handlerWithLoader({
  loader: async ({ event, context }: { event: any; context: any }) => {
    const { from, to } = event.params;

    const [sender, receiver] = await Promise.all([
      from !== ZERO_ADDRESS ? context.Player.get(from.toLowerCase()) : Promise.resolve(null),
      to !== ZERO_ADDRESS ? context.Player.get(to.toLowerCase()) : Promise.resolve(null),
    ]);

    return { sender, receiver };
  },

  handler: async ({ event, context, loaderReturn }: { event: any; context: any; loaderReturn: any }) => {
    const { from, to, id, amount } = event.params as { from: string; to: string; id: bigint; amount: bigint };

    let { sender, receiver } = loaderReturn as { sender: any | null; receiver: any | null };

    if (from !== ZERO_ADDRESS && !sender) {
      sender = await getOrCreatePlayer(context, from);
    }
    if (to !== ZERO_ADDRESS && !receiver) {
      receiver = await getOrCreatePlayer(context, to);
    }

    if (from !== ZERO_ADDRESS && sender) {
      await updateGachaBalance(context, from, id, -amount, sender);
    }
    if (to !== ZERO_ADDRESS && receiver) {
      await updateGachaBalance(context, to, id, amount, receiver);
    }
  },
}); 