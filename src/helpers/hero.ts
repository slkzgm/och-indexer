import { HERO_STAKING_CONTRACTS, ZERO_ADDRESS } from "../constants/index";

type Context = any; // Le typage sera inféré lors de l'appel dans le handler

/**
 * Gère la logique de transfert pour un Hero NFT.
 * Crée le Hero et/ou le Player si nécessaire.
 * Ignore les changements de propriétaire pour les transferts vers des contrats de staking.
 * @param context Le contexte du handler.
 * @param tokenId L'ID du Hero transféré.
 * @param from L'adresse de l'expéditeur.
 * @param to L'adresse du destinataire.
 */
export async function handleHeroTransfer(
  context: Context,
  tokenId: bigint,
  from: string,
  to: string,
) {
  const heroId = tokenId.toString();
  const from_lc = from.toLowerCase();
  const to_lc = to.toLowerCase();

  // CAS 1: BURN
  // Si le Hero est envoyé à l'adresse zéro, on le supprime de la base de données.
  if (to_lc === ZERO_ADDRESS) {
    context.Hero.deleteUnsafe(heroId);
    return;
  }

  // CAS 2: MINT (création du NFT)
  if (from_lc === ZERO_ADDRESS) {
    // S'assure que le joueur propriétaire existe, le crée avec une balance par défaut sinon.
    await context.Player.getOrCreate({
      id: to_lc,
      balance: 0n, // Valeur par défaut pour la balance ERC20
    });

    // Crée l'entité Hero.
    context.Hero.set({
      id: heroId,
      owner_id: to_lc,
    });
    return;
  }

  // CAS 3: TRANSFERT standard (ni mint, ni burn)
  // On ne change le propriétaire que si la destination N'EST PAS un contrat de staking.
  if (!HERO_STAKING_CONTRACTS.includes(to_lc)) {
    // Récupère le héro. Il doit exister, sinon c'est une situation anormale.
    const hero = await context.Hero.getOrThrow(
      heroId,
      `Hero ${heroId} non trouvé lors du transfert de ${from_lc} à ${to_lc}`,
    );

    // S'assure que le nouveau joueur propriétaire existe.
    await context.Player.getOrCreate({
      id: to_lc,
      balance: 0n,
    });

    // Met à jour le propriétaire du Hero.
    hero.owner_id = to_lc;
    context.Hero.set(hero);
  }

  // Si la destination EST un contrat de staking, on ne fait rien.
  // La propriété logique du NFT ne change pas pour notre indexeur.
} 