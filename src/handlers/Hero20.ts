import { Hero20 } from "generated";
import { getOrCreatePlayerOptimized } from "../helpers/entities";
import { updatePlayerBalancesBatch } from "../helpers/player";
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

    // Préparer les updates de balance en batch
    const balanceUpdates: Array<{playerId: string, balanceChange: bigint}> = [];

    if (from !== ZERO_ADDRESS && sender) {
      // Utiliser directement le player du loader
      sender.balance += -BigInt(amount);
      if (sender.balance < 0n) {
        console.log(`Balance négative détectée pour ${from}: ${sender.balance}. Mise à 0.`);
        sender.balance = 0n;
      }
    }

    if (to !== ZERO_ADDRESS && receiver) {
      // Utiliser directement le player du loader
      receiver.balance += BigInt(amount);
    }

    // Sauvegarder tous les players en une fois
    const playersToSave = [];
    if (from !== ZERO_ADDRESS && sender) {
      playersToSave.push(context.Player.set(sender));
    }
    if (to !== ZERO_ADDRESS && receiver) {
      playersToSave.push(context.Player.set(receiver));
    }
    
    if (playersToSave.length > 0) {
      await Promise.all(playersToSave);
    }
  },
}); 