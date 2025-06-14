import {
  WeaponRemixer,
  WeaponRemixer_WeaponMixRequested,
  WeaponRemixer_LegendaryMixRequested,
  WeaponRemixer_WeaponGenerated,
} from "generated";
import { createWeaponRequest, getOrCreatePlayer, createWeapon } from "../helpers/entities";
import { parseWeaponMetadata } from "../helpers/calculations";

/**
 * Handler pour WeaponRemixer.WeaponMixRequested
 * Gère les mix normaux (Common à Heroic, 2-5 weapons)
 */
WeaponRemixer.WeaponMixRequested.handler(async ({ event, context }) => {
  const { weaponIds, cost, rarity, requestId } = event.params;
  const timestamp = BigInt(event.block.timestamp);

  // Stocke l'événement brut
  const entity: WeaponRemixer_WeaponMixRequested = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    weaponIds,
    cost,
    rarity,
    requestId,
  };

  // PARALLELISATION : Stockage event + création WeaponRequest + player check
  await Promise.all([
    // Stocke l'événement brut
    context.WeaponRemixer_WeaponMixRequested.set(entity),
    
    // S'assure que le player existe (on récupère l'owner depuis les events précédents)
    // Note: Le contrat vérifie déjà l'ownership, donc on peut faire confiance
    
    // Crée la WeaponRequest pour tracking
    createWeaponRequest(context, {
      id: requestId.toString(),
      source: "REMIXER",
      requester: "0x0000000000000000000000000000000000000000", // Sera mis à jour dans WeaponGenerated
      timestamp: timestamp,
      expectedWeapons: 1, // Remix génère toujours 1 weapon
      remixedWeaponIds: weaponIds,
      remixRarity: Number(rarity),
      remixType: "NORMAL",
    })
  ]);
});

/**
 * Handler pour WeaponRemixer.LegendaryMixRequested
 * Gère les mix légendaires (3 Legendary weapons → chance de Mythic)
 */
WeaponRemixer.LegendaryMixRequested.handler(async ({ event, context }) => {
  const { weaponIds, cost, rarity, requestId } = event.params;
  const timestamp = BigInt(event.block.timestamp);

  // Stocke l'événement brut
  const entity: WeaponRemixer_LegendaryMixRequested = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    weaponIds,
    cost,
    rarity,
    requestId,
  };

  // PARALLELISATION : Stockage event + création WeaponRequest
  await Promise.all([
    // Stocke l'événement brut
    context.WeaponRemixer_LegendaryMixRequested.set(entity),
    
    // Crée la WeaponRequest pour tracking
    createWeaponRequest(context, {
      id: requestId.toString(),
      source: "REMIXER",
      requester: "0x0000000000000000000000000000000000000000", // Sera mis à jour dans WeaponGenerated
      timestamp: timestamp,
      expectedWeapons: 1, // Remix génère toujours 1 weapon
      remixedWeaponIds: weaponIds,
      remixRarity: Number(rarity),
      remixType: "LEGENDARY",
    })
  ]);
});

/**
 * Handler pour WeaponRemixer.WeaponGenerated
 * Met à jour la WeaponRequest et crée la Weapon avec source tracking remix
 */
WeaponRemixer.WeaponGenerated.handler(async ({ event, context }) => {
  const { user, weaponId, metadata, requestId } = event.params;
  const timestamp = BigInt(event.block.timestamp);

  // Stocke l'événement brut
  const entity: WeaponRemixer_WeaponGenerated = {
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
    context.WeaponRemixer_WeaponGenerated.set(entity),
    
    // S'assure que le player existe
    getOrCreatePlayer(context, user),
    
    // Crée la Weapon avec source tracking remix
    createWeapon(context, {
      id: weaponId.toString(),
      owner_id: user.toLowerCase(),
      minter: user, // Le user qui a fait le remix
      mintedTimestamp: timestamp,
      source: "REMIXER",
      rarity: parsedMetadata.rarity,
      weaponType: parsedMetadata.weaponType,
      maxSharpness: parsedMetadata.maxSharpness,
      maxDurability: parsedMetadata.maxDurability,
      sharpness: parsedMetadata.maxSharpness, // Initial = max
      durability: parsedMetadata.maxDurability, // Initial = max
      requestId: requestId.toString(),
      sourceRemixedWeaponIds: weaponRequest?.remixedWeaponIds,
      sourceRemixRarity: weaponRequest?.remixRarity,
      sourceRemixType: weaponRequest?.remixType,
    })
  ];

  // Met à jour la WeaponRequest si elle existe
  if (weaponRequest) {
    const updatedRequest = {
      ...weaponRequest,
      requester: user, // Met à jour le requester maintenant qu'on l'a
      generatedWeapons: weaponRequest.generatedWeapons + 1,
      generatedWeaponIds: [...weaponRequest.generatedWeaponIds, weaponId.toString()],
      completed: true, // Remix génère toujours 1 weapon, donc toujours complété
    };
    
    operations.push(context.WeaponRequest.set(updatedRequest));
  }

  await Promise.all(operations);
});
