import {
  WeaponRemixer,
  WeaponRemixer_WeaponMixRequested,
  WeaponRemixer_LegendaryMixRequested,
  WeaponRemixer_WeaponGenerated,
} from "generated";
import { createWeaponRequest, getOrCreatePlayerOptimized, createWeapon } from "../helpers/entities";
import { parseWeaponMetadata } from "../helpers/calculations";

/**
 * Handler pour WeaponRemixer.WeaponMixRequested
 * Gère les mix normaux (Common à Heroic, 2-5 weapons)
 */
WeaponRemixer.WeaponMixRequested.handlerWithLoader({
  loader: async ({ event, context }: { event: any; context: any }) => {
    const { weaponIds } = event.params;
    
    if (context.isPreload && weaponIds.length > 0) {
      // Premier run : essaie de déterminer l'owner depuis la première weapon
      // pour un meilleur tracking (optionnel)
      const firstWeapon = await context.Weapon.get(weaponIds[0].toString());
      return { firstWeapon };
    } else {
      // Second run ou pas d'IDs : pas de préchargement nécessaire
      return {};
    }
  },
  
  handler: async ({ event, context, loaderReturn }: { event: any; context: any; loaderReturn: any }) => {
    const { weaponIds, cost, rarity, requestId } = event.params;
    const timestamp = BigInt(event.block.timestamp);
    const { firstWeapon } = loaderReturn as { firstWeapon?: any | null };

    // Amélioration : utilise l'owner de la première weapon si disponible
    const requester = firstWeapon?.owner_id || "0x0000000000000000000000000000000000000000";

    // PARALLELISATION : Stockage event + création WeaponRequest
    await Promise.all([
      // Stocke l'événement brut
      context.WeaponRemixer_WeaponMixRequested.set({
        id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
        weaponIds,
        cost,
        rarity,
        requestId,
      }),
      
      // Crée la WeaponRequest pour tracking avec meilleur requester
      createWeaponRequest(context, {
        id: requestId.toString(),
        source: "REMIXER",
        requester: requester, // Amélioration : vrai owner si disponible
        timestamp: timestamp,
        expectedWeapons: 1, // Remix génère toujours 1 weapon
        remixedWeaponIds: weaponIds,
        remixRarity: Number(rarity),
        remixType: "NORMAL",
      })
    ]);
  },
});

/**
 * Handler pour WeaponRemixer.LegendaryMixRequested
 * Gère les mix légendaires (3 Legendary weapons → chance de Mythic)
 */
WeaponRemixer.LegendaryMixRequested.handlerWithLoader({
  loader: async ({ event, context }: { event: any; context: any }) => {
    const { weaponIds } = event.params;
    
    if (context.isPreload && weaponIds.length > 0) {
      // Premier run : essaie de déterminer l'owner depuis la première weapon
      const firstWeapon = await context.Weapon.get(weaponIds[0].toString());
      return { firstWeapon };
    } else {
      return {};
    }
  },
  
  handler: async ({ event, context, loaderReturn }: { event: any; context: any; loaderReturn: any }) => {
    const { weaponIds, cost, rarity, requestId } = event.params;
    const timestamp = BigInt(event.block.timestamp);
    const { firstWeapon } = loaderReturn as { firstWeapon?: any | null };

    // Amélioration : utilise l'owner de la première weapon si disponible
    const requester = firstWeapon?.owner_id || "0x0000000000000000000000000000000000000000";

    // PARALLELISATION : Stockage event + création WeaponRequest
    await Promise.all([
      // Stocke l'événement brut
      context.WeaponRemixer_LegendaryMixRequested.set({
        id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
        weaponIds,
        cost,
        rarity,
        requestId,
      }),
      
      // Crée la WeaponRequest pour tracking avec meilleur requester
      createWeaponRequest(context, {
        id: requestId.toString(),
        source: "REMIXER",
        requester: requester, // Amélioration : vrai owner si disponible
        timestamp: timestamp,
        expectedWeapons: 1, // Remix génère toujours 1 weapon
        remixedWeaponIds: weaponIds,
        remixRarity: Number(rarity),
        remixType: "LEGENDARY",
      })
    ]);
  },
});

/**
 * Handler pour WeaponRemixer.WeaponGenerated
 * Met à jour la WeaponRequest et crée la Weapon avec source tracking remix
 */
WeaponRemixer.WeaponGenerated.handlerWithLoader({
  loader: async ({ event, context }: { event: any; context: any }) => {
    const { requestId, user } = event.params;
    
    if (context.isPreload) {
      // Premier run : charge WeaponRequest et crée Player en parallèle
      const [weaponRequest, player] = await Promise.all([
        context.WeaponRequest.get(requestId.toString()),
        getOrCreatePlayerOptimized(context, user.toLowerCase())
      ]);
      return { weaponRequest, player };
    } else {
      // Second run : récupération simple
      const [weaponRequest, player] = await Promise.all([
        context.WeaponRequest.get(requestId.toString()),
        context.Player.get(user.toLowerCase())
      ]);
      return { weaponRequest, player };
    }
  },
  
  handler: async ({ event, context, loaderReturn }: { event: any; context: any; loaderReturn: any }) => {
    const { user, weaponId, metadata, requestId } = event.params;
    const timestamp = BigInt(event.block.timestamp);

    const parsedMetadata = parseWeaponMetadata(metadata);

    const { weaponRequest, player } = loaderReturn as { weaponRequest: any | null; player: any | null };

    const wr = weaponRequest ?? await context.WeaponRequest.get(requestId.toString());
    if (!wr) {
      console.warn(`WeaponRequest ${requestId} non trouvée pour weapon ${weaponId}`);
    }

    // PARALLELISATION OPTIMISÉE : Plus besoin de getOrCreatePlayer !
    const operations = [
      // Stocke l'événement brut
      context.WeaponRemixer_WeaponGenerated.set({
        id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
        user,
        weaponId,
        metadata,
        requestId,
      }),
      
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
        sourceRemixedWeaponIds: wr?.remixedWeaponIds,
        sourceRemixRarity: wr?.remixRarity,
        sourceRemixType: wr?.remixType,
      })
    ];

    if (wr) {
      const updatedRequest = {
        ...wr,
        requester: user, // Met à jour avec le vrai user
        generatedWeapons: wr.generatedWeapons + 1,
        generatedWeaponIds: [...wr.generatedWeaponIds, weaponId.toString()],
        completed: true,
      };
      operations.push(context.WeaponRequest.set(updatedRequest));
    }

    await Promise.all(operations);
  },
});
