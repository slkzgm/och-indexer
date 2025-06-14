import { Hero721 } from "generated";
import { handleHeroTransfer } from "../helpers/hero";

Hero721.Transfer.handler(async ({ event, context }) => {
  const { from, to, tokenId } = event.params;
  await handleHeroTransfer(context, tokenId, from, to, BigInt(event.block.timestamp));
});

// Le `ConsecutiveTransfer` est souvent utilisé pour les mints de masse.
// On le traite comme une série de transferts individuels.
Hero721.ConsecutiveTransfer.handler(async ({ event, context }) => {
  const { fromTokenId, toTokenId, from, to } = event.params;
  const timestamp = BigInt(event.block.timestamp);

  // Parallélisation pour les transferts multiples
  const transfers = [];
  for (let tokenId = fromTokenId; tokenId <= toTokenId; tokenId++) {
    transfers.push(handleHeroTransfer(context, tokenId, from, to, timestamp));
  }
  
  // Exécute tous les transferts en parallèle
  await Promise.all(transfers);
}); 