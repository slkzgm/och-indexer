import {
  HeroGachaMachine,
  HeroGachaMachine_WeaponGenerated,
  HeroGachaMachine_WeaponRequested,
} from "../../generated";
import {
  WeaponHeroMintRequest_t,
  WeaponHeroMint_t,
} from "../../generated/src/db/Entities.gen";
import { getOrCreatePlayer } from "../utils/EntityHelper";
import { parseWeaponMetadata } from "../utils/WeaponMetadataHelper";

HeroGachaMachine.WeaponGenerated.handler(async ({ event, context }) => {
  const rawEntity: HeroGachaMachine_WeaponGenerated = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    user: event.params.user,
    weaponId: event.params.weaponId,
    metadata: event.params.metadata,
    requestId: event.params.requestId,
  };

  context.HeroGachaMachine_WeaponGenerated.set(rawEntity);

  const request = await context.WeaponHeroMintRequest.get(
    event.params.requestId.toString()
  );

  if (!request) {
    context.log.error(
      `WeaponHeroMintRequest not found for requestId: ${event.params.requestId}`
    );
    return;
  }

  const player = await getOrCreatePlayer(request.player_id, context);
  const costPerWeapon = request.cost / request.qty;

  const updatedPlayer = {
    ...player,
    weaponHeroMinted: player.weaponHeroMinted + 1,
    weaponHeroSpend: player.weaponHeroSpend + costPerWeapon,
  };

  context.Player.set(updatedPlayer);

  const { weaponType, rarity, maxDurability, maxSharpness } =
    parseWeaponMetadata(event.params.metadata);

  const weaponHeroMint: WeaponHeroMint_t = {
    id: event.params.weaponId.toString(),
    requestId: event.params.requestId,
    player_id: request.player_id,
    weapon_id: event.params.weaponId.toString(),
    weaponType: weaponType,
    weaponRarity: rarity,
    weaponDurability: maxDurability,
    weaponSharpness: maxSharpness,
    cost: costPerWeapon,
  };

  context.WeaponHeroMint.set(weaponHeroMint);

  const updatedRequest: WeaponHeroMintRequest_t = {
    ...request,
    generatedCount: request.generatedCount + 1,
  };

  if (updatedRequest.generatedCount === Number(request.qty)) {
    context.WeaponHeroMintRequest.deleteUnsafe(request.id);
  } else {
    context.WeaponHeroMintRequest.set(updatedRequest);
  }
});

HeroGachaMachine.WeaponRequested.handler(async ({ event, context }) => {
  const rawEntity: HeroGachaMachine_WeaponRequested = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    user: event.params.user,
    slot: event.params.slot,
    qty: event.params.qty,
    amount: event.params.amount,
    requestId: event.params.requestId,
  };

  context.HeroGachaMachine_WeaponRequested.set(rawEntity);

  const player = await getOrCreatePlayer(event.params.user, context);

  const request: WeaponHeroMintRequest_t = {
    id: event.params.requestId.toString(),
    player_id: player.id,
    qty: event.params.qty,
    cost: event.params.amount,
    generatedCount: 0,
  };

  context.WeaponHeroMintRequest.set(request);
}); 