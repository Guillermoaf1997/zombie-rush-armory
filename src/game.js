import { GAME_CONFIG, GAME_STATES } from './config.js';
import { InputController } from './core/input.js';
import { loadBestScore, saveBestScore } from './core/storage.js';
import { circlesOverlap, randomRange } from './core/utils.js';
import { Player } from './entities/player.js';
import { Enemy } from './entities/enemy.js';
import { Pickup } from './entities/pickup.js';
import { Particle } from './entities/particle.js';
import { Renderer } from './systems/renderer.js';
import { AudioManager } from './systems/audio.js';
import { DomUI } from './ui/dom-ui.js';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.worldWidth = GAME_CONFIG.world.width;
    this.worldHeight = GAME_CONFIG.world.height;

    this.input = new InputController(canvas);
    this.audio = new AudioManager();
    this.ui = new DomUI(this.audio);
    this.renderer = new Renderer(canvas, this.worldWidth, this.worldHeight);
    this.player = new Player(this.worldWidth, this.worldHeight);

    this.bestScore = loadBestScore();
    this.state = GAME_STATES.MENU;
    this.score = 0;
    this.elapsedTime = 0;
    this.enemies = [];
    this.pickups = [];
    this.particles = [];
    this.enemySpawnTimer = 0;
    this.pickupSpawnTimer = 0;
    this.feedbackTimer = 0;
    this.feedbackMessage = '';
    this.lastTimestamp = 0;

    this.ui.bind({
      onStart: () => this.start(),
      onOpenInstructions: () => this.openInstructions(),
      onBackToMenu: () => this.backToMenu(),
      onRestart: () => this.restart(),
    });

    this.renderer.resize();
    this.ui.show(GAME_STATES.MENU);
    requestAnimationFrame((timestamp) => this.loop(timestamp));
  }

  start() {
    this.resetRun();
    this.state = GAME_STATES.PLAYING;
    this.ui.hideAll();
  }

  restart() {
    this.start();
  }

  openInstructions() {
    this.state = GAME_STATES.INSTRUCTIONS;
    this.ui.show(GAME_STATES.INSTRUCTIONS);
  }

  backToMenu() {
    this.state = GAME_STATES.MENU;
    this.ui.show(GAME_STATES.MENU);
  }

  resetRun() {
    this.player.reset();
    this.score = 0;
    this.elapsedTime = 0;
    this.enemies.length = 0;
    this.pickups.length = 0;
    this.particles.length = 0;
    this.enemySpawnTimer = 0.4;
    this.pickupSpawnTimer = 1.15;
    this.feedbackTimer = 0;
    this.feedbackMessage = '';
  }

  gameOver() {
    this.audio.hit();
    this.state = GAME_STATES.GAME_OVER;
    this.bestScore = Math.max(this.bestScore, Math.floor(this.score));
    saveBestScore(this.bestScore);
    this.ui.updateGameOver(this.score, this.bestScore);
    this.ui.show(GAME_STATES.GAME_OVER);

    for (let i = 0; i < 20; i += 1) {
      this.spawnParticle(this.player.x, this.player.y, {
        color: 'rgba(255,95,109,1)',
        radius: randomRange(3, 8),
        life: randomRange(0.3, 0.8),
      });
    }
  }

  update(deltaTime) {
    if (this.state !== GAME_STATES.PLAYING) {
      this.updateParticles(deltaTime);
      return;
    }

    this.elapsedTime += deltaTime;
    this.score += GAME_CONFIG.scoring.survivalPerSecond * deltaTime;
    this.feedbackTimer = Math.max(0, this.feedbackTimer - deltaTime);

    this.player.update(deltaTime, this.input, (x, y) => {
      this.particles.push(new Particle(x, y, {
        radius: 10,
        life: 0.26,
        color: this.player.isShielded ? 'rgba(99,247,177,1)' : 'rgba(94,230,255,1)',
        vx: randomRange(-18, 18),
        vy: randomRange(-18, 18),
      }));
    });

    this.updateSpawning(deltaTime);
    this.updateEnemies(deltaTime);
    this.updatePickups(deltaTime);
    this.updateParticles(deltaTime);
    this.handleCollisions();
  }

  updateSpawning(deltaTime) {
    const difficulty = this.elapsedTime;
    const spawnInterval = Math.max(
      GAME_CONFIG.enemy.minSpawnInterval,
      GAME_CONFIG.enemy.spawnInterval - difficulty * 0.012,
    );

    this.enemySpawnTimer -= deltaTime;
    while (this.enemySpawnTimer <= 0) {
      this.enemies.push(new Enemy(this.worldWidth, this.worldHeight, difficulty));
      this.enemySpawnTimer += spawnInterval;
    }

    this.pickupSpawnTimer -= deltaTime;
    if (this.pickupSpawnTimer <= 0) {
      this.pickups.push(new Pickup(this.worldWidth, this.worldHeight));
      this.pickupSpawnTimer = Math.max(1.2, GAME_CONFIG.pickup.spawnInterval - difficulty * 0.01);
    }
  }

  updateEnemies(deltaTime) {
    this.enemies.forEach((enemy) => {
      enemy.update(deltaTime, this.player.x, this.player.y);

      const dx = enemy.x - this.player.x;
      const dy = enemy.y - this.player.y;
      const distance = Math.hypot(dx, dy);
      const nearMissThreshold = enemy.radius + this.player.radius + 16;

      if (!enemy.nearMissAwarded && distance < nearMissThreshold && distance > enemy.radius + this.player.radius) {
        enemy.nearMissAwarded = true;
        this.score += GAME_CONFIG.scoring.nearMissBonus;
        this.feedbackMessage = '+35 close call';
        this.feedbackTimer = 0.4;
        this.audio.nearMiss();
      }
    });

    this.enemies = this.enemies.filter((enemy) => !enemy.isOutOfBounds(180));
  }

  updatePickups(deltaTime) {
    this.pickups.forEach((pickup) => pickup.update(deltaTime));
    this.pickups = this.pickups.filter((pickup) => !pickup.isExpired);
  }

  updateParticles(deltaTime) {
    this.particles.forEach((particle) => particle.update(deltaTime));
    this.particles = this.particles.filter((particle) => !particle.isDead);
  }

  handleCollisions() {
    for (const pickup of [...this.pickups]) {
      if (circlesOverlap(this.player, pickup)) {
        this.score += GAME_CONFIG.pickup.scoreValue;
        this.pickups.splice(this.pickups.indexOf(pickup), 1);
        this.audio.pickup();
        this.feedbackMessage = `+${GAME_CONFIG.pickup.scoreValue}`;
        this.feedbackTimer = 0.36;

        for (let i = 0; i < 8; i += 1) {
          this.spawnParticle(pickup.x, pickup.y, {
            color: 'rgba(93,156,255,1)',
            radius: randomRange(2, 6),
            life: randomRange(0.18, 0.42),
          });
        }

        const shieldActivated = this.player.addEnergy(GAME_CONFIG.pickup.energyValue);
        if (shieldActivated) {
          this.audio.shield();
          this.feedbackMessage = 'shield online';
          this.feedbackTimer = 0.4;
        }
      }
    }

    for (const enemy of [...this.enemies]) {
      if (!circlesOverlap(this.player, enemy)) continue;

      if (this.player.isShielded) {
        this.enemies.splice(this.enemies.indexOf(enemy), 1);
        this.player.invulnerableFlash = 0.15;
        this.score += 50;
        this.feedbackMessage = '+50 shield';
        this.feedbackTimer = 0.28;
        for (let i = 0; i < 10; i += 1) {
          this.spawnParticle(enemy.x, enemy.y, {
            color: 'rgba(99,247,177,1)',
            radius: randomRange(2, 7),
            life: randomRange(0.2, 0.46),
          });
        }
        continue;
      }

      this.gameOver();
      return;
    }
  }

  spawnParticle(x, y, overrides = {}) {
    this.particles.push(new Particle(x, y, overrides));
  }

  loop(timestamp) {
    const deltaTime = Math.min(0.033, (timestamp - this.lastTimestamp) / 1000 || 0.016);
    this.lastTimestamp = timestamp;

    this.update(deltaTime);
    this.renderer.render({
      deltaTime,
      score: this.score,
      bestScore: this.bestScore,
      elapsedTime: this.elapsedTime,
      player: this.player,
      enemies: this.enemies,
      pickups: this.pickups,
      particles: this.particles,
      feedbackTimer: this.feedbackTimer,
      feedbackMessage: this.feedbackMessage,
    });

    requestAnimationFrame((nextTimestamp) => this.loop(nextTimestamp));
  }
}
