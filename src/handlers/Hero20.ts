import { Hero20 } from "generated";
import { getOrCreatePlayerOptimized } from "../helpers/entities";
import { ZERO_ADDRESS } from "../constants";

// Passage à handlerWithLoader optimisé avec les nouvelles fonctionnalités

Hero20.Transfer.handlerWithLoader({
  // Loader optimisé : utilise context.getOrCreate et context.isPreload
  loader: async ({ event, context }: { event: any; context: any }) => {
    const { from, to } = event.params;

    if (context.isPreload) {
      // Premier run : création automatique des Players si nécessaire
      const [sender, receiver] = await Promise.all([
        from !== ZERO_ADDRESS ? getOrCreatePlayerOptimized(context, from.toLowerCase()) : Promise.resolve(null),
        to !== ZERO_ADDRESS ? getOrCreatePlayerOptimized(context, to.toLowerCase()) : Promise.resolve(null),
      ]);
      return { sender, receiver };
    } else {
      // Second run : récupération des Players existants (performance optimale)
      const [sender, receiver] = await Promise.all([
        from !== ZERO_ADDRESS ? context.Player.get(from.toLowerCase()) : Promise.resolve(null),
        to !== ZERO_ADDRESS ? context.Player.get(to.toLowerCase()) : Promise.resolve(null),
      ]);
      return { sender, receiver };
    }
  },

  // Handler simplifié : plus de création conditionnelle nécessaire
  handler: async ({ event, context, loaderReturn }: { event: any; context: any; loaderReturn: any }) => {
    const { from, to, amount } = event.params;
    const { sender, receiver } = loaderReturn as {
      sender: any | null;
      receiver: any | null;
    };

    // Validation : montant positif
    if (amount <= 0n) return;

    // Validation : addresses différentes
    if (from.toLowerCase() === to.toLowerCase()) return;

    // Mise à jour des balances : simplification car les Players existent déjà
    const updates = [];

    if (from !== ZERO_ADDRESS && sender) {
      sender.balance -= amount;
      updates.push(context.Player.set(sender));
    }

    if (to !== ZERO_ADDRESS && receiver) {
      receiver.balance += amount;
      updates.push(context.Player.set(receiver));
    }

    // Exécution en parallèle des mises à jour
    await Promise.all(updates);
  },
}); 