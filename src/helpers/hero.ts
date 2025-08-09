import { HERO_STAKING_CONTRACTS, ZERO_ADDRESS, S1_LEVELING_CONTRACT, S1_ENDGAME_CONTRACT } from "../constants/index";
import { getOrCreatePlayer, createHero } from "./entities";
import { createActivity } from "./activity";
import { getOrCreateHeroesGlobalStats } from "./stats";

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
      const player = await context.Player.get(hero.owner_id);
      if (player) {
        player.heroCount -= 1;
        player.heroesByLevel[hero.level] -= 1;
        context.Player.set(player);
      }
      // Mise à jour des stats globales
      const global = await getOrCreateHeroesGlobalStats(context);
      global.totalHeroes -= 1;
      global.totalBurned += 1;
      global.heroesByLevel[hero.level] -= 1;
      global.lastUpdated = blockTimestamp || 0n;
      context.HeroesGlobalStats.set(global);
      context.Hero.deleteUnsafe(heroId);
    }
    return;
  }

  // CAS 2: MINT (création du NFT)
  if (from_lc === ZERO_ADDRESS) {
    // S'assure que le joueur propriétaire existe
    await getOrCreatePlayer(context, to_lc);

    // Crée l'entité Hero avec TOUS les champs obligatoires
    createHero(context, {
      id: heroId,
      owner_id: to_lc,
      minter: to_lc, // Le minter est le destinataire du mint (Bytes!)
      mintedTimestamp: blockTimestamp || 0n,
    });

    // Incrémente le compteur du propriétaire
    const player = await context.Player.get(to_lc);
    if (player) {
      player.heroCount += 1;
      player.heroesByLevel[1] += 1; // New heroes start at level 1
      context.Player.set(player);
    }
    // Mise à jour des stats globales
    const global = await getOrCreateHeroesGlobalStats(context);
    global.totalHeroes += 1;
    global.totalMinted += 1;
    global.heroesByLevel[1] += 1;
    global.lastUpdated = blockTimestamp || 0n;
    context.HeroesGlobalStats.set(global);
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
    await getOrCreatePlayer(context, to_lc);

    // Met à jour le propriétaire du Hero
    hero.owner_id = to_lc;
    context.Hero.set(hero);

    // Met à jour les compteurs en parallèle : -1 pour l'ancien, +1 pour le nouveau
    if (oldOwnerId === to_lc) {
      // Même player : pas de changement de compteur nécessaire
    } else {
      // Players différents : updates en parallèle
      await Promise.all([
        (async () => {
          const oldPlayer = await context.Player.get(oldOwnerId);
          if (oldPlayer) {
            oldPlayer.heroCount -= 1;
            oldPlayer.heroesByLevel[hero.level] -= 1;
            context.Player.set(oldPlayer);
          }
        })(),
        (async () => {
          const newPlayer = await context.Player.get(to_lc);
          if (newPlayer) {
            newPlayer.heroCount += 1;
            newPlayer.heroesByLevel[hero.level] += 1;
            context.Player.set(newPlayer);
          }
        })()
      ]);
    }
  }

  // Si la destination est un contrat de staking S1, marquer le héros comme revealed
  if (to_lc === S1_LEVELING_CONTRACT.toLowerCase() || to_lc === S1_ENDGAME_CONTRACT.toLowerCase()) {
    const hero = await context.Hero.get(heroId);
    if (hero && !hero.revealed) {
      await ensureHeroRevealed(context, { hero, user: hero.owner_id, timestamp: blockTimestamp || 0n, contract: 'S1', persist: true });
    }
  }
} 

/**
 * Ensures a hero is marked revealed once, and emits a HERO_REVEALED activity.
 * If persist is false, returns the updated hero object without writing it;
 * caller is expected to persist the returned hero in the same write batch.
 */
export async function ensureHeroRevealed(
  context: any,
  params: {
    hero: any;
    user: string;
    timestamp: bigint;
    contract: string;
    stakingType?: string;
    persist?: boolean;
  }
) {
  const { hero, user, timestamp, contract, stakingType, persist = true } = params;
  if (!hero || hero.revealed === true) return hero;

  const updatedHero = { ...hero, revealed: true };
  if (persist) {
    await context.Hero.set(updatedHero);
  }
  const id = `${timestamp}_${hero.id}_REVEALED`;
  await createActivity(
    context,
    id,
    timestamp,
    user,
    'HERO_REVEALED',
    { heroId: hero.id },
    hero.id,
    contract,
    stakingType
  );
  return updatedHero;
}