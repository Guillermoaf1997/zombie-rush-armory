import { randomRange } from '../core/utils.js';
import { GAME_CONFIG } from '../config.js';

export class Enemy {
  constructor(worldWidth, worldHeight, difficulty) {
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;

    this.radius = randomRange(GAME_CONFIG.enemy.baseRadius, GAME_CONFIG.enemy.maxRadius);
    const spawnSide = Math.floor(Math.random() * 4);

    if (spawnSide === 0) {
      this.x = randomRange(0, worldWidth);
      this.y = -this.radius - 30;
    } else if (spawnSide === 1) {
      this.x = worldWidth + this.radius + 30;
      this.y = randomRange(0, worldHeight);
    } else if (spawnSide === 2) {
      this.x = randomRange(0, worldWidth);
      this.y = worldHeight + this.radius + 30;
    } else {
      this.x = -this.radius - 30;
      this.y = randomRange(0, worldHeight);
    }

    this.speed = GAME_CONFIG.enemy.startSpeed + difficulty * GAME_CONFIG.enemy.speedRampPerSecond + randomRange(0, 55);
    this.rotation = Math.random() * Math.PI * 2;
    this.rotationSpeed = randomRange(-3, 3);
    this.nearMissAwarded = false;
  }

  update(deltaTime, targetX, targetY) {
    const angle = Math.atan2(targetY - this.y, targetX - this.x);
    this.x += Math.cos(angle) * this.speed * deltaTime;
    this.y += Math.sin(angle) * this.speed * deltaTime;
    this.rotation += this.rotationSpeed * deltaTime;
  }

  isOutOfBounds(margin = 100) {
    return (
      this.x < -margin ||
      this.x > this.worldWidth + margin ||
      this.y < -margin ||
      this.y > this.worldHeight + margin
    );
  }
}
