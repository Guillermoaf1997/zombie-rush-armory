import { formatScore, lerp } from '../core/utils.js';
import { GAME_CONFIG } from '../config.js';

export class Renderer {
  constructor(canvas, worldWidth, worldHeight) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
    this.time = 0;
  }

  resize() {
    this.canvas.width = this.worldWidth;
    this.canvas.height = this.worldHeight;
  }

  render(state) {
    const ctx = this.ctx;
    this.time += state.deltaTime;

    ctx.clearRect(0, 0, this.worldWidth, this.worldHeight);
    this.drawBackground(ctx);
    this.drawGrid(ctx);
    this.drawTrails(ctx, state.particles);
    this.drawPickups(ctx, state.pickups);
    this.drawEnemies(ctx, state.enemies);
    this.drawPlayer(ctx, state.player);
    this.drawParticles(ctx, state.particles);
    this.drawHUD(ctx, state);
  }

  drawBackground(ctx) {
    const gradient = ctx.createLinearGradient(0, 0, 0, this.worldHeight);
    gradient.addColorStop(0, '#091423');
    gradient.addColorStop(1, '#040811');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.worldWidth, this.worldHeight);

    const glow = ctx.createRadialGradient(
      this.worldWidth * 0.5,
      this.worldHeight * 0.15,
      40,
      this.worldWidth * 0.5,
      this.worldHeight * 0.15,
      this.worldWidth * 0.7,
    );
    glow.addColorStop(0, 'rgba(93,156,255,0.12)');
    glow.addColorStop(1, 'rgba(93,156,255,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, this.worldWidth, this.worldHeight);
  }

  drawGrid(ctx) {
    ctx.save();
    ctx.strokeStyle = 'rgba(94, 230, 255, 0.07)';
    ctx.lineWidth = 1;
    const spacing = 54;
    const offset = (this.time * 26) % spacing;

    for (let x = -spacing; x <= this.worldWidth + spacing; x += spacing) {
      ctx.beginPath();
      ctx.moveTo(x + offset, 0);
      ctx.lineTo(x + offset, this.worldHeight);
      ctx.stroke();
    }

    for (let y = -spacing; y <= this.worldHeight + spacing; y += spacing) {
      ctx.beginPath();
      ctx.moveTo(0, y + offset);
      ctx.lineTo(this.worldWidth, y + offset);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawPlayer(ctx, player) {
    ctx.save();

    if (player.isShielded) {
      const shieldPulse = 0.75 + Math.sin(this.time * 10) * 0.08;
      ctx.beginPath();
      ctx.arc(player.x, player.y, player.radius + 14 * shieldPulse, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(99,247,177,0.14)';
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(99,247,177,0.85)';
      ctx.stroke();
    }

    const bodyGlow = ctx.createRadialGradient(player.x, player.y, 4, player.x, player.y, player.radius * 2);
    bodyGlow.addColorStop(0, 'rgba(94,230,255,1)');
    bodyGlow.addColorStop(1, 'rgba(94,230,255,0)');
    ctx.fillStyle = bodyGlow;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius * 2.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
    ctx.fillStyle = player.invulnerableFlash > 0 ? '#ffffff' : '#5ee6ff';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius * 0.45, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.restore();
  }

  drawEnemies(ctx, enemies) {
    enemies.forEach((enemy) => {
      ctx.save();
      ctx.translate(enemy.x, enemy.y);
      ctx.rotate(enemy.rotation);

      const glow = ctx.createRadialGradient(0, 0, enemy.radius * 0.2, 0, 0, enemy.radius * 2.2);
      glow.addColorStop(0, 'rgba(255,95,109,0.95)');
      glow.addColorStop(1, 'rgba(255,95,109,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, enemy.radius * 2.1, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(0, -enemy.radius);
      ctx.lineTo(enemy.radius * 0.84, 0);
      ctx.lineTo(0, enemy.radius);
      ctx.lineTo(-enemy.radius * 0.84, 0);
      ctx.closePath();
      ctx.fillStyle = '#ff5f6d';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(0, 0, enemy.radius * 0.26, 0, Math.PI * 2);
      ctx.fillStyle = '#fff2f4';
      ctx.fill();
      ctx.restore();
    });
  }

  drawPickups(ctx, pickups) {
    pickups.forEach((pickup) => {
      const pulse = 1 + Math.sin(pickup.pulse) * 0.14;
      ctx.save();
      ctx.translate(pickup.x, pickup.y);
      ctx.rotate(this.time * 1.5 + pickup.pulse);

      ctx.beginPath();
      ctx.arc(0, 0, pickup.radius * 2.2 * pulse, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(93,156,255,0.14)';
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(0, -pickup.radius * pulse);
      ctx.lineTo(pickup.radius * pulse, 0);
      ctx.lineTo(0, pickup.radius * pulse);
      ctx.lineTo(-pickup.radius * pulse, 0);
      ctx.closePath();
      ctx.fillStyle = '#5d9cff';
      ctx.fill();
      ctx.restore();
    });
  }

  drawParticles(ctx, particles) {
    particles.forEach((particle) => {
      if (particle.radius > 8) return;
      ctx.save();
      ctx.globalAlpha = particle.alpha;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      ctx.fillStyle = particle.color;
      ctx.fill();
      ctx.restore();
    });
  }

  drawTrails(ctx, particles) {
    particles.forEach((particle) => {
      if (particle.radius <= 8) return;
      ctx.save();
      ctx.globalAlpha = particle.alpha * 0.45;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      ctx.fillStyle = particle.color;
      ctx.fill();
      ctx.restore();
    });
  }

  drawHUD(ctx, state) {
    const energyProgress = state.player.energy / GAME_CONFIG.shield.energyRequired;
    const difficulty = Math.floor(state.elapsedTime / 8) + 1;

    ctx.save();
    ctx.fillStyle = 'rgba(6, 12, 24, 0.78)';
    ctx.fillRect(16, 16, this.worldWidth - 32, 110);
    ctx.strokeStyle = 'rgba(94,230,255,0.16)';
    ctx.strokeRect(16, 16, this.worldWidth - 32, 110);

    ctx.fillStyle = '#eef7ff';
    ctx.font = '700 26px Inter, sans-serif';
    ctx.fillText(`Score ${formatScore(state.score)}`, 28, 50);

    ctx.fillStyle = '#9eb2ca';
    ctx.font = '600 16px Inter, sans-serif';
    ctx.fillText(`Best ${formatScore(state.bestScore)}`, 28, 76);
    ctx.fillText(`Nivel ${difficulty}`, this.worldWidth - 114, 50);
    ctx.fillText(`${state.enemies.length} drones`, this.worldWidth - 130, 76);

    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(28, 88, this.worldWidth - 56, 16);

    const fillWidth = (this.worldWidth - 56) * energyProgress;
    const shieldColor = state.player.isShielded ? '#63f7b1' : '#5ee6ff';
    ctx.fillStyle = shieldColor;
    ctx.fillRect(28, 88, fillWidth, 16);

    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.strokeRect(28, 88, this.worldWidth - 56, 16);

    ctx.fillStyle = state.player.isShielded ? '#63f7b1' : '#9eb2ca';
    const label = state.player.isShielded
      ? `Escudo ${state.player.shieldTime.toFixed(1)}s`
      : 'Carga de escudo';
    ctx.fillText(label, 28, 84);

    if (state.feedbackTimer > 0) {
      const alpha = state.feedbackTimer / 0.4;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#ffffff';
      ctx.font = '800 30px Inter, sans-serif';
      ctx.fillText(state.feedbackMessage, this.worldWidth * 0.5 - 70, 158);
    }

    ctx.restore();
  }
}
