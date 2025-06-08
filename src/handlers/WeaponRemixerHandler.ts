import {
  WeaponRemixer,
  WeaponRemixer_LegendaryMixRequested,
  WeaponRemixer_WeaponGenerated,
  WeaponRemixer_WeaponMixRequested,
} from "../../generated";
import {
  WeaponRemixerMintRequest_t,
  WeaponRemixerMint_t,
  Player_t,
} from "../../generated/src/db/Entities.gen";
import { createDefaultPlayer, getOrCreatePlayer } from "../utils/EntityHelper";
import { parseWeaponMetadata } from "../utils/WeaponMetadataHelper";

WeaponRemixer.WeaponGenerated.handler(async ({ event, context }) => {
  const rawGenerated: WeaponRemixer_WeaponGenerated = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    user: event.params.user,
    weaponId: event.params.weaponId,
    metadata: event.params.metadata,
    requestId: event.params.requestId,
  };
  context.WeaponRemixer_WeaponGenerated.set(rawGenerated);

  const request = await context.WeaponRemixerMintRequest.get(
    event.params.requestId.toString()
  );
  if (!request) {
    context.log.error(
      `WeaponRemixerMintRequest not found, requestId: ${event.params.requestId}`
    );
    return;
  }

  const player = await getOrCreatePlayer(event.params.user, context);

  const { weaponType, rarity, maxDurability, maxSharpness } =
    parseWeaponMetadata(event.params.metadata);

  const isSuccess = rarity > request.remixRarity;

  const remixerMint: WeaponRemixerMint_t = {
    id: event.params.weaponId.toString(),
    requestId: event.params.requestId,
    player_id: player.id,
    remixRarity: Number(request.remixRarity),
    weapon_id: event.params.weaponId.toString(),
    weaponType: weaponType,
    weaponRarity: rarity,
    weaponDurability: maxDurability,
    weaponSharpness: maxSharpness,
    amount: request.amount,
    cost: request.cost,
    success: isSuccess,
  };
  context.WeaponRemixerMint.set(remixerMint);

  const updatedPlayer = updatePlayerStats(player, request, isSuccess);
  context.Player.set(updatedPlayer);

  context.WeaponRemixerMintRequest.deleteUnsafe(request.id);
});

const handleMixRequest = async (
  event: any,
  context: any,
  isLegendary: boolean
) => {
  const rawRequest = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    weaponIds: event.params.weaponIds,
    cost: event.params.cost,
    rarity: event.params.rarity,
    requestId: event.params.requestId,
  };

  if (isLegendary) {
    context.WeaponRemixer_LegendaryMixRequested.set(rawRequest);
  } else {
    context.WeaponRemixer_WeaponMixRequested.set(rawRequest);
  }

  const request: WeaponRemixerMintRequest_t = {
    id: event.params.requestId.toString(),
    remixRarity: event.params.rarity,
    amount: BigInt(event.params.weaponIds.length),
    cost: event.params.cost,
  };
  context.WeaponRemixerMintRequest.set(request);
};

WeaponRemixer.WeaponMixRequested.handler(async ({ event, context }) => {
  await handleMixRequest(event, context, false);
});

WeaponRemixer.LegendaryMixRequested.handler(async ({ event, context }) => {
  await handleMixRequest(event, context, true);
});

function updatePlayerStats(
  player: Player_t,
  request: WeaponRemixerMintRequest_t,
  isSuccess: boolean
): Player_t {
  const updatedPlayer = { ...player };

  updatedPlayer.weaponRemixerMinted += 1;
  updatedPlayer.weaponRemixerSpend += request.cost;
  updatedPlayer.weaponRemixerAmount += request.amount;
  updatedPlayer.weaponRemixerSuccess += isSuccess ? 1 : 0;
  updatedPlayer.weaponRemixerFail += isSuccess ? 0 : 1;

  const rarity = Number(request.remixRarity);

  switch (rarity) {
    case 0: // Common
      updatedPlayer.weaponCommonRemixed += 1;
      updatedPlayer.weaponCommonRemixedSpend += request.cost;
      updatedPlayer.weaponCommonRemixedSuccess += isSuccess ? 1 : 0;
      updatedPlayer.weaponCommonRemixedFail += isSuccess ? 0 : 1;
      break;
    case 1: // Uncommon
      updatedPlayer.weaponUncommonRemixed += 1;
      updatedPlayer.weaponUncommonRemixedSpend += request.cost;
      updatedPlayer.weaponUncommonRemixedSuccess += isSuccess ? 1 : 0;
      updatedPlayer.weaponUncommonRemixedFail += isSuccess ? 0 : 1;
      break;
    case 2: // Rare
      updatedPlayer.weaponRareRemixed += 1;
      updatedPlayer.weaponRareRemixedSpend += request.cost;
      updatedPlayer.weaponRareRemixedSuccess += isSuccess ? 1 : 0;
      updatedPlayer.weaponRareRemixedFail += isSuccess ? 0 : 1;
      break;
    case 3: // Epic
      updatedPlayer.weaponEpicRemixed += 1;
      updatedPlayer.weaponEpicRemixedSpend += request.cost;
      updatedPlayer.weaponEpicRemixedSuccess += isSuccess ? 1 : 0;
      updatedPlayer.weaponEpicRemixedFail += isSuccess ? 0 : 1;
      break;
    case 4: // Heroic
      updatedPlayer.weaponHeroicRemixed += 1;
      updatedPlayer.weaponHeroicRemixedSpend += request.cost;
      updatedPlayer.weaponHeroicRemixedSuccess += isSuccess ? 1 : 0;
      updatedPlayer.weaponHeroicRemixedFail += isSuccess ? 0 : 1;
      break;
    case 5: // Legendary
      updatedPlayer.weaponLegendaryRemixed += 1;
      updatedPlayer.weaponLegendaryRemixedSpend += request.cost;
      updatedPlayer.weaponLegendaryRemixedSuccess += isSuccess ? 1 : 0;
      updatedPlayer.weaponLegendaryRemixedFail += isSuccess ? 0 : 1;
      break;
  }

  return updatedPlayer;
} 