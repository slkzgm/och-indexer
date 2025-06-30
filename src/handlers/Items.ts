import { Items } from "generated";
import { ZERO_ADDRESS } from "../constants";
import { updateItemsBalance } from "../helpers/items";
import { getOrCreatePlayerOptimized } from "../helpers/entities";

// ----------------------------
// TRANSFER BATCH avec loader optimisé
// ----------------------------

Items.TransferBatch.handlerWithLoader({
  // Loader optimisé : crée directement les Players avec getOrCreate
  loader: async ({ event, context }: { event: any; context: any }) => {
    const { from, to } = event.params;

    // Utilise context.isPreload pour optimiser les opérations coûteuses
    if (context.isPreload) {
      // Premier run : pré-charge ou crée les Players en parallèle
      const [sender, receiver] = await Promise.all([
        from !== ZERO_ADDRESS ? getOrCreatePlayerOptimized(context, from.toLowerCase()) : Promise.resolve(null),
        to !== ZERO_ADDRESS ? getOrCreatePlayerOptimized(context, to.toLowerCase()) : Promise.resolve(null),
      ]);
      return { sender, receiver };
    } else {
      // Second run : juste récupère les Players (ils existent déjà)
      const [sender, receiver] = await Promise.all([
        from !== ZERO_ADDRESS ? context.Player.get(from.toLowerCase()) : Promise.resolve(null),
        to !== ZERO_ADDRESS ? context.Player.get(to.toLowerCase()) : Promise.resolve(null),
      ]);
      return { sender, receiver };
    }
  },

  handler: async ({ event, context, loaderReturn }: { event: any; context: any; loaderReturn: any }) => {
    const { from, to, ids, amounts } = event.params;
    const { sender, receiver } = loaderReturn as { sender: any | null; receiver: any | null };

    // Plus besoin de création conditionnelle - déjà fait dans le loader !
    for (let i = 0; i < ids.length; i++) {
      const itemId = ids[i] as bigint;
      const amount = amounts[i] as bigint;

      if (from !== ZERO_ADDRESS && sender) {
        await updateItemsBalance(context, from, itemId, -amount, sender);
      }
      if (to !== ZERO_ADDRESS && receiver) {
        await updateItemsBalance(context, to, itemId, amount, receiver);
      }
    }
  },
});

// ----------------------------
// TRANSFER SINGLE avec loader optimisé
// ----------------------------

Items.TransferSingle.handlerWithLoader({
  loader: async ({ event, context }: { event: any; context: any }) => {
    const { from, to } = event.params;

    if (context.isPreload) {
      // Premier run : pré-charge ou crée les Players
      const [sender, receiver] = await Promise.all([
        from !== ZERO_ADDRESS ? getOrCreatePlayerOptimized(context, from.toLowerCase()) : Promise.resolve(null),
        to !== ZERO_ADDRESS ? getOrCreatePlayerOptimized(context, to.toLowerCase()) : Promise.resolve(null),
      ]);
      return { sender, receiver };
    } else {
      // Second run : récupère les Players existants
      const [sender, receiver] = await Promise.all([
        from !== ZERO_ADDRESS ? context.Player.get(from.toLowerCase()) : Promise.resolve(null),
        to !== ZERO_ADDRESS ? context.Player.get(to.toLowerCase()) : Promise.resolve(null),
      ]);
      return { sender, receiver };
    }
  },

  handler: async ({ event, context, loaderReturn }: { event: any; context: any; loaderReturn: any }) => {
    const { from, to, id, amount } = event.params as { from: string; to: string; id: bigint; amount: bigint };
    const { sender, receiver } = loaderReturn as { sender: any | null; receiver: any | null };

    // Simplification : plus de création conditionnelle nécessaire
    if (from !== ZERO_ADDRESS && sender) {
      await updateItemsBalance(context, from, id, -amount, sender);
    }
    if (to !== ZERO_ADDRESS && receiver) {
      await updateItemsBalance(context, to, id, amount, receiver);
    }
  },
}); 