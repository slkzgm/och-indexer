import {
  GachaMachine,
  GachaMachine_WeaponGenerated,
  GachaMachine_WeaponRequested,
} from "../../generated";
import {
  GachaRequest_t,
  WeaponGachaMint_t,
} from "../../generated/src/db/Entities.gen";
import { createDefaultPlayer } from "../utils/EntityHelper";
import { parseWeaponMetadata } from "../utils/WeaponMetadataHelper";

GachaMachine.WeaponGenerated.handler(async ({ event, context }) => {
  const rawEntity: GachaMachine_WeaponGenerated = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    user: event.params.user,
    weaponId: event.params.weaponId,
    metadata: event.params.metadata,
    requestId: event.params.requestId,
  };

  context.GachaMachine_WeaponGenerated.set(rawEntity);

  const gachaRequest = await context.GachaRequest.get(
    event.params.requestId.toString()
  );

  if (!gachaRequest) {
    context.log.error(
      `GachaRequest not found for requestId: ${event.params.requestId}`
    );
    return;
  }

  let player = await context.Player.get(gachaRequest.player_id.toLowerCase());

  if (!player) {
    player = createDefaultPlayer(gachaRequest.player_id);
  }

  const gachaRaritySource = Number(gachaRequest.gachaRaritySource);
  let updatedPlayer = { ...player };

  if (gachaRaritySource === 1) {
    updatedPlayer.bronzeGachaOpened += 1;
  } else if (gachaRaritySource === 2) {
    updatedPlayer.silverGachaOpened += 1;
  } else if (gachaRaritySource === 3) {
    updatedPlayer.goldGachaOpened += 1;
  } else if (gachaRaritySource === 4) {
    updatedPlayer.rainbowGachaOpened += 1;
  }

  context.Player.set(updatedPlayer);

  const { weaponType, rarity, maxDurability, maxSharpness } =
    parseWeaponMetadata(event.params.metadata);

  const weaponGachaMint: WeaponGachaMint_t = {
    id: event.params.weaponId.toString(),
    requestId: event.params.requestId,
    player_id: gachaRequest.player_id,
    gachaRaritySource: gachaRequest.gachaRaritySource,
    weapon_id: event.params.weaponId.toString(),
    weaponType: weaponType,
    weaponRarity: rarity,
    weaponDurability: maxDurability,
    weaponSharpness: maxSharpness,
  };

  context.WeaponGachaMint.set(weaponGachaMint);

  const updatedGachaRequest: GachaRequest_t = {
    ...gachaRequest,
    generatedCount: gachaRequest.generatedCount + 1,
  };

  if (updatedGachaRequest.generatedCount === Number(gachaRequest.qty)) {
    context.GachaRequest.deleteUnsafe(gachaRequest.id);
  } else {
    context.GachaRequest.set(updatedGachaRequest);
  }
});

GachaMachine.WeaponRequested.handler(async ({ event, context }) => {
  const rawEntity: GachaMachine_WeaponRequested = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    user: event.params.user,
    tokenId: event.params.tokenId,
    qty: event.params.qty,
    requestId: event.params.requestId,
  };

  context.GachaMachine_WeaponRequested.set(rawEntity);

  let player = await context.Player.get(event.params.user.toLowerCase());

  if (!player) {
    player = createDefaultPlayer(event.params.user);
    context.Player.set(player);
  }

  const gachaRequest: GachaRequest_t = {
    id: event.params.requestId.toString(),
    player_id: player.id,
    gachaRaritySource: event.params.tokenId,
    qty: event.params.qty,
    generatedCount: 0,
  };

  context.GachaRequest.set(gachaRequest);
}); 