import {
  Gym,
} from "generated";
import { handleTraining } from "../helpers";

Gym.NormalUpgraded.handler(async ({ event, context }) => {
  const { owner, heroId, oldLevel, newLevel } = event.params;
  await handleTraining(context, owner, heroId, oldLevel, newLevel, "Normal");
});

Gym.ChaosUpgraded.handler(async ({ event, context }) => {
  const { owner, heroId, oldLevel, newLevel, chances } = event.params;
  await handleTraining(
    context,
    owner,
    heroId,
    oldLevel,
    newLevel,
    "Chaos",
    chances,
  );
});

Gym.UnknownUpgraded.handler(async ({ event, context }) => {
  const { owner, heroId, oldLevel, newLevel, chances } = event.params;
  await handleTraining(
    context,
    owner,
    heroId,
    oldLevel,
    newLevel,
    "Unknown",
    chances,
  );
});

Gym.UpgradeRequested.handler(async ({ event, context }) => {
  // We are ignoring UpgradeRequested for now as per the requirements.
}); 