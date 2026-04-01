export const GAME_CONFIG = {
  world: {
    width: 540,
    height: 960,
  },
  player: {
    radius: 18,
    speed: 340,
    touchLerp: 0.22,
    trailInterval: 0.03,
  },
  enemy: {
    baseRadius: 14,
    maxRadius: 26,
    startSpeed: 115,
    spawnInterval: 1.15,
    minSpawnInterval: 0.3,
    speedRampPerSecond: 3.6,
  },
  pickup: {
    radius: 10,
    spawnInterval: 2.8,
    lifespan: 8,
    scoreValue: 120,
    energyValue: 25,
  },
  shield: {
    duration: 4,
    energyRequired: 100,
  },
  scoring: {
    survivalPerSecond: 18,
    nearMissBonus: 35,
  },
  fx: {
    particleLife: 0.5,
  },
  storageKey: 'neon-drift-best-score',
};

export const GAME_STATES = {
  MENU: 'menu',
  PLAYING: 'playing',
  GAME_OVER: 'game-over',
  INSTRUCTIONS: 'instructions',
};
