import {
  HeroWeaponMachine,
  HeroWeaponMachine_WeaponGenerated,
  HeroWeaponMachine_WeaponRequested,
} from "generated";

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