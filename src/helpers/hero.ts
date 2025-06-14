import { HERO_STAKING_CONTRACTS, ZERO_ADDRESS } from "../constants/index";
import { updatePlayerCounts } from "./player";

/**
 * Gère la logique de transfert pour un Hero NFT.
 * Crée le Hero et/ou le Player si nécessaire.
 * Ignore les changements de propriétaire pour les transferts vers des contrats de staking.
 * @param context Le contexte du handler
 * @param tokenId L'ID du Hero transféré
 * @param from L'adresse de l'expéditeur
 * @param to L'adresse du destinataire
 * @param blockTimestamp Timestamp du block pour le mint
 */
export async function handleHeroTransfer(
  context: any, // Utilise le type généré par Envio
  tokenId: bigint,
  from: string,
  to: string,
  blockTimestamp?: bigint,
) {
  const heroId = tokenId.toString();
  const from_lc = from.toLowerCase();
  const to_lc = to.toLowerCase();

  // Validation : addresses différentes
  if (from_lc === to_lc) {
    return; // Ignore les auto-transferts
  }

  // CAS 1: BURN
  if (to_lc === ZERO_ADDRESS) {
    // Récupère le hero pour connaître son owner avant suppression
    const hero = await context.Hero.get(heroId);
    if (hero) {
      // Décrémente le compteur du propriétaire
      await updatePlayerCounts(context, hero.owner_id, { heroCount: -1 });
      context.Hero.deleteUnsafe(heroId);
    }
    return;
  }

  // CAS 2: MINT (création du NFT)
  if (from_lc === ZERO_ADDRESS) {
    // S'assure que le joueur propriétaire existe
    const player = await context.Player.getOrCreate({
      id: to_lc,
      balance: 0n,
      heroCount: 0,
      weaponCount: 0,
      stakedHeroCount: 0,
      gachaBalances: [0n, 0n, 0n, 0n], // [bronze, silver, gold, rainbow]
    });

    // Crée l'entité Hero avec TOUS les champs obligatoires
    context.Hero.set({
      id: heroId,
      owner_id: to_lc,
      minter: to_lc, // Le minter est le destinataire du mint (Bytes!)
      mintedTimestamp: blockTimestamp || 0n,
      level: 1,
      lastTrainingTimestamp: 0n,
      nextTrainingCost: 0n,
      damage: 0n,
      staked: false,
    });

    // Incrémente le compteur du propriétaire
    await updatePlayerCounts(context, to_lc, { heroCount: 1 });
    return;
  }

  // CAS 3: TRANSFERT standard (ni mint, ni burn)
  // On ne change le propriétaire que si la destination N'EST PAS un contrat de staking
  if (!HERO_STAKING_CONTRACTS.includes(to_lc)) {
    // Récupère le héro. Il doit exister
    const hero = await context.Hero.getOrThrow(
      heroId,
      `Hero ${heroId} non trouvé lors du transfert de ${from_lc} à ${to_lc}`,
    );

    const oldOwnerId = hero.owner_id;

    // S'assure que le nouveau joueur propriétaire existe
    await context.Player.getOrCreate({
      id: to_lc,
      balance: 0n,
      heroCount: 0,
      weaponCount: 0,
      stakedHeroCount: 0,
      gachaBalances: [0n, 0n, 0n, 0n], // [bronze, silver, gold, rainbow]
    });

    // Met à jour le propriétaire du Hero
    hero.owner_id = to_lc;
    context.Hero.set(hero);

    // Met à jour les compteurs en parallèle : -1 pour l'ancien, +1 pour le nouveau
    if (oldOwnerId === to_lc) {
      // Même player : pas de changement de compteur nécessaire
    } else {
      // Players différents : updates en parallèle
      await Promise.all([
        updatePlayerCounts(context, oldOwnerId, { heroCount: -1 }),
        updatePlayerCounts(context, to_lc, { heroCount: 1 })
      ]);
    }
  }

  // Si la destination EST un contrat de staking, on ne fait rien
  // La propriété logique du NFT ne change pas pour notre indexeur
} 