import {
  Hero721,
  Hero721_ConsecutiveTransfer,
  Hero721_Transfer,
} from "../../generated";
import type { Hero_t } from "../../generated/src/db/Entities.gen";
import { ZERO_ADDRESS, DRAGMA_UNDERLINGS_CONTRACT, S1_LEVELING_CONTRACT, S1_ENDGAME_CONTRACT } from "../utils/constants";
import { createDefaultHero, getOrCreatePlayer } from "../utils/EntityHelper";

/**
 * Handler for Hero721.ConsecutiveTransfer events.
 */
Hero721.ConsecutiveTransfer.handler(async ({ event, context }: any) => {
  const entity: Hero721_ConsecutiveTransfer = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    fromTokenId: event.params.fromTokenId,
    toTokenId: event.params.toTokenId,
    from: event.params.from,
    to: event.params.to,
  };
  await context.Hero721_ConsecutiveTransfer.set(entity);

  const toAddr = event.params.to;
  let currentId = event.params.fromTokenId;
  const endId = event.params.toTokenId;
  while (currentId <= endId) {
    const heroIdStr = currentId.toString();
    if (toAddr === ZERO_ADDRESS) {
      await context.Hero.deleteUnsafe(heroIdStr);
    } else {
      await getOrCreatePlayer(toAddr, context);
      const hero: Hero_t | undefined = await context.Hero.get(heroIdStr);
      if (hero) {
        await context.Hero.set({ ...hero, player_id: toAddr.toLowerCase() });
      } else {
        const newHero = createDefaultHero(heroIdStr, toAddr);
        await context.Hero.set(newHero);
      }
    }
    currentId = currentId + BigInt(1);
  }
});

/**
 * Handler for Hero721.Transfer events.
 */
Hero721.Transfer.handler(async ({ event, context }: any) => {
  const from = event.params.from;
  const to = event.params.to;
  const tokenIdBI = event.params.tokenId;
  const heroIdStr = tokenIdBI.toString();

  const entity: Hero721_Transfer = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    from,
    to,
    tokenId: tokenIdBI,
  };
  await context.Hero721_Transfer.set(entity);

  if (to === ZERO_ADDRESS) {
    await context.Hero.deleteUnsafe(heroIdStr);
    return;
  }

  if (
    from === DRAGMA_UNDERLINGS_CONTRACT ||
    to === DRAGMA_UNDERLINGS_CONTRACT ||
    from === S1_LEVELING_CONTRACT ||
    to === S1_LEVELING_CONTRACT ||
    from === S1_ENDGAME_CONTRACT ||
    to === S1_ENDGAME_CONTRACT
  ) {
    return;
  }

  await getOrCreatePlayer(to, context);
  let hero: Hero_t | undefined = await context.Hero.get(heroIdStr);
  if (hero) {
    await context.Hero.set({ ...hero, player_id: to.toLowerCase() });
  } else {
    const newHero = createDefaultHero(heroIdStr, to);
    await context.Hero.set(newHero);
  }
}); 