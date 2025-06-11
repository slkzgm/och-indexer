import { Hero721 } from "generated";
import { handleHeroTransfer } from "../helpers/hero";

Hero721.Transfer.handler(async ({ event, context }) => {
  const { from, to, tokenId } = event.params;
  await handleHeroTransfer(context, tokenId, from, to);
});

// Le `ConsecutiveTransfer` est souvent utilisé pour les mints de masse.
// On le traite comme une série de transferts individuels.
Hero721.ConsecutiveTransfer.handler(async ({ event, context }) => {
  const { fromTokenId, toTokenId, from, to } = event.params;

  // Le `toTokenId` est inclusif, donc de fromTokenId à toTokenId.
  for (let tokenId = fromTokenId; tokenId <= toTokenId; tokenId++) {
    await handleHeroTransfer(context, tokenId, from, to);
  }
}); 