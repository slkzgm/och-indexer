/*
 * Please refer to https://docs.envio.dev for a thorough guide on all Envio indexer features
 */
import {
  Blacksmith,
  Blacksmith_WeaponRepaired,
  Blacksmith_WeaponSharpened,
  DragmaUnderlings,
  DragmaUnderlings_Claimed,
  DragmaUnderlings_Staked,
  DragmaUnderlings_Unstaked,
  DragmaUnderlings_WeaponDurabilityUpdated,
  DragmaUnderlings_WeaponSharpnessUpdated,
  Gacha1155,
  Gacha1155_TransferBatch,
  Gacha1155_TransferSingle,
  GachaWeaponMachine,
  GachaWeaponMachine_WeaponGenerated,
  GachaWeaponMachine_WeaponRequested,
  Gym,
  Gym_ChaosUpgraded,
  Gym_NormalUpgraded,
  Gym_UnknownUpgraded,
  Gym_UpgradeRequested,
  Hero20,
  Hero20_Transfer,
  Hero721,
  Hero721_ConsecutiveTransfer,
  Hero721_Transfer,
  HeroArmory,
  HeroArmory_Equipped,
  HeroArmory_Unequipped,
  HeroWeaponMachine,
  HeroWeaponMachine_WeaponGenerated,
  HeroWeaponMachine_WeaponRequested,
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

Gacha1155.TransferBatch.handler(async ({ event, context }) => {
  const entity: Gacha1155_TransferBatch = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    operator: event.params.operator,
    from: event.params.from,
    to: event.params.to,
    ids: event.params.ids,
    amounts: event.params.amounts,
  };

  context.Gacha1155_TransferBatch.set(entity);
});

Gacha1155.TransferSingle.handler(async ({ event, context }) => {
  const entity: Gacha1155_TransferSingle = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    operator: event.params.operator,
    from: event.params.from,
    to: event.params.to,
    event_id: event.params.id,
    amount: event.params.amount,
  };

  context.Gacha1155_TransferSingle.set(entity);
});

GachaWeaponMachine.WeaponGenerated.handler(async ({ event, context }) => {
  const entity: GachaWeaponMachine_WeaponGenerated = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    user: event.params.user,
    weaponId: event.params.weaponId,
    metadata: event.params.metadata,
    requestId: event.params.requestId,
  };

  context.GachaWeaponMachine_WeaponGenerated.set(entity);
});

GachaWeaponMachine.WeaponRequested.handler(async ({ event, context }) => {
  const entity: GachaWeaponMachine_WeaponRequested = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    user: event.params.user,
    tokenId: event.params.tokenId,
    qty: event.params.qty,
    requestId: event.params.requestId,
  };

  context.GachaWeaponMachine_WeaponRequested.set(entity);
});

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

Hero20.Transfer.handler(async ({ event, context }) => {
  const entity: Hero20_Transfer = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    from: event.params.from,
    to: event.params.to,
    amount: event.params.amount,
  };

  context.Hero20_Transfer.set(entity);
});

Hero721.ConsecutiveTransfer.handler(async ({ event, context }) => {
  const entity: Hero721_ConsecutiveTransfer = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    fromTokenId: event.params.fromTokenId,
    toTokenId: event.params.toTokenId,
    from: event.params.from,
    to: event.params.to,
  };

  context.Hero721_ConsecutiveTransfer.set(entity);
});

Hero721.Transfer.handler(async ({ event, context }) => {
  const entity: Hero721_Transfer = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    from: event.params.from,
    to: event.params.to,
    tokenId: event.params.tokenId,
  };

  context.Hero721_Transfer.set(entity);
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

HeroWeaponMachine.WeaponGenerated.handler(async ({ event, context }) => {
  const entity: HeroWeaponMachine_WeaponGenerated = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    user: event.params.user,
    weaponId: event.params.weaponId,
    metadata: event.params.metadata,
    requestId: event.params.requestId,
  };

  context.HeroWeaponMachine_WeaponGenerated.set(entity);
});

HeroWeaponMachine.WeaponRequested.handler(async ({ event, context }) => {
  const entity: HeroWeaponMachine_WeaponRequested = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    user: event.params.user,
    slot: event.params.slot,
    qty: event.params.qty,
    amount: event.params.amount,
    requestId: event.params.requestId,
  };

  context.HeroWeaponMachine_WeaponRequested.set(entity);
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
