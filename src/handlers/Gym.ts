import {
  Gym,
  Gym_ChaosUpgraded,
  Gym_NormalUpgraded,
  Gym_UnknownUpgraded,
  Gym_UpgradeRequested,
} from "generated";

Gym.ChaosUpgraded.handler(async ({ event, context }) => {
  const entity: Gym_ChaosUpgraded = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    owner: event.params.owner,
    heroId: event.params.heroId,
    season: event.params.season,
    oldLevel: event.params.oldLevel,
    newLevel: event.params.newLevel,
    chances: event.params.chances,
  };

  context.Gym_ChaosUpgraded.set(entity);
});

Gym.NormalUpgraded.handler(async ({ event, context }) => {
  const entity: Gym_NormalUpgraded = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    owner: event.params.owner,
    heroId: event.params.heroId,
    season: event.params.season,
    oldLevel: event.params.oldLevel,
    newLevel: event.params.newLevel,
  };

  context.Gym_NormalUpgraded.set(entity);
});

Gym.UnknownUpgraded.handler(async ({ event, context }) => {
  const entity: Gym_UnknownUpgraded = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    owner: event.params.owner,
    heroId: event.params.heroId,
    season: event.params.season,
    oldLevel: event.params.oldLevel,
    newLevel: event.params.newLevel,
    chances: event.params.chances,
  };

  context.Gym_UnknownUpgraded.set(entity);
});

Gym.UpgradeRequested.handler(async ({ event, context }) => {
  const entity: Gym_UpgradeRequested = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    season: event.params.season,
    owner: event.params.owner,
    heroId: event.params.heroId,
    levelUp: event.params.levelUp,
    cost: event.params.cost,
  };

  context.Gym_UpgradeRequested.set(entity);
}); 