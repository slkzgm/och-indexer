import { Blacksmith } from "../../generated";
import type { Blacksmith_WeaponSharpened, Blacksmith_WeaponRepaired } from "../../generated";
import type { Player_t, Weapon_t } from "../../generated/src/db/Entities.gen";
import { createDefaultPlayer } from "../utils/EntityHelper";

/**
 * Handler for Blacksmith.WeaponSharpened events.
 * - Persists the raw event.
 * - Sets weapon.sharpness to weapon.maxSharpness.
 * - Increments player.sharpenSpend by the event amount.
 */
Blacksmith.WeaponSharpened.handler(async ({ event, context }: any) => {
  const chainIdBI = BigInt(event.chainId);
  const blockNumBI = BigInt(event.block.number);
  const logIndexBI = BigInt(event.logIndex);

  // Persist raw event
  const sharpenEvent: Blacksmith_WeaponSharpened = {
    id: `${chainIdBI}_${blockNumBI}_${logIndexBI}`,
    weaponId: event.params.weaponId,
    amount: event.params.amount,
  };
  await context.Blacksmith_WeaponSharpened.set(sharpenEvent);

  // Update weapon sharpness and counters
  const weaponIdStr = event.params.weaponId.toString();
  const weapon = await context.Weapon.get(weaponIdStr);
  if (!weapon) return;
  const updatedWeapon = {
    ...weapon,
    sharpness: weapon.maxSharpness,
    sharpenSpend: (weapon.sharpenSpend ?? BigInt(0)) + event.params.amount,
    sharpenedTimes: (weapon.sharpenedTimes ?? 0) + 1,
  } as any;
  await context.Weapon.set(updatedWeapon);

  // Update player sharpen stats
  const playerId = weapon.player_id;
  let player = await context.Player.get(playerId);
  if (!player) {
    player = createDefaultPlayer(playerId);
  }
  const updatedPlayer = {
    ...player,
    sharpenSpend: player.sharpenSpend + event.params.amount,
    sharpenedTimes: player.sharpenedTimes + 1,
  } as any;
  await context.Player.set(updatedPlayer);
});

/**
 * Handler for Blacksmith.WeaponRepaired events.
 * - Persists the raw event.
 * - Sets weapon.durability to weapon.maxDurability.
 * - Increments player.repairSpend by the event amount.
 */
Blacksmith.WeaponRepaired.handler(async ({ event, context }: any) => {
  const chainIdBI = BigInt(event.chainId);
  const blockNumBI = BigInt(event.block.number);
  const logIndexBI = BigInt(event.logIndex);

  // Persist raw event
  const repairEvent: Blacksmith_WeaponRepaired = {
    id: `${chainIdBI}_${blockNumBI}_${logIndexBI}`,
    weaponId: event.params.weaponId,
    amount: event.params.amount,
  };
  await context.Blacksmith_WeaponRepaired.set(repairEvent);

  // Update weapon durability and counters
  const weaponIdStr = event.params.weaponId.toString();
  const weapon = await context.Weapon.get(weaponIdStr);
  if (!weapon) return;
  const updatedWeapon2 = {
    ...weapon,
    durability: weapon.maxDurability,
    repairSpend: (weapon.repairSpend ?? BigInt(0)) + event.params.amount,
    repairedTimes: (weapon.repairedTimes ?? 0) + 1,
  } as any;
  await context.Weapon.set(updatedWeapon2);

  // Update player repair stats
  const playerId = weapon.player_id;
  let player = await context.Player.get(playerId);
  if (!player) {
    player = createDefaultPlayer(playerId);
  }
  const updatedPlayer = {
    ...player,
    repairSpend: player.repairSpend + event.params.amount,
    repairedTimes: player.repairedTimes + 1,
  } as any;
  await context.Player.set(updatedPlayer);
}); 