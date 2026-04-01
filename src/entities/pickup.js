import { GAME_CONFIG } from '../config.js';
import { randomRange } from '../core/utils.js';

export class Pickup {
  constructor(worldWidth, worldHeight) {
    this.radius = GAME_CONFIG.pickup.radius;
    this.x = randomRange(40, worldWidth - 40);
    this.y = randomRange(80, worldHeight - 120);
    this.life = GAME_CONFIG.pickup.lifespan;
    this.pulse = Math.random() * Math.PI * 2;
  }

  update(deltaTime) {
    this.life -= deltaTime;
    this.pulse += deltaTime * 5;
  }

  get isExpired() {
    return this.life <= 0;
  }
}
