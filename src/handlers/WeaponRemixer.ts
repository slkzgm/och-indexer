import {
  WeaponRemixer,
  WeaponRemixer_WeaponGenerated,
} from "generated";
import { getOrCreatePlayer, handleRemixerWeaponGeneration } from "../helpers";
import { WEAPON_RARITY_NAMES } from "../constants";

async function handleMixRequest(
  event: any,
  context: any,
  isLegendary: boolean,
) {
  const player = await getOrCreatePlayer(context, event.transaction.from);

  context.WeaponMintRequest.set({
    id: event.params.requestId.toString(),
    player_id: player.id,
    origin: "REMIXER",
    cost: event.params.cost,
    remixRarity: WEAPON_RARITY_NAMES[Number(event.params.rarity)],
    remixIsLegendary: isLegendary,
    remixAmount: BigInt(event.params.weaponIds.length),
  });
}

WeaponRemixer.WeaponMixRequested.handler(async ({ event, context }) => {
  await handleMixRequest(event, context, false);
});

WeaponRemixer.LegendaryMixRequested.handler(async ({ event, context }) => {
  await handleMixRequest(event, context, true);
});

WeaponRemixer.WeaponGenerated.handler(async ({ event, context }) => {
  const { user, requestId, weaponId, metadata } = event.params;
  await handleRemixerWeaponGeneration(context, user, requestId, weaponId, metadata);
}); 