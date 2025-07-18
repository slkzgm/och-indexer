import {
  Gym,
} from "generated";
import { handleHeroTraining } from "../helpers/training";
import { getOrCreateHeroesGlobalStats } from "../helpers/stats";

/**
 * Handler pour Gym.ChaosUpgraded
 * Training avec RNG - peut échouer
 */
Gym.ChaosUpgraded.handlerWithLoader({
  loader: async ({ event, context }: { event: any; context: any }) => {
    const { heroId } = event.params;
    
    if (context.isPreload) {
      // Premier run : charge le héro et son arme équipée en parallèle
      const hero = await context.Hero.get(heroId.toString());
      
      let equippedWeapon: any | null = null;
      if (hero?.equippedWeapon_id) {
        equippedWeapon = await context.Weapon.get(hero.equippedWeapon_id);
      }
      
      return { hero, equippedWeapon };
    } else {
      // Second run : récupération simple
      const hero = await context.Hero.get(heroId.toString());
      let equippedWeapon: any | null = null;
      if (hero?.equippedWeapon_id) {
        equippedWeapon = await context.Weapon.get(hero.equippedWeapon_id);
      }
      return { hero, equippedWeapon };
    }
  },

  handler: async ({ event, context, loaderReturn }: { event: any; context: any; loaderReturn: any }) => {
    const { owner, heroId, season, oldLevel, newLevel, chances } = event.params;
    const timestamp = BigInt(event.block.timestamp);
    
    const { hero, equippedWeapon } = loaderReturn as { hero: any | null; equippedWeapon: any | null };

    // Parallélisation : Stockage event + mise à jour Hero
    await Promise.all([
      // Stocke l'événement brut
      context.Gym_ChaosUpgraded.set({
        id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
        owner,
        heroId,
        season,
        oldLevel,
        newLevel,
        chances,
      }),
      
      // Met à jour l'entité Hero (handleHeroTraining utilise les entités pré-chargées)
      handleHeroTraining(
        context,
        heroId.toString(),
        Number(oldLevel),
        Number(newLevel),
        timestamp,
        hero, // Passe le héro pré-chargé
        equippedWeapon // Passe l'arme pré-chargée
      )
    ]);

    // Mise à jour des stats du player après le training
    const updatedHero = await context.Hero.get(heroId.toString());
    if (updatedHero) {
      const player = await context.Player.get(updatedHero.owner_id);
      if (player && Number(oldLevel) !== updatedHero.level) {
        player.heroesByLevel[Number(oldLevel)] -= 1;
        player.heroesByLevel[updatedHero.level] += 1;
        context.Player.set(player);
      }
      // Mise à jour des stats globales
      if (Number(oldLevel) !== updatedHero.level) {
        const global = await getOrCreateHeroesGlobalStats(context);
        global.heroesByLevel[Number(oldLevel)] -= 1;
        global.heroesByLevel[updatedHero.level] += 1;
        global.lastUpdated = timestamp;
        context.HeroesGlobalStats.set(global);
      }
    }
  },
});

/**
 * Handler pour Gym.NormalUpgraded  
 * Training normal - succès garanti
 */
Gym.NormalUpgraded.handlerWithLoader({
  loader: async ({ event, context }: { event: any; context: any }) => {
    const { heroId } = event.params;
    
    if (context.isPreload) {
      const hero = await context.Hero.get(heroId.toString());
      
      let equippedWeapon: any | null = null;
      if (hero?.equippedWeapon_id) {
        equippedWeapon = await context.Weapon.get(hero.equippedWeapon_id);
      }
      
      return { hero, equippedWeapon };
    } else {
      const hero = await context.Hero.get(heroId.toString());
      let equippedWeapon: any | null = null;
      if (hero?.equippedWeapon_id) {
        equippedWeapon = await context.Weapon.get(hero.equippedWeapon_id);
      }
      return { hero, equippedWeapon };
    }
  },

  handler: async ({ event, context, loaderReturn }: { event: any; context: any; loaderReturn: any }) => {
    const { owner, heroId, season, oldLevel, newLevel } = event.params;
    const timestamp = BigInt(event.block.timestamp);
    
    const { hero, equippedWeapon } = loaderReturn as { hero: any | null; equippedWeapon: any | null };

    // Parallélisation optimisée
    await Promise.all([
      // Stocke l'événement brut
      context.Gym_NormalUpgraded.set({
        id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
        owner,
        heroId,
        season,
        oldLevel,
        newLevel,
      }),
      
      // Met à jour l'entité Hero
      handleHeroTraining(
        context,
        heroId.toString(),
        Number(oldLevel),
        Number(newLevel),
        timestamp,
        hero,
        equippedWeapon
      )
    ]);

    // Mise à jour des stats du player après le training
    const updatedHero = await context.Hero.get(heroId.toString());
    if (updatedHero) {
      const player = await context.Player.get(updatedHero.owner_id);
      if (player && Number(oldLevel) !== updatedHero.level) {
        player.heroesByLevel[Number(oldLevel)] -= 1;
        player.heroesByLevel[updatedHero.level] += 1;
        context.Player.set(player);
      }
      // Mise à jour des stats globales
      if (Number(oldLevel) !== updatedHero.level) {
        const global = await getOrCreateHeroesGlobalStats(context);
        global.heroesByLevel[Number(oldLevel)] -= 1;
        global.heroesByLevel[updatedHero.level] += 1;
        global.lastUpdated = timestamp;
        context.HeroesGlobalStats.set(global);
      }
    }
  },
});

