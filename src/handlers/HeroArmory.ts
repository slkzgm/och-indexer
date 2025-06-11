import {
  HeroArmory,
  HeroArmory_Equipped,
  HeroArmory_Unequipped,
} from "generated";

HeroArmory.Equipped.handler(async ({ event, context }) => {
  const entity: HeroArmory_Equipped = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    heroId: event.params.heroId,
    weaponId: event.params.weaponId,
  };

  context.HeroArmory_Equipped.set(entity);
});

HeroArmory.Unequipped.handler(async ({ event, context }) => {
  const entity: HeroArmory_Unequipped = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    heroId: event.params.heroId,
    weaponId: event.params.weaponId,
  };

  context.HeroArmory_Unequipped.set(entity);
}); 