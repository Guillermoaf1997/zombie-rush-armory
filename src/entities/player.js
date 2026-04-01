import { GAME_CONFIG } from '../config.js';
import { clamp, lerp } from '../core/utils.js';

export class Player {
  constructor(worldWidth, worldHeight) {
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
    this.radius = GAME_CONFIG.player.radius;
    this.x = worldWidth * 0.5;
    this.y = worldHeight * 0.78;
    this.speed = GAME_CONFIG.player.speed;
    this.energy = 0;
    this.shieldTime = 0;
    this.invulnerableFlash = 0;
    this.trailTimer = 0;
  }

  reset() {
    this.x = this.worldWidth * 0.5;
    this.y = this.worldHeight * 0.78;
    this.energy = 0;
    this.shieldTime = 0;
    this.invulnerableFlash = 0;
    this.trailTimer = 0;
  }

  update(deltaTime, input, spawnTrail) {
    const axis = input.getMovementAxis();

    if (input.pointerActive) {
      this.x = lerp(this.x, input.pointerX, GAME_CONFIG.player.touchLerp);
      this.y = lerp(this.y, input.pointerY, GAME_CONFIG.player.touchLerp);
    } else {
      const length = Math.hypot(axis.x, axis.y) || 1;
      this.x += (axis.x / length) * this.speed * deltaTime;
      this.y += (axis.y / length) * this.speed * deltaTime;
    }

    this.x = clamp(this.x, this.radius + 10, this.worldWidth - this.radius - 10);
    this.y = clamp(this.y, this.radius + 10, this.worldHeight - this.radius - 10);

    this.trailTimer -= deltaTime;
    if (this.trailTimer <= 0) {
      spawnTrail(this.x, this.y);
      this.trailTimer = GAME_CONFIG.player.trailInterval;
    }

    this.shieldTime = Math.max(0, this.shieldTime - deltaTime);
    this.invulnerableFlash = Math.max(0, this.invulnerableFlash - deltaTime);
  }

  addEnergy(amount) {
    this.energy = Math.min(GAME_CONFIG.shield.energyRequired, this.energy + amount);
    if (this.energy >= GAME_CONFIG.shield.energyRequired) {
      this.energy = 0;
      this.shieldTime = GAME_CONFIG.shield.duration;
      this.invulnerableFlash = 0.24;
      return true;
    }
    return false;
  }

  get isShielded() {
    return this.shieldTime > 0;
  }
}
