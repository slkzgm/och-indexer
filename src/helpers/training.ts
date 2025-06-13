import {
  CHAOS_LEVEL_GAIN_MIN,
  MAX_LEVEL,
  UNKNOWN_LEVEL_GAIN_MIN,
} from "../constants";
import { getOrCreateGlobalStats, getOrCreatePlayer } from "./";
import { getTrainingCost } from "./formulas";

type Context = any;
type TrainingType = "Normal" | "Chaos" | "Unknown";

export async function handleTraining(
  context: Context,
  owner: string,
  heroId: bigint,
  oldLevel: bigint,
  newLevel: bigint,
  trainingType: TrainingType,
  chances?: bigint[],
) {
  const levelGain = newLevel - oldLevel;

  // 1. Get all entities in parallel
  const [player, hero, globalStats] = await Promise.all([
    getOrCreatePlayer(context, owner),
    context.Hero.get(heroId.toString()),
    getOrCreateGlobalStats(context),
  ]);

  if (!hero) {
    // This is a critical issue, a hero that was upgraded doesn't exist in our DB.
    // We should log this error.
    context.log.error(`Hero ${heroId} not found during training event.`);
    return;
  }

  // 2. Calculate cost
  const cost = getTrainingCost(oldLevel);

  // 3. Update Player, Hero, and GlobalStats
  const entities = [player, hero, globalStats];
  for (const entity of entities) {
    entity.totalTrainings += 1n;
    entity.totalTrainingCost += cost;
    entity.totalLevelGains += levelGain;

    switch (trainingType) {
      case "Normal":
        entity.normalTrainingsCount += 1n;
        entity.normalTrainingCost += cost;
        entity.normalLevelGains += levelGain;
        break;
      case "Chaos":
        entity.chaosTrainingsCount += 1n;
        entity.chaosTrainingCost += cost;
        entity.chaosLevelGains += levelGain;
        if (chances && entity.chaosChancesSum) {
          for (let i = 0; i < chances.length; i++) {
            entity.chaosChancesSum[i] =
              (entity.chaosChancesSum[i] || 0n) + chances[i];
          }
        }
        if (entity.chaosLevelGainsDistribution) {
          const index = Number(levelGain) - CHAOS_LEVEL_GAIN_MIN;
          entity.chaosLevelGainsDistribution[index] += 1n;
        }
        break;
      case "Unknown":
        entity.unknownTrainingsCount += 1n;
        entity.unknownTrainingCost += cost;
        entity.unknownLevelGains += levelGain;
        if (chances && entity.unknownChancesSum) {
          for (let i = 0; i < chances.length; i++) {
            entity.unknownChancesSum[i] =
              (entity.unknownChancesSum[i] || 0n) + chances[i];
          }
        }
        if (entity.unknownLevelGainsDistribution) {
          const index = Number(levelGain) - UNKNOWN_LEVEL_GAIN_MIN;
          entity.unknownLevelGainsDistribution[index] += 1n;
        }
        break;
    }
  }

  // 4. Update level-specific stats
  const oldLevelNum = Number(oldLevel);
  const newLevelNum = Number(newLevel);

  // We only update the level distribution if there was a change
  if (levelGain !== 0n) {
    if (oldLevelNum > 0 && oldLevelNum <= MAX_LEVEL) {
      player.heroCountByLevel[oldLevelNum - 1] -= 1n;
      globalStats.heroCountByLevel[oldLevelNum - 1] -= 1n;
    }
    if (newLevelNum > 0 && newLevelNum <= MAX_LEVEL) {
      player.heroCountByLevel[newLevelNum - 1] += 1n;
      globalStats.heroCountByLevel[newLevelNum - 1] += 1n;
    }
  }

  player.totalHeroesLevel += levelGain;
  globalStats.totalHeroesLevel += levelGain;

  // 5. Update Hero entity specific fields
  hero.level = newLevel;

  // 6. Save all updated entities
  context.Player.set(player);
  context.Hero.set(hero);
  context.GlobalStats.set(globalStats);
} 