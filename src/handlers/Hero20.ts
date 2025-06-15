import { Hero20 } from "generated";
import { getOrCreatePlayer } from "../helpers/entities";
import { ZERO_ADDRESS } from "../constants";

// Passage à handlerWithLoader pour réduire drastiquement le nombre de requêtes
// BD : on pré-charge les entités Player concernées dans le loader puis on ne fait
// que mettre à jour les balances dans le handler.

Hero20.Transfer.handlerWithLoader({
  // 1️⃣ Loader : pré-charge (et crée si besoin) les joueurs concernés
  loader: async ({ event, context }: { event: any; context: any }) => {
    const { from, to } = event.params;

    // IMPORTANT : les loaders n'ont accès qu'aux méthodes de lecture (get, getWhere, etc.)
    // On se contente donc de récupérer les entités existantes ; la création se fera dans le handler.

    const [sender, receiver] = await Promise.all([
      from !== ZERO_ADDRESS ? context.Player.get(from.toLowerCase()) : Promise.resolve(null),
      to !== ZERO_ADDRESS ? context.Player.get(to.toLowerCase()) : Promise.resolve(null),
    ]);

    return { sender, receiver };
  },

  // 2️⃣ Handler : applique la logique métier en utilisant les entités pré-chargées
  handler: async ({ event, context, loaderReturn }: { event: any; context: any; loaderReturn: any }) => {
    const { from, to, amount } = event.params;
    let { sender, receiver } = loaderReturn as {
      sender: any | null;
      receiver: any | null;
    };

    // Crée les players manquants en parallèle si nécessaire
    if ((from !== ZERO_ADDRESS && !sender) || (to !== ZERO_ADDRESS && !receiver)) {
      const [createdSender, createdReceiver] = await Promise.all([
        from !== ZERO_ADDRESS && !sender ? getOrCreatePlayer(context, from) : Promise.resolve(sender),
        to !== ZERO_ADDRESS && !receiver ? getOrCreatePlayer(context, to) : Promise.resolve(receiver),
      ]);
      sender = createdSender;
      receiver = createdReceiver;
    }

    // Validation : montant positif
    if (amount <= 0n) return;

    // Validation : addresses différentes
    if (from.toLowerCase() === to.toLowerCase()) return;

    // Diminue la balance de l'expéditeur (sauf mint)
    if (from !== ZERO_ADDRESS && sender) {
      sender.balance -= amount;
      context.Player.set(sender);
    }

    // Augmente la balance du destinataire (sauf burn)
    if (to !== ZERO_ADDRESS && receiver) {
      receiver.balance += amount;
      context.Player.set(receiver);
    }
  },
}); 