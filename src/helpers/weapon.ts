import { WEAPON_STAKING_CONTRACTS, ZERO_ADDRESS } from "../constants/index";
import { getOrCreatePlayer, getOrCreateGlobalStats } from ".";

type Context = any; // Le typage sera inféré lors de l'appel dans le handler

/**
 * Gère la logique de transfert pour un Weapon NFT.
 * Crée le Weapon et/ou le Player si nécessaire.
 * Ignore les changements de propriétaire pour les transferts vers des contrats de staking.
 * @param context Le contexte du handler.
 * @param tokenId L'ID du Weapon transféré.
 * @param from L'adresse de l'expéditeur.
 * @param to L'adresse du destinataire.
 */
export async function handleWeaponTransfer(
  context: Context,
  tokenId: bigint,
  from: string,
  to: string,
  timestamp: number,
) {
  const weaponId = tokenId.toString();
  const from_lc = from.toLowerCase();
  const to_lc = to.toLowerCase();
  const globalStats = await getOrCreateGlobalStats(context);

  // CAS 1: BURN
  // Si le Weapon est envoyé à l'adresse zéro, on met à jour les stats et on le supprime.
  if (to_lc === ZERO_ADDRESS) {
    const weapon = await context.Weapon.get(weaponId);
    if (weapon && weapon.owner_id) {
      const owner = await context.Player.get(weapon.owner_id);
      if (owner) {
        owner.weaponsBurned += 1n;
        owner.weaponsCount -= 1n;
        context.Player.set(owner);
      }
    }
    globalStats.weaponsCount -= 1n;
    context.GlobalStats.set(globalStats);
    context.Weapon.deleteUnsafe(weaponId);
    return;
  }

  // CAS 2: MINT (création du NFT)
  if (from_lc === ZERO_ADDRESS) {
    // Met à jour les stats du minter.
    const player = await getOrCreatePlayer(context, to);
    player.weaponsMinted += 1n;
    player.weaponsCount += 1n;
    context.Player.set(player);

    globalStats.weaponsCount += 1n;
    context.GlobalStats.set(globalStats);

    // Crée l'entité Weapon.
    context.Weapon.set({
      id: weaponId,
      owner_id: to_lc,
      minter_id: to_lc,
      mintedTimestamp: BigInt(timestamp),
      transferCount: 0n,
    });
    return;
  }

  // CAS 3: TRANSFERT standard (ni mint, ni burn)
  // On ne change le propriétaire que si la destination N'EST PAS un contrat de staking.
  if (!WEAPON_STAKING_CONTRACTS.includes(to_lc)) {
    // Récupère l'arme. Elle doit exister, sinon c'est une situation anormale.
    const weapon = await context.Weapon.getOrThrow(
      weaponId,
      `Weapon ${weaponId} non trouvé lors du transfert de ${from_lc} à ${to_lc}`,
    );

    // Met à jour les compteurs des joueurs en parallèle.
    const [fromPlayer, toPlayer] = await Promise.all([
      context.Player.get(from_lc), // fromPlayer devrait exister.
      getOrCreatePlayer(context, to),
    ]);

    if (fromPlayer) {
      fromPlayer.weaponsCount -= 1n;
      fromPlayer.weaponTransfersOut += 1n;
      context.Player.set(fromPlayer);
    }

    toPlayer.weaponsCount += 1n;
    toPlayer.weaponTransfersIn += 1n;
    context.Player.set(toPlayer);

    // Met à jour le propriétaire et le compteur de transfert du Weapon.
    weapon.owner_id = to_lc;
    weapon.transferCount += 1n;
    context.Weapon.set(weapon);

    // Met à jour le compteur global
    globalStats.totalWeaponTransfers += 1n;
    context.GlobalStats.set(globalStats);
  }

  // Si la destination EST un contrat de staking, on ne fait rien.
  // La propriété logique du NFT ne change pas pour notre indexeur.
} 