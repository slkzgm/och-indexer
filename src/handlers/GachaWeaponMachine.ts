import {
  GachaWeaponMachine,
  GachaWeaponMachine_WeaponRequested,
  GachaWeaponMachine_WeaponGenerated,
} from "generated";
import { createWeaponRequest, getOrCreatePlayer, createWeapon } from "../helpers/entities";
import { parseWeaponMetadata } from "../helpers/calculations";

/**
 * Handler pour GachaWeaponMachine.WeaponRequested
 * Crée une WeaponRequest pour tracking avec tokenId de gacha
 */
GachaWeaponMachine.WeaponRequested.handler(async ({ event, context }) => {
  const { user, tokenId, qty, requestId } = event.params;
  const timestamp = BigInt(event.block.timestamp);

  // Stocke l'événement brut
  const entity: GachaWeaponMachine_WeaponRequested = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    user,
    tokenId,
    qty,
    requestId,
  };

  // PARALLELISATION : Stockage event + création WeaponRequest + player check
  await Promise.all([
    // Stocke l'événement brut
    context.GachaWeaponMachine_WeaponRequested.set(entity),
    
    // S'assure que le player existe
    getOrCreatePlayer(context, user),
    
    // Crée la WeaponRequest pour tracking
    createWeaponRequest(context, {
      id: requestId.toString(),
      source: "GACHA_MACHINE",
      requester: user,
      timestamp: timestamp,
      expectedWeapons: Number(qty),
      gachaTokenId: tokenId,
      gachaQty: Number(qty),
    })
  ]);
});

/**
 * Handler pour GachaWeaponMachine.WeaponGenerated
 * Met à jour la WeaponRequest et crée la Weapon avec source tracking gacha
 */
GachaWeaponMachine.WeaponGenerated.handler(async ({ event, context }) => {
  const { user, weaponId, metadata, requestId } = event.params;
  const timestamp = BigInt(event.block.timestamp);

  // Stocke l'événement brut
  const entity: GachaWeaponMachine_WeaponGenerated = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    user,
    weaponId,
    metadata,
    requestId,
  };

  // Parse les métadonnées
  const parsedMetadata = parseWeaponMetadata(metadata);

  // Récupère la WeaponRequest pour les infos de source
  const weaponRequest = await context.WeaponRequest.get(requestId.toString());
  
  if (!weaponRequest) {
    console.warn(`WeaponRequest ${requestId} non trouvée pour weapon ${weaponId}`);
  }

  // PARALLELISATION : Stockage event + création Weapon + update request + player check
  const operations = [
    // Stocke l'événement brut
    context.GachaWeaponMachine_WeaponGenerated.set(entity),
    
    // S'assure que le player existe
    getOrCreatePlayer(context, user),
    
    // Crée la Weapon avec source tracking gacha
    createWeapon(context, {
      id: weaponId.toString(),
      owner_id: user.toLowerCase(),
      minter: user, // Le user qui a ouvert le gacha
      mintedTimestamp: timestamp,
      source: "GACHA_MACHINE",
      rarity: parsedMetadata.rarity,
      weaponType: parsedMetadata.weaponType,
      maxSharpness: parsedMetadata.maxSharpness,
      maxDurability: parsedMetadata.maxDurability,
      sharpness: parsedMetadata.maxSharpness, // Initial = max
      durability: parsedMetadata.maxDurability, // Initial = max
      requestId: requestId.toString(),
      sourceGachaTokenId: weaponRequest?.gachaTokenId,
    })
  ];

  // Met à jour la WeaponRequest si elle existe
  if (weaponRequest) {
    const updatedRequest = {
      ...weaponRequest,
      generatedWeapons: weaponRequest.generatedWeapons + 1,
      generatedWeaponIds: [...weaponRequest.generatedWeaponIds, weaponId.toString()],
      completed: (weaponRequest.generatedWeapons + 1) >= weaponRequest.expectedWeapons,
    };
    
    operations.push(context.WeaponRequest.set(updatedRequest));
  }

  await Promise.all(operations);
});