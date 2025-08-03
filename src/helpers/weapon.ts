import { WEAPON_STAKING_CONTRACTS, ZERO_ADDRESS } from "../constants/index";
import { updatePlayerCounts, updatePlayerCountsBatch } from "./player";
import { getOrCreatePlayer, createWeapon } from "./entities";

/**
 * Gère la logique de transfert pour un Weapon NFT.
 * Crée le Weapon et/ou le Player si nécessaire.
 * Ignore les changements de propriétaire pour les transferts vers des contrats de staking.
 * @param context Le contexte du handler
 * @param tokenId L'ID du Weapon transféré
 * @param from L'adresse de l'expéditeur
 * @param to L'adresse du destinataire
 * @param blockTimestamp Timestamp du block pour le mint
 */
export async function handleWeaponTransfer(
  context: any, // Utilise le type généré par Envio
  tokenId: bigint,
  from: string,
  to: string,
  blockTimestamp?: bigint,
) {
  const weaponId = tokenId.toString();
  const from_lc = from.toLowerCase();
  const to_lc = to.toLowerCase();

  // Validation : addresses différentes
  if (from_lc === to_lc) {
    return; // Ignore les auto-transferts
  }

  // CAS 1: BURN
  if (to_lc === ZERO_ADDRESS) {
    // Récupère la weapon pour connaître son owner avant suppression
    const weapon = await context.Weapon.get(weaponId);
    if (weapon) {
      // Décrémente le compteur du propriétaire
      const countUpdates = [{ playerId: weapon.owner_id, changes: { weaponCount: -1 } }];
      const updatedPlayers = await updatePlayerCountsBatch(context, countUpdates);
      await Promise.all(updatedPlayers.map(player => context.Player.set(player)));
      context.Weapon.deleteUnsafe(weaponId);
    }
    return;
  }

  // CAS 2: MINT (création du NFT)
  if (from_lc === ZERO_ADDRESS) {
    // S'assure que le joueur propriétaire existe
    await getOrCreatePlayer(context, to_lc);

    // Crée l'entité Weapon avec TOUS les champs obligatoires
    createWeapon(context, {
      id: weaponId,
      owner_id: to_lc,
      minter: to_lc, // Le minter est le destinataire du mint (Bytes!)
      mintedTimestamp: blockTimestamp || 0n,
      rarity: 0, // COMMON par défaut, sera mis à jour par WeaponMetadataGenerated
      // Les autres champs utilisent les valeurs par défaut
    });

    // Incrémente le compteur du propriétaire
    const countUpdates = [{ playerId: to_lc, changes: { weaponCount: 1 } }];
    const updatedPlayers = await updatePlayerCountsBatch(context, countUpdates);
    await Promise.all(updatedPlayers.map(player => context.Player.set(player)));
    return;
  }

  // CAS 3: TRANSFERT standard (ni mint, ni burn)
  // On ne change le propriétaire que si la destination N'EST PAS un contrat de staking
  if (!WEAPON_STAKING_CONTRACTS.includes(to_lc)) {
    // Récupère l'arme. Elle doit exister
    const weapon = await context.Weapon.getOrThrow(
      weaponId,
      `Weapon ${weaponId} non trouvé lors du transfert de ${from_lc} à ${to_lc}`,
    );

    const oldOwnerId = weapon.owner_id;

    // S'assure que le nouveau joueur propriétaire existe
    await getOrCreatePlayer(context, to_lc);

    // Met à jour le propriétaire du Weapon
    weapon.owner_id = to_lc;
    context.Weapon.set(weapon);

    // Met à jour les compteurs en batch : -1 pour l'ancien, +1 pour le nouveau
    if (oldOwnerId === to_lc) {
      // Même player : pas de changement de compteur nécessaire
    } else {
      // Players différents : updates en batch
      const countUpdates = [
        { playerId: oldOwnerId, changes: { weaponCount: -1 } },
        { playerId: to_lc, changes: { weaponCount: 1 } }
      ];
      
      const updatedPlayers = await updatePlayerCountsBatch(context, countUpdates);
      await Promise.all(updatedPlayers.map(player => context.Player.set(player)));
    }
  }

  // Si la destination EST un contrat de staking, on ne fait rien
  // La propriété logique du NFT ne change pas pour notre indexeur
} 