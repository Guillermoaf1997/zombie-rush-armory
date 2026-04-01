import { randomRange } from '../core/utils.js';

export class Particle {
  constructor(x, y, options = {}) {
    this.x = x;
    this.y = y;
    this.radius = options.radius ?? randomRange(2, 6);
    this.vx = options.vx ?? randomRange(-90, 90);
    this.vy = options.vy ?? randomRange(-90, 90);
    this.life = options.life ?? randomRange(0.25, 0.65);
    this.maxLife = this.life;
    this.color = options.color ?? 'rgba(94,230,255,1)';
    this.fade = options.fade ?? true;
  }

  update(deltaTime) {
    this.x += this.vx * deltaTime;
    this.y += this.vy * deltaTime;
    this.life -= deltaTime;
  }

  get alpha() {
    return this.fade ? Math.max(0, this.life / this.maxLife) : 1;
  }

  get isDead() {
    return this.life <= 0;
  }
}
