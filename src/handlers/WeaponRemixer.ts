import {
  WeaponRemixer,
  WeaponRemixer_WeaponGenerated,
} from "generated";
import { getOrCreatePlayer, handleRemixGeneration } from "../helpers";

async function handleMixRequest(
  event: any,
  context: any,
  isLegendary: boolean,
) {
  const player = await getOrCreatePlayer(event.transaction.from, context);

  context.WeaponMintRequest.set({
    id: event.params.requestId.toString(),
    player_id: player.id,
    origin: "REMIXER",
    cost: event.params.cost,
    remixRarity: event.params.rarity,
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
  await handleRemixGeneration(context, user, requestId, weaponId, metadata);
}); 