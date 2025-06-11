import {
  Weapon721,
  Weapon721_WeaponGenerated,
  Weapon721_WeaponMetadataGenerated,
} from "generated";
import { handleWeaponTransfer } from "../helpers/weapon";

Weapon721.ConsecutiveTransfer.handler(async ({ event, context }) => {
  const { fromTokenId, toTokenId, from, to } = event.params;

  for (let tokenId = fromTokenId; tokenId <= toTokenId; tokenId++) {
    await handleWeaponTransfer(context, tokenId, from, to);
  }
});

Weapon721.Transfer.handler(async ({ event, context }) => {
  const { from, to, tokenId } = event.params;
  await handleWeaponTransfer(context, tokenId, from, to);
});

Weapon721.WeaponGenerated.handler(async ({ event, context }) => {
  const entity: Weapon721_WeaponGenerated = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    to: event.params.to,
    qty: event.params.qty,
  };

  context.Weapon721_WeaponGenerated.set(entity);
});

Weapon721.WeaponMetadataGenerated.handler(async ({ event, context }) => {
  const entity: Weapon721_WeaponMetadataGenerated = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    event_id: event.params.id,
    metadata: event.params.metadata,
  };

  context.Weapon721_WeaponMetadataGenerated.set(entity);
}); 