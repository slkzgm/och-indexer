import {
  Weapon721,
  Weapon721_ConsecutiveTransfer,
  Weapon721_Transfer,
  Weapon721_WeaponGenerated,
  Weapon721_WeaponMetadataGenerated,
} from "../../generated";
import type { Weapon_t } from "../../generated/src/db/Entities.gen";
import { parseWeaponMetadata } from "../utils/WeaponMetadataHelper";
import { ZERO_ADDRESS, ARMORY_CONTRACT } from "../utils/constants";
import { createDefaultWeapon } from "../utils/EntityHelper";

/**
 * Handler for Weapon721.ConsecutiveTransfer events.
 */
Weapon721.ConsecutiveTransfer.handler(async ({ event, context }: any) => {
  const entity: Weapon721_ConsecutiveTransfer = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    fromTokenId: event.params.fromTokenId,
    toTokenId: event.params.toTokenId,
    from: event.params.from,
    to: event.params.to,
  };

  await context.Weapon721_ConsecutiveTransfer.set(entity);

  // Batch update owner or burn for each token in the range
  const toAddr = event.params.to;
  let currentId = event.params.fromTokenId;
  const endId = event.params.toTokenId;
  while (currentId <= endId) {
    const tokenIdStr = currentId.toString();
    if (toAddr === ZERO_ADDRESS) {
      // Burn: delete the weapon
      await context.Weapon.deleteUnsafe(tokenIdStr);
    } else {
      // Mint or transfer: upsert owner
      const weapon: Weapon_t | undefined = await context.Weapon.get(tokenIdStr);
      if (weapon) {
        await context.Weapon.set({ ...weapon, player_id: toAddr });
      } else {
        const newWeapon = createDefaultWeapon(tokenIdStr, toAddr);
        await context.Weapon.set(newWeapon);
      }
    }
    currentId = currentId + BigInt(1);
  }
});

/**
 * Handler for Weapon721.Transfer events.
 */
Weapon721.Transfer.handler(async ({ event, context }: any) => {
  const from = event.params.from;
  const to = event.params.to;
  const tokenIdBI = event.params.tokenId;
  const tokenIdStr = tokenIdBI.toString();

  // Persist raw transfer event
  const entity: Weapon721_Transfer = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    from,
    to,
    tokenId: tokenIdBI,
  };
  await context.Weapon721_Transfer.set(entity);

  // Handle burn
  if (to === ZERO_ADDRESS) {
    await context.Weapon.deleteUnsafe(tokenIdStr);
    return;
  }

  // juste après avoir extrait `from` et `to`
  if (from === ARMORY_CONTRACT || to === ARMORY_CONTRACT) {
    // on skipper l'ownership update, on se base sur HeroArmoryHandler pour l'état équipé
    return;
  }

  // Upsert Weapon owner
  let weapon: Weapon_t | undefined = await context.Weapon.get(tokenIdStr);
  if (weapon) {
    const updated: Weapon_t = { ...weapon, player_id: to };
    await context.Weapon.set(updated);
  } else {
    const newWeapon = createDefaultWeapon(tokenIdStr, to);
    await context.Weapon.set(newWeapon);
  }
});

/**
 * Handler for Weapon721.WeaponGenerated events.
 */
Weapon721.WeaponGenerated.handler(async ({ event, context }: any) => {
  const entity: Weapon721_WeaponGenerated = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    to: event.params.to,
    qty: event.params.qty,
  };

  await context.Weapon721_WeaponGenerated.set(entity);
});

/**
 * Handler for Weapon721.WeaponMetadataGenerated events.
 */
Weapon721.WeaponMetadataGenerated.handler(async ({ event, context }: any) => {
  const tokenIdBI = event.params.id;
  const tokenIdStr = tokenIdBI.toString();
  const metadataBI = event.params.metadata;

  // Persist raw metadata event
  const entity: Weapon721_WeaponMetadataGenerated = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    event_id: tokenIdBI,
    metadata: metadataBI,
  };
  await context.Weapon721_WeaponMetadataGenerated.set(entity);

  // Parse metadata bits
  const { rarity, weaponType, maxSharpness, maxDurability } = parseWeaponMetadata(metadataBI);

  // Load existing weapon or create minimal
  let weapon: Weapon_t | undefined = await context.Weapon.get(tokenIdStr);
  if (!weapon) {
    const baseWeapon = createDefaultWeapon(tokenIdStr, "");
    const newWeapon = {
      ...baseWeapon,
      rarity,
      maxDurability,
      maxSharpness,
      durability: maxDurability,
      sharpness: maxSharpness,
      weaponType,
    } as any;
    await context.Weapon.set(newWeapon);
  } else {
    // Update metadata fields
    const updated: Weapon_t = {
      ...weapon,
      rarity,
      maxDurability,
      maxSharpness,
      durability: maxDurability,
      sharpness: maxSharpness,
      weaponType,
    };
    await context.Weapon.set(updated);
  }
}); 