/**
 * Handler pour Gym.UnknownUpgraded
 * Training avec type inconnu - garde les chances pour debug
 */
Gym.UnknownUpgraded.handlerWithLoader({
  loader: async ({ event, context }: { event: any; context: any }) => {
    const { heroId } = event.params;
    
    if (context.isPreload) {
      const hero = await context.Hero.get(heroId.toString());
      
      let equippedWeapon: any | null = null;
      if (hero?.equippedWeapon_id) {
        equippedWeapon = await context.Weapon.get(hero.equippedWeapon_id);
      }
      
      return { hero, equippedWeapon };
    } else {
      const hero = await context.Hero.get(heroId.toString());
      let equippedWeapon: any | null = null;
      if (hero?.equippedWeapon_id) {
        equippedWeapon = await context.Weapon.get(hero.equippedWeapon_id);
      }
      return { hero, equippedWeapon };
    }
  },

  handler: async ({ event, context, loaderReturn }: { event: any; context: any; loaderReturn: any }) => {
    const { owner, heroId, season, oldLevel, newLevel, chances } = event.params;
    const timestamp = BigInt(event.block.timestamp);
    
    const { hero, equippedWeapon } = loaderReturn as { hero: any | null; equippedWeapon: any | null };

    // Parallélisation optimisée
    await Promise.all([
      // Stocke l'événement brut
      context.Gym_UnknownUpgraded.set({
        id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
        owner,
        heroId,
        season,
        oldLevel,
        newLevel,
        chances,
      }),
      
      // Met à jour l'entité Hero
      handleHeroTraining(
        context,
        heroId.toString(),
        Number(oldLevel),
        Number(newLevel),
        timestamp,
        hero,
        equippedWeapon
      )
    ]);

    // Mise à jour des stats du player après le training
    const updatedHero = await context.Hero.get(heroId.toString());
    if (updatedHero) {
      const player = await context.Player.get(updatedHero.owner_id);
      if (player && Number(oldLevel) !== updatedHero.level) {
        player.heroesByLevel[Number(oldLevel)] -= 1;
        player.heroesByLevel[updatedHero.level] += 1;
        context.Player.set(player);
      }
      // Mise à jour des stats globales
      if (Number(oldLevel) !== updatedHero.level) {
        const global = await getOrCreateHeroesGlobalStats(context);
        global.heroesByLevel[Number(oldLevel)] -= 1;
        global.heroesByLevel[updatedHero.level] += 1;
        global.lastUpdated = timestamp;
        context.HeroesGlobalStats.set(global);
      }
    }
  },
});

/**
 * Handler pour Gym.UpgradeRequested
 * Événement de tracking - pas de mise à jour d'entité nécessaire
 */
Gym.UpgradeRequested.handlerWithLoader({
  loader: async ({ event, context }: { event: any; context: any }) => {
    // Pas de préchargement nécessaire pour un simple événement de tracking
    return {};
  },

  handler: async ({ event, context }: { event: any; context: any }) => {
    const { season, owner, heroId, levelUp, cost } = event.params;

    // Stocke l'événement brut - opération simple, pas de parallélisation nécessaire
    await context.Gym_UpgradeRequested.set({
      id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      season,
      owner,
      heroId,
      levelUp,
      cost,
    });

    // Note: On ne fait rien d'autre ici car l'event Request ne confirme pas le succès
    // Le vrai update se fait dans les handlers *Upgraded
  },
}); 