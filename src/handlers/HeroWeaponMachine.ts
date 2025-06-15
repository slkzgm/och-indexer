import {
  HeroWeaponMachine,
  HeroWeaponMachine_WeaponRequested,
  HeroWeaponMachine_WeaponGenerated,
} from "generated";
import { createWeaponRequest, getOrCreatePlayer, createWeapon } from "../helpers/entities";
import { parseWeaponMetadata } from "../helpers/calculations";

/**
 * Handler pour HeroWeaponMachine.WeaponRequested
 * Crée une WeaponRequest pour tracking
 */
HeroWeaponMachine.WeaponRequested.handlerWithLoader({
  loader: async ({ event, context }: { event: any; context: any }) => {
    // Pas de lecture nécessaire ici mais on respecte la cohérence
    return {};
  },

  handler: async ({ event, context }: { event: any; context: any }) => {
    const { user, slot, qty, amount, requestId } = event.params;
    const timestamp = BigInt(event.block.timestamp);

    // Stocke l'événement brut
    const entity: HeroWeaponMachine_WeaponRequested = {
      id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      user,
      slot,
      qty,
      amount,
      requestId,
    };

    // Calcule le coût par weapon
    const costPerWeapon = amount / qty;

    // PARALLELISATION : Stockage event + création WeaponRequest + player check
    await Promise.all([
      // Stocke l'événement brut
      context.HeroWeaponMachine_WeaponRequested.set(entity),
      
      // S'assure que le player existe
      getOrCreatePlayer(context, user),
      
      // Crée la WeaponRequest pour tracking
      createWeaponRequest(context, {
        id: requestId.toString(),
        source: "HERO_MACHINE",
        requester: user,
        timestamp: timestamp,
        expectedWeapons: Number(qty),
        heroSlot: slot,
        heroQty: Number(qty),
        heroCost: amount,
        heroCostPerWeapon: BigInt(costPerWeapon),
      })
    ]);
  },
});

/**
 * Handler pour HeroWeaponMachine.WeaponGenerated
 * Met à jour la WeaponRequest et crée la Weapon avec source tracking
 */
HeroWeaponMachine.WeaponGenerated.handlerWithLoader({
  loader: async ({ event, context }: { event: any; context: any }) => {
    const { requestId } = event.params;
    const weaponRequest = await context.WeaponRequest.get(requestId.toString());
    return { weaponRequest };
  },

  handler: async ({ event, context, loaderReturn }: { event: any; context: any; loaderReturn: any }) => {
    const { user, weaponId, metadata, requestId } = event.params;
    const timestamp = BigInt(event.block.timestamp);

    const { weaponRequest } = loaderReturn as { weaponRequest: any | null };

    // Stocke l'événement brut
    const entity: HeroWeaponMachine_WeaponGenerated = {
      id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      user,
      weaponId,
      metadata,
      requestId,
    };

    // Parse les métadonnées
    const parsedMetadata = parseWeaponMetadata(metadata);

    const wr = weaponRequest ?? await context.WeaponRequest.get(requestId.toString());
    if (!wr) {
      console.warn(`WeaponRequest ${requestId} non trouvée pour weapon ${weaponId}`);
    }

    // PARALLELISATION : Stockage event + création Weapon + update request + player check
    const operations = [
      // Stocke l'événement brut
      context.HeroWeaponMachine_WeaponGenerated.set(entity),
      
      // S'assure que le player existe
      getOrCreatePlayer(context, user),
      
      // Crée la Weapon avec source tracking
      createWeapon(context, {
        id: weaponId.toString(),
        owner_id: user.toLowerCase(),
        minter: user, // Le user qui a payé
        mintedTimestamp: timestamp,
        source: "HERO_MACHINE",
        rarity: parsedMetadata.rarity,
        weaponType: parsedMetadata.weaponType,
        maxSharpness: parsedMetadata.maxSharpness,
        maxDurability: parsedMetadata.maxDurability,
        sharpness: parsedMetadata.maxSharpness, // Initial = max
        durability: parsedMetadata.maxDurability, // Initial = max
        requestId: requestId.toString(),
        sourceHeroCost: wr?.heroCostPerWeapon || undefined,
      })
    ];

    // Met à jour la WeaponRequest si elle existe
    if (wr) {
      const updatedRequest = {
        ...wr,
        generatedWeapons: wr.generatedWeapons + 1,
        generatedWeaponIds: [...wr.generatedWeaponIds, weaponId.toString()],
        completed: (wr.generatedWeapons + 1) >= wr.expectedWeapons,
      };
      
      operations.push(context.WeaponRequest.set(updatedRequest));
    }

    await Promise.all(operations);
  },
});
