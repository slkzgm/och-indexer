import { HeroWeaponMachine } from "generated";
import { getOrCreatePlayer, handleHeroWeaponGeneration } from "../helpers";

// Handle WeaponGenerated events
HeroWeaponMachine.WeaponGenerated.handler(async ({ event, context }) => {
  const { user, requestId, weaponId, metadata } = event.params;
  await handleHeroWeaponGeneration(
    context,
    user,
    requestId,
    weaponId,
    metadata,
  );
});

// Handle WeaponRequested events
HeroWeaponMachine.WeaponRequested.handler(async ({ event, context }) => {
  const player = await getOrCreatePlayer(context, event.params.user);

  context.WeaponMintRequest.set({
    id: event.params.requestId.toString(),
    player_id: player.id,
    origin: "WEAPON_MACHINE",
    gachaRaritySource: undefined,
    qty: event.params.qty,
    generatedCount: 0n,
    cost: event.params.amount,
    remixRarity: undefined,
    remixIsLegendary: undefined,
    remixAmount: undefined,
  });
}); 