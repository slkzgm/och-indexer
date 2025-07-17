import {
  Fishing,
  Fishing_Staked,
  Fishing_UnstakeRequested,
  Fishing_Unstaked,
} from "generated";
import { setHeroFishingStaked } from "../helpers/entities";
import { updatePlayerCounts } from "../helpers/player";

/**
 * Handler pour Fishing.Staked
 * Stake un héro pour faire de la pêche
 */
Fishing.Staked.handlerWithLoader({
  loader: async ({ event, context }: { event: any; context: any }) => {
    const { heroId } = event.params;
    
    if (context.isPreload) {
      // Premier run : charge le héro (doit exister)
      const hero = await context.Hero.get(heroId.toString());
      return { hero };
    } else {
      // Second run : récupération optimisée
      const hero = await context.Hero.get(heroId.toString());
      return { hero };
    }
  },

  handler: async ({ event, context, loaderReturn }: { event: any; context: any; loaderReturn: any }) => {
    const { owner, heroId, zone, fee } = event.params;
    const timestamp = BigInt(event.block.timestamp);

    const { hero } = loaderReturn as { hero: any | null };
    const existingHero = hero ?? await context.Hero.getOrThrow(heroId.toString(), `Hero ${heroId} non trouvé`);

    // Parallélisation : Stockage event + mise à jour Hero
    await Promise.all([
      // Stocke l'événement brut
      context.Fishing_Staked.set({
        id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
        owner,
        heroId,
        zone,
        fee,
      }),
      
      // Met à jour le héro : staking activé pour fishing avec le bon type selon la zone
      setHeroFishingStaked(context, existingHero, zone, timestamp)
    ]);
    if (!existingHero.staked) {
      await updatePlayerCounts(context, existingHero.owner_id, { stakedHeroCount: 1 });
    }
  },
});

/**
 * Handler pour Fishing.UnstakeRequested
 * Demande d'unstake pour un héro en fishing (nécessite un VRF)
 */
Fishing.UnstakeRequested.handlerWithLoader({
  loader: async ({ event, context }: { event: any; context: any }) => {
    const { heroId } = event.params;
    
    if (context.isPreload) {
      const hero = await context.Hero.get(heroId.toString());
      return { hero };
    } else {
      const hero = await context.Hero.get(heroId.toString());
      return { hero };
    }
  },

  handler: async ({ event, context, loaderReturn }: { event: any; context: any; loaderReturn: any }) => {
    const { owner, heroId, requestId } = event.params;

    const { hero } = loaderReturn as { hero: any | null };
    const existingHero = hero ?? await context.Hero.getOrThrow(heroId.toString(), `Hero ${heroId} non trouvé`);

    // Stocke l'événement brut
    await context.Fishing_UnstakeRequested.set({
      id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      owner,
      heroId,
      requestId,
    });

    // Pour l'instant, on ne change pas le statut du héro car l'unstake n'est que demandé
    // Le héro reste staked jusqu'à l'événement Unstaked final
  },
});

/**
 * Handler pour Fishing.Unstaked
 * Unstake final avec récompenses de fishing
 */
Fishing.Unstaked.handlerWithLoader({
  loader: async ({ event, context }: { event: any; context: any }) => {
    const { heroId } = event.params;
    
    if (context.isPreload) {
      const hero = await context.Hero.get(heroId.toString());
      return { hero };
    } else {
      const hero = await context.Hero.get(heroId.toString());
      return { hero };
    }
  },

  handler: async ({ event, context, loaderReturn }: { event: any; context: any; loaderReturn: any }) => {
    const { owner, heroId, requestId, zone, amount, weaponShardId, bonusId } = event.params;

    const { hero } = loaderReturn as { hero: any | null };
    const existingHero = hero ?? await context.Hero.getOrThrow(heroId.toString(), `Hero ${heroId} non trouvé`);

    // Parallélisation optimisée
    await Promise.all([
      // Stocke l'événement brut
      context.Fishing_Unstaked.set({
        id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
        owner,
        heroId,
        requestId,
        zone,
        amount,
        weaponShardId,
        bonusId,
      }),
      
      // Met à jour le héro : staking désactivé
      context.Hero.set({
        ...existingHero,
        staked: false,
        stakingType: undefined,
        stakedTimestamp: 0n,
        unstakeAvailableTimestamp: 0n,
        lastClaimTimestamp: 0n,
      })
    ]);
    if (existingHero.staked) {
      await updatePlayerCounts(context, existingHero.owner_id, { stakedHeroCount: -1 });
    }
  },
}); 