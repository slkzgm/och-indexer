import {
  Blacksmith,
  Blacksmith_WeaponRepaired,
  Blacksmith_WeaponSharpened,
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