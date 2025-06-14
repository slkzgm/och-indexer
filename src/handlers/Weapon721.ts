import {
  Weapon721,
  Weapon721_Transfer_event,
  Weapon721_ConsecutiveTransfer_event,
  Weapon721_WeaponMetadataGenerated_event,
} from "generated";
import { handleWeaponTransfer, handleDirectWeaponMint } from "../helpers";

Weapon721.ConsecutiveTransfer.handler(async ({ event, context }) => {
  const { fromTokenId, toTokenId, from, to } = event.params;

  for (let tokenId = fromTokenId; tokenId <= toTokenId; tokenId++) {
    await handleWeaponTransfer(
      context,
      tokenId,
      from,
      to,
      BigInt(event.block.timestamp),
    );
  }
});

Weapon721.Transfer.handler(async ({ event, context }) => {
  const { from, to, tokenId } = event.params;
  await handleWeaponTransfer(
    context,
    tokenId,
    from,
    to,
    BigInt(event.block.timestamp),
  );
});

Weapon721.WeaponMetadataGenerated.handler(async ({ event, context }) => {
  await handleDirectWeaponMint(
    context,
    event.params.id.toString(),
    event.params.metadata,
  );
}); 