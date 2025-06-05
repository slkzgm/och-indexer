// src/EventHandlers.ts
/*
 * Please refer to https://docs.envio.dev for a thorough guide on all Envio indexer features
 */
import {
  Blacksmith,
  Blacksmith_Upgraded,
  Blacksmith_WeaponRepaired,
  Blacksmith_WeaponSharpened,
  DragmaUnderlings,
  DragmaUnderlings_Claimed,
  DragmaUnderlings_Staked,
  DragmaUnderlings_Unstaked,
  DragmaUnderlings_Upgraded,
  DragmaUnderlings_WeaponDurabilityUpdated,
  DragmaUnderlings_WeaponSharpnessUpdated,
  GachaMachine,
  GachaMachine_WeaponGenerated,
  GachaMachine_WeaponRequested,
  HeroArmory,
  HeroArmory_Equipped,
  HeroArmory_Unequipped,
  HeroGachaMachine,
  HeroGachaMachine_WeaponGenerated,
  HeroGachaMachine_WeaponRequested,
  Weapon721,
  Weapon721_ConsecutiveTransfer,
  Weapon721_Transfer,
  Weapon721_WeaponGenerated,
  Weapon721_WeaponMetadataGenerated,
  WeaponRemixer,
  WeaponRemixer_LegendaryMixRequested,
  WeaponRemixer_WeaponGenerated,
  WeaponRemixer_WeaponMixRequested,
} from "generated";
import "./handlers/GymHandler";

Blacksmith.Upgraded.handler(async ({ event, context }) => {
  const entity: Blacksmith_Upgraded = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    implementation: event.params.implementation,
  };

  context.Blacksmith_Upgraded.set(entity);
});

Blacksmith.WeaponRepaired.handler(async ({ event, context }) => {
  const entity: Blacksmith_WeaponRepaired = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    weaponId: event.params.weaponId,
    amount: event.params.amount,
  };

  context.Blacksmith_WeaponRepaired.set(entity);
});

Blacksmith.WeaponSharpened.handler(async ({ event, context }) => {
  const entity: Blacksmith_WeaponSharpened = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    weaponId: event.params.weaponId,
    amount: event.params.amount,
  };

  context.Blacksmith_WeaponSharpened.set(entity);
});

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

DragmaUnderlings.Upgraded.handler(async ({ event, context }) => {
  const entity: DragmaUnderlings_Upgraded = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    implementation: event.params.implementation,
  };

  context.DragmaUnderlings_Upgraded.set(entity);
});

DragmaUnderlings.WeaponDurabilityUpdated.handler(async ({ event, context }) => {
  const entity: DragmaUnderlings_WeaponDurabilityUpdated = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    user: event.params.user,
    weaponId: event.params.weaponId,
    oldDurability: event.params.oldDurability,
    newDurability: event.params.newDurability,
  };

  context.DragmaUnderlings_WeaponDurabilityUpdated.set(entity);
});

DragmaUnderlings.WeaponSharpnessUpdated.handler(async ({ event, context }) => {
  const entity: DragmaUnderlings_WeaponSharpnessUpdated = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    user: event.params.user,
    weaponId: event.params.weaponId,
    oldSharpness: event.params.oldSharpness,
    newSharpness: event.params.newSharpness,
  };

  context.DragmaUnderlings_WeaponSharpnessUpdated.set(entity);
});

GachaMachine.WeaponGenerated.handler(async ({ event, context }) => {
  const entity: GachaMachine_WeaponGenerated = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    user: event.params.user,
    weaponId: event.params.weaponId,
    metadata: event.params.metadata,
    requestId: event.params.requestId,
  };

  context.GachaMachine_WeaponGenerated.set(entity);
});

GachaMachine.WeaponRequested.handler(async ({ event, context }) => {
  const entity: GachaMachine_WeaponRequested = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    user: event.params.user,
    tokenId: event.params.tokenId,
    qty: event.params.qty,
    requestId: event.params.requestId,
  };

  context.GachaMachine_WeaponRequested.set(entity);
});

HeroArmory.Equipped.handler(async ({ event, context }) => {
  const entity: HeroArmory_Equipped = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    heroId: event.params.heroId,
    weaponId: event.params.weaponId,
  };

  context.HeroArmory_Equipped.set(entity);
});

HeroArmory.Unequipped.handler(async ({ event, context }) => {
  const entity: HeroArmory_Unequipped = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    heroId: event.params.heroId,
    weaponId: event.params.weaponId,
  };

  context.HeroArmory_Unequipped.set(entity);
});

HeroGachaMachine.WeaponGenerated.handler(async ({ event, context }) => {
  const entity: HeroGachaMachine_WeaponGenerated = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    user: event.params.user,
    weaponId: event.params.weaponId,
    metadata: event.params.metadata,
    requestId: event.params.requestId,
  };

  context.HeroGachaMachine_WeaponGenerated.set(entity);
});

HeroGachaMachine.WeaponRequested.handler(async ({ event, context }) => {
  const entity: HeroGachaMachine_WeaponRequested = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    user: event.params.user,
    slot: event.params.slot,
    qty: event.params.qty,
    amount: event.params.amount,
    requestId: event.params.requestId,
  };

  context.HeroGachaMachine_WeaponRequested.set(entity);
});

Weapon721.ConsecutiveTransfer.handler(async ({ event, context }) => {
  const entity: Weapon721_ConsecutiveTransfer = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    fromTokenId: event.params.fromTokenId,
    toTokenId: event.params.toTokenId,
    from: event.params.from,
    to: event.params.to,
  };

  context.Weapon721_ConsecutiveTransfer.set(entity);
});

Weapon721.Transfer.handler(async ({ event, context }) => {
  const entity: Weapon721_Transfer = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    from: event.params.from,
    to: event.params.to,
    tokenId: event.params.tokenId,
  };

  context.Weapon721_Transfer.set(entity);
});

Weapon721.WeaponGenerated.handler(async ({ event, context }) => {
  const entity: Weapon721_WeaponGenerated = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    to: event.params.to,
    qty: event.params.qty,
  };

  context.Weapon721_WeaponGenerated.set(entity);
});

Weapon721.WeaponMetadataGenerated.handler(async ({ event, context }) => {
  const entity: Weapon721_WeaponMetadataGenerated = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    event_id: event.params.id,
    metadata: event.params.metadata,
  };

  context.Weapon721_WeaponMetadataGenerated.set(entity);
});

WeaponRemixer.LegendaryMixRequested.handler(async ({ event, context }) => {
  const entity: WeaponRemixer_LegendaryMixRequested = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    weaponIds: event.params.weaponIds,
    cost: event.params.cost,
    rarity: event.params.rarity,
    requestId: event.params.requestId,
  };

  context.WeaponRemixer_LegendaryMixRequested.set(entity);
});

WeaponRemixer.WeaponGenerated.handler(async ({ event, context }) => {
  const entity: WeaponRemixer_WeaponGenerated = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    user: event.params.user,
    weaponId: event.params.weaponId,
    metadata: event.params.metadata,
    requestId: event.params.requestId,
  };

  context.WeaponRemixer_WeaponGenerated.set(entity);
});

WeaponRemixer.WeaponMixRequested.handler(async ({ event, context }) => {
  const entity: WeaponRemixer_WeaponMixRequested = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    weaponIds: event.params.weaponIds,
    cost: event.params.cost,
    rarity: event.params.rarity,
    requestId: event.params.requestId,
  };

  context.WeaponRemixer_WeaponMixRequested.set(entity);
});
