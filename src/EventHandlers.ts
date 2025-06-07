// src/EventHandlers.ts
/*
 * Please refer to https://docs.envio.dev for a thorough guide on all Envio indexer features
 */
import {
  GachaMachine,
  GachaMachine_WeaponGenerated,
  GachaMachine_WeaponRequested,
  HeroGachaMachine,
  HeroGachaMachine_WeaponGenerated,
  HeroGachaMachine_WeaponRequested,
  WeaponRemixer,
  WeaponRemixer_LegendaryMixRequested,
  WeaponRemixer_WeaponGenerated,
  WeaponRemixer_WeaponMixRequested,
} from "../generated";
import "./handlers/BlacksmithHandler";
import "./handlers/GymHandler";
import "./handlers/DragmaUnderlingsHandler";
import "./handlers/HeroArmoryHandler";
import "./handlers/Weapon721Handler";
import "./handlers/Hero721Handler";

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
