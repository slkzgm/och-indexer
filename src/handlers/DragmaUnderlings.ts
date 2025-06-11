import {
  DragmaUnderlings,
  DragmaUnderlings_Claimed,
  DragmaUnderlings_Staked,
  DragmaUnderlings_Unstaked,
  DragmaUnderlings_WeaponDurabilityUpdated,
  DragmaUnderlings_WeaponSharpnessUpdated,
} from "generated";

DragmaUnderlings.Claimed.handler(async ({ event, context }) => {
  const entity: DragmaUnderlings_Claimed = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    user: event.params.user,
    heroId: event.params.heroId,
    amount: event.params.amount,
  };

  context.DragmaUnderlings_Claimed.set(entity);
});

DragmaUnderlings.Staked.handler(async ({ event, context }) => {
  const entity: DragmaUnderlings_Staked = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    user: event.params.user,
    heroId: event.params.heroId,
  };

  context.DragmaUnderlings_Staked.set(entity);
});

DragmaUnderlings.Unstaked.handler(async ({ event, context }) => {
  const entity: DragmaUnderlings_Unstaked = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    user: event.params.user,
    heroId: event.params.heroId,
  };

  context.DragmaUnderlings_Unstaked.set(entity);
});

DragmaUnderlings.WeaponDurabilityUpdated.handler(
  async ({ event, context }) => {
    const entity: DragmaUnderlings_WeaponDurabilityUpdated = {
      id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      user: event.params.user,
      weaponId: event.params.weaponId,
      oldDurability: event.params.oldDurability,
      newDurability: event.params.newDurability,
    };

    context.DragmaUnderlings_WeaponDurabilityUpdated.set(entity);
  },
);

DragmaUnderlings.WeaponSharpnessUpdated.handler(
  async ({ event, context }) => {
    const entity: DragmaUnderlings_WeaponSharpnessUpdated = {
      id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      user: event.params.user,
      weaponId: event.params.weaponId,
      oldSharpness: event.params.oldSharpness,
      newSharpness: event.params.newSharpness,
    };

    context.DragmaUnderlings_WeaponSharpnessUpdated.set(entity);
  },
); 