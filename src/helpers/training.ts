import {
  CHAOS_LEVEL_GAIN_MIN,
  HERO_TRAINING_COOLDOWN_SECONDS,
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
  event: any,
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

  // 4. Calculate cost & update player's total next training cost
  const oldTrainingCost = hero.nextTrainingCost || getTrainingCost(oldLevel);
  const newTrainingCost = getTrainingCost(newLevel);
  player.totalNextTrainingCost = (player.totalNextTrainingCost || 0n) - BigInt(oldTrainingCost) + BigInt(newTrainingCost);
  
  // 5. Update Player, Hero, and GlobalStats
  const cost = getTrainingCost(oldLevel);

  // --- Update Player Stats ---
  player.totalTrainings += 1n;
  player.totalTrainingCost += cost;
  player.totalLevelGains += levelGain;

  // --- Update Hero Stats ---
  hero.totalTrainings += 1n;
  hero.totalTrainingCost += cost;
  hero.totalLevelGains += levelGain;

  // --- Update Global Stats ---
  globalStats.totalTrainings += 1n;
  globalStats.totalTrainingCost += cost;
  globalStats.totalLevelGains += levelGain;

  switch (trainingType) {
    case "Normal":
      player.normalTrainingsCount += 1n;
      player.normalTrainingCost += cost;
      player.normalLevelGains += levelGain;
      hero.normalTrainingsCount += 1n;
      hero.normalTrainingCost += cost;
      hero.normalLevelGains += levelGain;
      globalStats.totalNormalTrainingsCount += 1n;
      globalStats.totalNormalTrainingCost += cost;
      globalStats.totalNormalLevelGains += levelGain;
      break;
    case "Chaos":
      player.chaosTrainingsCount += 1n;
      player.chaosTrainingCost += cost;
      player.chaosLevelGains += levelGain;
      hero.chaosTrainingsCount += 1n;
      hero.chaosTrainingCost += cost;
      hero.chaosLevelGains += levelGain;
      globalStats.totalChaosTrainingsCount += 1n;
      globalStats.totalChaosTrainingCost += cost;
      globalStats.totalChaosLevelGains += levelGain;

      if (chances) {
        for (let i = 0; i < chances.length; i++) {
          player.chaosChancesSum[i] += chances[i];
          hero.chaosChancesSum[i] += chances[i];
          globalStats.totalChaosChancesSum[i] += chances[i];
        }
      }
      const chaosIndex = Number(levelGain) - CHAOS_LEVEL_GAIN_MIN;
      player.chaosLevelGainsDistribution[chaosIndex] += 1n;
      hero.chaosLevelGainsDistribution[chaosIndex] += 1n;
      globalStats.totalChaosLevelGainsDistribution[chaosIndex] += 1n;
      break;
    case "Unknown":
      player.unknownTrainingsCount += 1n;
      player.unknownTrainingCost += cost;
      player.unknownLevelGains += levelGain;
      hero.unknownTrainingsCount += 1n;
      hero.unknownTrainingCost += cost;
      hero.unknownLevelGains += levelGain;
      globalStats.totalUnknownTrainingsCount += 1n;
      globalStats.totalUnknownTrainingCost += cost;
      globalStats.totalUnknownLevelGains += levelGain;

      if (chances) {
        for (let i = 0; i < chances.length; i++) {
          player.unknownChancesSum[i] += chances[i];
          hero.unknownChancesSum[i] += chances[i];
          globalStats.totalUnknownChancesSum[i] += chances[i];
        }
      }
      const unknownIndex = Number(levelGain) - UNKNOWN_LEVEL_GAIN_MIN;
      player.unknownLevelGainsDistribution[unknownIndex] += 1n;
      hero.unknownLevelGainsDistribution[unknownIndex] += 1n;
      globalStats.totalUnknownLevelGainsDistribution[unknownIndex] += 1n;
      break;
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

  // 7. Update Hero entity specific fields
  hero.level = newLevel;
  const timestamp = BigInt(event.block.timestamp);
  hero.lastTrainedTimestamp = timestamp;
  hero.nextTrainingAvailableTimestamp = timestamp + BigInt(HERO_TRAINING_COOLDOWN_SECONDS);
  hero.nextTrainingCost = newTrainingCost;

  // 8. Save all updated entities
  context.Player.set(player);
  context.Hero.set(hero);
  context.GlobalStats.set(globalStats);
} 