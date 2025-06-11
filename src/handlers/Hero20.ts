import { Hero20, Hero20_Transfer } from "generated";

Hero20.Transfer.handler(async ({ event, context }) => {
  const entity: Hero20_Transfer = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    from: event.params.from,
    to: event.params.to,
    amount: event.params.amount,
  };

  context.Hero20_Transfer.set(entity);
}); 