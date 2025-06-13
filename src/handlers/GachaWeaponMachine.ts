import {
  GachaWeaponMachine,
  GachaWeaponMachine_WeaponGenerated,
  GachaWeaponMachine_WeaponRequested,
} from "generated";
import { getOrCreatePlayer, handleGachaWeaponGeneration } from "../helpers";

GachaWeaponMachine.WeaponGenerated.handler(async ({ event, context }) => {
  const { user, requestId, weaponId, metadata } = event.params;
  await handleGachaWeaponGeneration(
    context,
    user,
    requestId,
    weaponId,
    metadata,
  );
});

GachaWeaponMachine.WeaponRequested.handler(async ({ event, context }) => {
  const player = await getOrCreatePlayer(context, event.params.user);

  context.WeaponMintRequest.set({
    id: event.params.requestId.toString(),
    player_id: player.id,
    origin: "GACHA_MACHINE",
    gachaRaritySource: event.params.tokenId,
    qty: event.params.qty,
    generatedCount: 0n,
    cost: undefined,
    remixRarity: undefined,
    remixIsLegendary: undefined,
    remixAmount: undefined,
  });
}); 