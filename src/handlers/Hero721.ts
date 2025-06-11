import {
  Hero721,
  Hero721_ConsecutiveTransfer,
  Hero721_Transfer,
} from "generated";

Hero721.ConsecutiveTransfer.handler(async ({ event, context }) => {
  const entity: Hero721_ConsecutiveTransfer = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    fromTokenId: event.params.fromTokenId,
    toTokenId: event.params.toTokenId,
    from: event.params.from,
    to: event.params.to,
  };

  context.Hero721_ConsecutiveTransfer.set(entity);
});

Hero721.Transfer.handler(async ({ event, context }) => {
  const entity: Hero721_Transfer = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    from: event.params.from,
    to: event.params.to,
    tokenId: event.params.tokenId,
  };

  context.Hero721_Transfer.set(entity);
}); 