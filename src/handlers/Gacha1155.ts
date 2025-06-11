import {
  Gacha1155,
  Gacha1155_TransferBatch,
  Gacha1155_TransferSingle,
} from "generated";

Gacha1155.TransferBatch.handler(async ({ event, context }) => {
  const entity: Gacha1155_TransferBatch = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    operator: event.params.operator,
    from: event.params.from,
    to: event.params.to,
    ids: event.params.ids,
    amounts: event.params.amounts,
  };

  context.Gacha1155_TransferBatch.set(entity);
});

Gacha1155.TransferSingle.handler(async ({ event, context }) => {
  const entity: Gacha1155_TransferSingle = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    operator: event.params.operator,
    from: event.params.from,
    to: event.params.to,
    event_id: event.params.id,
    amount: event.params.amount,
  };

  context.Gacha1155_TransferSingle.set(entity);
}); 