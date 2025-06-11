import {
  GachaWeaponMachine,
  GachaWeaponMachine_WeaponGenerated,
  GachaWeaponMachine_WeaponRequested,
} from "generated";

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