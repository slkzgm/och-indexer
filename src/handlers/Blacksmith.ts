import { Blacksmith } from "generated";
import { handleWeaponRepaired, handleWeaponSharpened } from "../helpers";

Blacksmith.WeaponRepaired.handler(async ({ event, context }) => {
  await handleWeaponRepaired(
    context,
    event.params.weaponId,
    event.params.amount,
  );
});

Blacksmith.WeaponSharpened.handler(async ({ event, context }) => {
  await handleWeaponSharpened(
    context,
    event.params.weaponId,
    event.params.amount,
  );
}); 