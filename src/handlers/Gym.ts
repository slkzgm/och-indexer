import {
  Gym,
  Gym_NormalUpgraded,
  Gym_ChaosUpgraded,
  Gym_UnknownUpgraded,
  Gym_UpgradeRequested,
} from "generated";
import { handleTraining } from "../helpers";

// Handle NormalUpgraded events
Gym.NormalUpgraded.handler(async ({ event, context }) => {
  const { owner, heroId, oldLevel, newLevel } = event.params;
  await handleTraining(context, owner, heroId, oldLevel, newLevel, "Normal", event);
});

// Handle ChaosUpgraded events
Gym.ChaosUpgraded.handler(async ({ event, context }) => {
  const { owner, heroId, oldLevel, newLevel, chances } = event.params;
  await handleTraining(
    context,
    owner,
    heroId,
    oldLevel,
    newLevel,
    "Chaos",
    event,
    chances,
  );
});

// Handle UnknownUpgraded events
Gym.UnknownUpgraded.handler(async ({ event, context }) => {
  const { owner, heroId, oldLevel, newLevel, chances } = event.params;
  await handleTraining(
    context,
    owner,
    heroId,
    oldLevel,
    newLevel,
    "Unknown",
    event,
    chances,
  );
});

// Handle UpgradeRequested events (ignored)
Gym.UpgradeRequested.handler(async ({ event, context }) => {
  // Ignoring UpgradeRequested events by design
}); 