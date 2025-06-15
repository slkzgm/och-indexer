import {
  Gym,
  Gym_ChaosUpgraded,
  Gym_NormalUpgraded,
  Gym_UnknownUpgraded,
  Gym_UpgradeRequested,
} from "generated";
import { handleHeroTraining } from "../helpers/training";

Gym.ChaosUpgraded.handlerWithLoader({
  loader: async () => ({}),
  handler: async ({ event, context }) => {
    const { owner, heroId, season, oldLevel, newLevel, chances } = event.params;
    const timestamp = BigInt(event.block.timestamp);

    // Stocke l'événement brut
    const entity: Gym_ChaosUpgraded = {
      id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      owner,
      heroId,
      season,
      oldLevel,
      newLevel,
      chances,
    };

    // PARALLELISATION : Stockage event + mise à jour Hero en parallèle
    await Promise.all([
      // Stocke l'événement brut
      context.Gym_ChaosUpgraded.set(entity),
      
      // Met à jour l'entité Hero
      handleHeroTraining(
        context,
        heroId.toString(),
        Number(oldLevel),
        Number(newLevel),
        timestamp
      )
    ]);
  }
});

Gym.NormalUpgraded.handlerWithLoader({
  loader: async () => ({}),
  handler: async ({ event, context }) => {
    const { owner, heroId, season, oldLevel, newLevel } = event.params;
    const timestamp = BigInt(event.block.timestamp);

    // Stocke l'événement brut
    const entity: Gym_NormalUpgraded = {
      id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      owner,
      heroId,
      season,
      oldLevel,
      newLevel,
    };

    // PARALLELISATION : Stockage event + mise à jour Hero en parallèle
    await Promise.all([
      // Stocke l'événement brut
      context.Gym_NormalUpgraded.set(entity),
      
      // Met à jour l'entité Hero
      handleHeroTraining(
        context,
        heroId.toString(),
        Number(oldLevel),
        Number(newLevel),
        timestamp
      )
    ]);
  }
});

Gym.UnknownUpgraded.handlerWithLoader({
  loader: async () => ({}),
  handler: async ({ event, context }) => {
    const { owner, heroId, season, oldLevel, newLevel, chances } = event.params;
    const timestamp = BigInt(event.block.timestamp);

    // Stocke l'événement brut
    const entity: Gym_UnknownUpgraded = {
      id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      owner,
      heroId,
      season,
      oldLevel,
      newLevel,
      chances,
    };

    // PARALLELISATION : Stockage event + mise à jour Hero en parallèle
    await Promise.all([
      // Stocke l'événement brut
      context.Gym_UnknownUpgraded.set(entity),
      
      // Met à jour l'entité Hero
      handleHeroTraining(
        context,
        heroId.toString(),
        Number(oldLevel),
        Number(newLevel),
        timestamp
      )
    ]);
  }
});

Gym.UpgradeRequested.handlerWithLoader({
  loader: async () => ({}),
  handler: async ({ event, context }) => {
    const { season, owner, heroId, levelUp, cost } = event.params;

    // Stocke l'événement brut (optionnel, selon vos besoins)
    const entity: Gym_UpgradeRequested = {
      id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      season,
      owner,
      heroId,
      levelUp,
      cost,
    };
    context.Gym_UpgradeRequested.set(entity);

    // Note: On ne fait rien d'autre ici car l'event Request ne confirme pas le succès
    // Le vrai update se fait dans les handlers *Upgraded
  }
}); 