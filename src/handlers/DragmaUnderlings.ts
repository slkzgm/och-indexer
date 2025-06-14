import { DragmaUnderlings } from "generated";
import {
  handleStake,
  handleUnstake,
  handleClaim,
  handleWeaponDurabilityUpdate,
  handleWeaponSharpnessUpdate,
} from "../helpers";

DragmaUnderlings.Claimed.handler(async ({ event, context }) => {
  await handleClaim(
    context,
    event.params.user,
    event.params.heroId,
    event.params.amount,
    BigInt(event.block.timestamp),
  );
});

DragmaUnderlings.Staked.handler(async ({ event, context }) => {
  await handleStake(
    context,
    event.params.user,
    event.params.heroId,
    BigInt(event.block.timestamp),
  );
});

DragmaUnderlings.Unstaked.handler(async ({ event, context }) => {
  await handleUnstake(
    context,
    event.params.user,
    event.params.heroId,
    BigInt(event.block.timestamp),
  );
});

DragmaUnderlings.WeaponDurabilityUpdated.handler(
  async ({ event, context }) => {
    await handleWeaponDurabilityUpdate(
      context,
      event.params.weaponId,
      event.params.newDurability,
    );
  },
);

DragmaUnderlings.WeaponSharpnessUpdated.handler(
  async ({ event, context }) => {
    await handleWeaponSharpnessUpdate(
      context,
      event.params.weaponId,
      event.params.newSharpness,
    );
  },
); 