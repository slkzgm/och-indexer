import {
  Weapon721,
  Weapon721_WeaponGenerated,
  Weapon721_WeaponMetadataGenerated,
} from "generated";
import { handleWeaponTransfer } from "../helpers/weapon";
import { parseWeaponMetadata } from "../helpers/calculations";

Weapon721.ConsecutiveTransfer.handler(async ({ event, context }) => {
  const { fromTokenId, toTokenId, from, to } = event.params;
  const timestamp = BigInt(event.block.timestamp);

  // Parallélisation pour les transferts multiples
  const transfers = [];
  for (let tokenId = fromTokenId; tokenId <= toTokenId; tokenId++) {
    transfers.push(handleWeaponTransfer(context, tokenId, from, to, timestamp));
  }
  
  // Exécute tous les transferts en parallèle
  await Promise.all(transfers);
});

Weapon721.Transfer.handler(async ({ event, context }) => {
  const { from, to, tokenId } = event.params;
  await handleWeaponTransfer(context, tokenId, from, to, BigInt(event.block.timestamp));
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
  const { id: weaponId, metadata } = event.params;

  // 1) Log brut
  context.Weapon721_WeaponMetadataGenerated.set({
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    event_id: weaponId,
    metadata,
  });

  // 2) Mise à jour de l'arme si elle existe
  const weapon = await context.Weapon.get(weaponId.toString());
  if (!weapon) return;

  const parsed = parseWeaponMetadata(metadata);
  context.Weapon.set({
    ...weapon,
    rarity: parsed.rarity,
    weaponType: parsed.weaponType,
    maxSharpness: parsed.maxSharpness,
    maxDurability: parsed.maxDurability,
    sharpness: weapon.sharpness || parsed.maxSharpness,
    durability: weapon.durability || parsed.maxDurability,
  });
}); 