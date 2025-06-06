// File: src/handlers/GymHandler.ts

import {
  Gym,
  Gym_ChaosUpgraded,
  Gym_NormalUpgraded,
  Gym_UnknownUpgraded,
  Gym_UpgradeRequested,
  Gym_Upgraded,
} from "../../generated";
import { processTraining } from "../utils/TrainingHelper";

/**
 * Handler for ChaosUpgraded events.
 * - Calls processTraining with CHAOS type and passes the chance array.
 * - Persists the raw Gym_ChaosUpgraded event.
 */
Gym.ChaosUpgraded.handler(async ({ event, context }) => {
  const owner = event.params.owner;
  const heroIdBI = event.params.heroId;
  const heroIdStr = heroIdBI.toString();
  const season = event.params.season;
  const oldLevelNum = Number(event.params.oldLevel);
  const newLevelNum = Number(event.params.newLevel);
  const chances = event.params.chances;
  const timestampBI = BigInt(event.block.timestamp);
  const chainIdBI = BigInt(event.chainId);
  const blockNumBI = BigInt(event.block.number);
  const logIndexBI = BigInt(event.logIndex);

  await processTraining(
      context,
      owner,
      heroIdStr,
      season,
      oldLevelNum,
      newLevelNum,
      "CHAOS",
      timestampBI,
      chainIdBI,
      blockNumBI,
      logIndexBI,
      chances
  );

  const chaosEvent: Gym_ChaosUpgraded = {
    id: `${chainIdBI}_${blockNumBI}_${logIndexBI}`,
    owner,
    heroId: heroIdBI,
    season,
    oldLevel: event.params.oldLevel,
    newLevel: event.params.newLevel,
    chances,
  };
  await context.Gym_ChaosUpgraded.set(chaosEvent);
});

/**
 * Handler for NormalUpgraded events.
 * - Calls processTraining with NORMAL type.
 * - Persists the raw Gym_NormalUpgraded event.
 */
Gym.NormalUpgraded.handler(async ({ event, context }) => {
  const owner = event.params.owner;
  const heroIdBI = event.params.heroId;
  const heroIdStr = heroIdBI.toString();
  const season = event.params.season;
  const oldLevelNum = Number(event.params.oldLevel);
  const newLevelNum = Number(event.params.newLevel);
  const timestampBI = BigInt(event.block.timestamp);
  const chainIdBI = BigInt(event.chainId);
  const blockNumBI = BigInt(event.block.number);
  const logIndexBI = BigInt(event.logIndex);

  await processTraining(
      context,
      owner,
      heroIdStr,
      season,
      oldLevelNum,
      newLevelNum,
      "NORMAL",
      timestampBI,
      chainIdBI,
      blockNumBI,
      logIndexBI
  );

  const normalEvent: Gym_NormalUpgraded = {
    id: `${chainIdBI}_${blockNumBI}_${logIndexBI}`,
    owner,
    heroId: heroIdBI,
    season,
    oldLevel: event.params.oldLevel,
    newLevel: event.params.newLevel,
  };
  await context.Gym_NormalUpgraded.set(normalEvent);
});

/**
 * Handler for UnknownUpgraded events.
 * - Calls processTraining with UNKNOWN type and passes the chance array.
 * - Persists the raw Gym_UnknownUpgraded event.
 */
Gym.UnknownUpgraded.handler(async ({ event, context }) => {
  const owner = event.params.owner;
  const heroIdBI = event.params.heroId;
  const heroIdStr = heroIdBI.toString();
  const season = event.params.season;
  const oldLevelNum = Number(event.params.oldLevel);
  const newLevelNum = Number(event.params.newLevel);
  const chances = event.params.chances;
  const timestampBI = BigInt(event.block.timestamp);
  const chainIdBI = BigInt(event.chainId);
  const blockNumBI = BigInt(event.block.number);
  const logIndexBI = BigInt(event.logIndex);

  await processTraining(
      context,
      owner,
      heroIdStr,
      season,
      oldLevelNum,
      newLevelNum,
      "UNKNOWN",
      timestampBI,
      chainIdBI,
      blockNumBI,
      logIndexBI,
      chances
  );

  const unknownEvent: Gym_UnknownUpgraded = {
    id: `${chainIdBI}_${blockNumBI}_${logIndexBI}`,
    owner,
    heroId: heroIdBI,
    season,
    oldLevel: event.params.oldLevel,
    newLevel: event.params.newLevel,
    chances,
  };
  await context.Gym_UnknownUpgraded.set(unknownEvent);
});

/**
 * Handler for UpgradeRequested events.
 * - Persists the raw Gym_UpgradeRequested event.
 */
Gym.UpgradeRequested.handler(async ({ event, context }) => {
  const chainIdBI = BigInt(event.chainId);
  const blockNumBI = BigInt(event.block.number);
  const logIndexBI = BigInt(event.logIndex);

  const upgradeReq: Gym_UpgradeRequested = {
    id: `${chainIdBI}_${blockNumBI}_${logIndexBI}`,
    season: event.params.season,
    owner: event.params.owner,
    heroId: event.params.heroId,
    levelUp: event.params.levelUp,
    cost: event.params.cost,
  };
  await context.Gym_UpgradeRequested.set(upgradeReq);
});

/**
 * Handler for Upgraded events.
 * - Persists the raw Gym_Upgraded event.
 */
Gym.Upgraded.handler(async ({ event, context }) => {
  const chainIdBI = BigInt(event.chainId);
  const blockNumBI = BigInt(event.block.number);
  const logIndexBI = BigInt(event.logIndex);

  const upgradedEvent: Gym_Upgraded = {
    id: `${chainIdBI}_${blockNumBI}_${logIndexBI}`,
    implementation: event.params.implementation,
  };
  await context.Gym_Upgraded.set(upgradedEvent);
});
