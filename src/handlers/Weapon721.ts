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
  
  // Stocke l'événement brut
  const entity: Weapon721_WeaponMetadataGenerated = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    event_id: weaponId,
    metadata: metadata,
  };
  context.Weapon721_WeaponMetadataGenerated.set(entity);

  // Met à jour l'entité Weapon avec les métadonnées parsées
  const weapon = await context.Weapon.get(weaponId.toString());
  if (weapon) {
    const parsedMetadata = parseWeaponMetadata(metadata);
    
    // Met à jour les propriétés de l'arme
    const updatedWeapon = {
      ...weapon,
      rarity: parsedMetadata.rarity,
      weaponType: parsedMetadata.weaponType,
      maxSharpness: parsedMetadata.maxSharpness,
      maxDurability: parsedMetadata.maxDurability,
      // Initialise sharpness et durability aux valeurs max si pas encore définies
      sharpness: weapon.sharpness || parsedMetadata.maxSharpness,
      durability: weapon.durability || parsedMetadata.maxDurability,
    };
    
    context.Weapon.set(updatedWeapon);
  }
}); 