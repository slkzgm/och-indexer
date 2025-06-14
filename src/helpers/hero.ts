import {
  CHAOS_CHANCES_SIZE,
  CHAOS_LEVEL_GAIN_RANGE_SIZE,
  HERO_STAKING_CONTRACTS,
  UNKNOWN_CHANCES_SIZE,
  UNKNOWN_LEVEL_GAIN_RANGE_SIZE,
  ZERO_ADDRESS,
} from "../constants/index";
import {
  getOrCreatePlayer,
  getOrCreateGlobalStats,
  getAndNormalizePlayer,
} from ".";
import { getTrainingCost } from "./formulas";

type Context = any; // Le typage sera inféré lors de l'appel dans le handler

const NEW_HERO_DEFAULTS = {
  level: 1n,
  transferCount: 0n,
  lastTrainedTimestamp: 0n,
  totalClaimed: 0n,
  totalStaked: 0n,
  totalUnstaked: 0n,
  totalTrainings: 0n,
  totalTrainingCost: 0n,
  totalLevelGains: 0n,
  normalTrainingCost: 0n,
  chaosTrainingCost: 0n,
  unknownTrainingCost: 0n,
  normalTrainingsCount: 0n,
  chaosTrainingsCount: 0n,
  unknownTrainingsCount: 0n,
  normalLevelGains: 0n,
  chaosLevelGains: 0n,
  unknownLevelGains: 0n,
  chaosLevelGainsDistribution: Array(CHAOS_LEVEL_GAIN_RANGE_SIZE).fill(0n),
  unknownLevelGainsDistribution: Array(UNKNOWN_LEVEL_GAIN_RANGE_SIZE).fill(0n),
  chaosChancesSum: Array(CHAOS_CHANCES_SIZE).fill(0n),
  unknownChancesSum: Array(UNKNOWN_CHANCES_SIZE).fill(0n),
  nextTrainingAvailableTimestamp: 0n,
  nextTrainingCost: 0n,
  damage: 0n,
  equippedWeapon_id: undefined,

  // Staking stats
  staked: false,
  stakingType: undefined,
  stakedTimestamp: 0n,
  unstakeAvailableTimestamp: 0n,
  lastClaimTimestamp: 0n,
  totalStakedTime: 0n,
  stakingCount: 0n,
  baseHeroPerDay: 0n,
  bonusHeroPerDay: 0n,
  dailyReward: 0n,
  hourlyReward: 0n,
  stakingTotalClaimed: 0n,
};

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
  timestamp: number,
) {
  const heroId = tokenId.toString();
  const from_lc = from.toLowerCase();
  const to_lc = to.toLowerCase();
  const globalStats = await getOrCreateGlobalStats(context);

  // CAS 1: BURN
  // Si le Hero est envoyé à l'adresse zéro, on met à jour les stats et on le supprime.
  if (to_lc === ZERO_ADDRESS) {
    const hero = await context.Hero.get(heroId);
    if (hero) {
      // Normalise l'entité Hero
      for (const key in NEW_HERO_DEFAULTS) {
        if (hero[key] === undefined) {
          hero[key] = (NEW_HERO_DEFAULTS as any)[key];
        }
      }

      if (hero.owner_id) {
        const owner = await getAndNormalizePlayer(context, hero.owner_id);
        if (owner) {
          owner.heroesBurned += 1n;
          owner.heroesCount -= 1n;
          owner.totalNextTrainingCost -= hero.nextTrainingCost;
          if (hero.level > 0 && hero.level <= owner.heroCountByLevel.length) {
            owner.heroCountByLevel[Number(hero.level) - 1] -= 1n;
          }
          context.Player.set(owner);
        }
      }
    }
    globalStats.heroesCount -= 1n;
    if (hero && hero.level > 0 && hero.level <= globalStats.heroCountByLevel.length) {
      globalStats.heroCountByLevel[Number(hero.level) - 1] -= 1n;
    }
    context.GlobalStats.set(globalStats);
    context.Hero.deleteUnsafe(heroId);
    return;
  }

  // CAS 2: MINT (création du NFT)
  if (from_lc === ZERO_ADDRESS) {
    // Met à jour les stats du minter.
    const player = await getOrCreatePlayer(context, to);
    const initialTrainingCost = getTrainingCost(1n);
    player.heroesMinted += 1n;
    player.heroesCount += 1n;
    player.heroCountByLevel[0] += 1n; // Minted at level 1
    player.totalNextTrainingCost = (player.totalNextTrainingCost || 0n) + initialTrainingCost;
    context.Player.set(player);

    globalStats.heroesCount += 1n;
    globalStats.heroCountByLevel[0] += 1n;
    context.GlobalStats.set(globalStats);

    // Crée l'entité Hero avec toutes ses propriétés initiales.
    context.Hero.set({
      id: heroId,
      owner_id: to_lc,
      minter_id: to_lc,
      mintedTimestamp: BigInt(timestamp),
      ...NEW_HERO_DEFAULTS,
      nextTrainingCost: initialTrainingCost,
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

    // Normalise l'entité Hero
    for (const key in NEW_HERO_DEFAULTS) {
      if (hero[key] === undefined) {
        hero[key] = (NEW_HERO_DEFAULTS as any)[key];
      }
    }

    // Met à jour les compteurs des joueurs en parallèle.
    const [fromPlayer, toPlayer] = await Promise.all([
      getAndNormalizePlayer(context, from_lc), // fromPlayer devrait exister.
      getOrCreatePlayer(context, to),
    ]);

    if (fromPlayer) {
      fromPlayer.heroesCount -= 1n;
      fromPlayer.heroTransfersOut += 1n;
      fromPlayer.totalNextTrainingCost -= hero.nextTrainingCost;
      if (hero.level > 0 && hero.level <= fromPlayer.heroCountByLevel.length) {
        fromPlayer.heroCountByLevel[Number(hero.level) - 1] -= 1n;
      }
      context.Player.set(fromPlayer);
    }

    toPlayer.heroesCount += 1n;
    toPlayer.heroTransfersIn += 1n;
    toPlayer.totalNextTrainingCost = (toPlayer.totalNextTrainingCost || 0n) + hero.nextTrainingCost;
    if (hero.level > 0 && hero.level <= toPlayer.heroCountByLevel.length) {
      toPlayer.heroCountByLevel[Number(hero.level) - 1] += 1n;
    }
    context.Player.set(toPlayer);

    // Met à jour le propriétaire et le compteur de transfert du Hero.
    hero.owner_id = to_lc;
    hero.transferCount += 1n;
    context.Hero.set(hero);

    // Met à jour le compteur global
    globalStats.totalHeroTransfers += 1n;
    context.GlobalStats.set(globalStats);
  }

  // Si la destination EST un contrat de staking, on ne fait rien.
  // La propriété logique du NFT ne change pas pour notre indexeur.
} 