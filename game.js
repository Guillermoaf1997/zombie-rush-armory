(() => {
  'use strict';

  const GAME_WIDTH = 960;
  const GAME_HEIGHT = 540;
  const STORAGE_KEY = 'zombie-rush-armory-best-score';
  const PLAYER_RADIUS = 16;

  const WEAPON_CATALOG = {
    pistol: {
      id: 'pistol',
      name: 'Pistola',
      price: 0,
      damage: 24,
      fireRate: 0.35,
      bulletSpeed: 620,
      spread: 0.02,
      pellets: 1,
      color: '#fff2a8',
      description: 'Arma inicial equilibrada y fiable.',
    },
    smg: {
      id: 'smg',
      name: 'SMG',
      price: 90,
      damage: 15,
      fireRate: 0.12,
      bulletSpeed: 700,
      spread: 0.08,
      pellets: 1,
      color: '#ffd166',
      description: 'Muchos disparos, menos daño por bala.',
    },
    shotgun: {
      id: 'shotgun',
      name: 'Escopeta',
      price: 140,
      damage: 14,
      fireRate: 0.65,
      bulletSpeed: 560,
      spread: 0.34,
      pellets: 5,
      color: '#ffb86b',
      description: 'Gran daño a corta distancia.',
    },
    rifle: {
      id: 'rifle',
      name: 'Rifle',
      price: 220,
      damage: 40,
      fireRate: 0.42,
      bulletSpeed: 860,
      spread: 0.01,
      pellets: 1,
      color: '#c1ff72',
      description: 'Daño alto y precisión superior.',
    },
  };

  const SHOP_ITEMS = [
    { id: 'buy-smg', type: 'weapon', weaponId: 'smg', price: 90 },
    { id: 'buy-shotgun', type: 'weapon', weaponId: 'shotgun', price: 140 },
    { id: 'buy-rifle', type: 'weapon', weaponId: 'rifle', price: 220 },
    { id: 'upgrade-damage', type: 'upgrade', price: 110, label: '+20% daño', description: 'Aumenta el daño base de tu arma actual.' },
    { id: 'upgrade-fire-rate', type: 'upgrade', price: 120, label: '+18% cadencia', description: 'Disparas más rápido.' },
    { id: 'heal', type: 'heal', price: 70, label: 'Curación +35', description: 'Recupera parte de tu vida.' },
  ];

  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  const ui = {
    overlays: {
      start: document.getElementById('startScreen'),
      instructions: document.getElementById('instructionsScreen'),
      shop: document.getElementById('shopScreen'),
      gameOver: document.getElementById('gameOverScreen'),
    },
    startButton: document.getElementById('startButton'),
    howToButton: document.getElementById('howToButton'),
    backMenuButton: document.getElementById('backMenuButton'),
    nextWaveButton: document.getElementById('nextWaveButton'),
    restartButton: document.getElementById('restartButton'),
    menuButton: document.getElementById('menuButton'),
    muteButton: document.getElementById('muteButton'),
    finalStats: document.getElementById('finalStats'),
    bestStats: document.getElementById('bestStats'),
    shopTitle: document.getElementById('shopTitle'),
    shopSubtitle: document.getElementById('shopSubtitle'),
    shopCoins: document.getElementById('shopCoins'),
    shopGrid: document.getElementById('shopGrid'),
  };

  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
  function rand(min, max) { return Math.random() * (max - min) + min; }
  function distance(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); }
  function circleOverlap(a, b) { return distance(a.x, a.y, b.x, b.y) <= a.radius + b.radius; }
  function formatScore(value) { return Math.floor(value).toString().padStart(5, '0'); }

  class AudioManager {
    constructor() {
      this.enabled = true;
      this.ctx = null;
    }
    toggle() {
      this.enabled = !this.enabled;
      ui.muteButton.textContent = this.enabled ? '🔊 Sonido' : '🔈 Sonido';
    }
    async ensure() {
      if (!this.enabled) return null;
      if (!this.ctx) {
        const A = window.AudioContext || window.webkitAudioContext;
        if (!A) return null;
        this.ctx = new A();
      }
      if (this.ctx.state === 'suspended') await this.ctx.resume();
      return this.ctx;
    }
    async tone(freq, duration, type = 'sine', volume = 0.03, slideTo = null) {
      const ac = await this.ensure();
      if (!ac) return;
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ac.currentTime);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, ac.currentTime + duration);
      gain.gain.setValueAtTime(volume, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + duration);
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.start();
      osc.stop(ac.currentTime + duration);
    }
    shoot() { this.tone(540, 0.05, 'square', 0.03, 340); }
    hitZombie() { this.tone(150, 0.08, 'sawtooth', 0.03, 90); }
    hurt() { this.tone(210, 0.18, 'square', 0.05, 70); }
    coin() { this.tone(860, 0.07, 'triangle', 0.04, 1080); }
    buy() { this.tone(660, 0.08, 'triangle', 0.04, 830); }
    fail() { this.tone(120, 0.2, 'square', 0.04, 70); }
    wave() { this.tone(320, 0.25, 'triangle', 0.04, 520); }
  }

  const audio = new AudioManager();

  const state = {
    mode: 'menu',
    lastTime: 0,
    elapsed: 0,
    wave: 1,
    zombiesToSpawn: 0,
    zombiesKilledThisWave: 0,
    zombiesSpawnedThisWave: 0,
    spawnTimer: 0,
    score: 0,
    bestScore: loadBestScore(),
    coins: 0,
    totalKills: 0,
    feedbackText: '',
    feedbackTimer: 0,
    screenShake: 0,
    player: createPlayer(),
    bullets: [],
    zombies: [],
    particles: [],
    input: {
      keys: new Set(),
      touchActive: false,
      touchId: null,
      moveX: 0,
      moveY: 0,
      touchStartX: 0,
      touchStartY: 0,
      touchX: 0,
      touchY: 0,
      mouseX: GAME_WIDTH / 2,
      mouseY: GAME_HEIGHT / 2,
    },
  };

  function loadBestScore() {
    try {
      return parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10) || 0;
    } catch {
      return 0;
    }
  }

  function saveBestScore(score) {
    try { localStorage.setItem(STORAGE_KEY, String(score)); } catch {}
  }

  function createPlayer() {
    return {
      x: GAME_WIDTH / 2,
      y: GAME_HEIGHT / 2,
      radius: PLAYER_RADIUS,
      speed: 250,
      life: 100,
      maxLife: 100,
      weaponId: 'pistol',
      damageMultiplier: 1,
      fireRateMultiplier: 1,
      fireCooldown: 0,
      facing: 0,
      hurtFlash: 0,
    };
  }

  function resetRun() {
    state.elapsed = 0;
    state.wave = 1;
    state.score = 0;
    state.coins = 0;
    state.totalKills = 0;
    state.zombies = [];
    state.bullets = [];
    state.particles = [];
    state.feedbackText = '';
    state.feedbackTimer = 0;
    state.screenShake = 0;
    state.player = createPlayer();
    prepareWave();
  }

  function prepareWave() {
    state.zombiesKilledThisWave = 0;
    state.zombiesSpawnedThisWave = 0;
    state.zombiesToSpawn = 6 + (state.wave - 1) * 3;
    state.spawnTimer = 0.8;
    state.feedbackText = `Oleada ${state.wave}`;
    state.feedbackTimer = 1.2;
  }

  function startGame() {
    resetRun();
    state.mode = 'playing';
    hideAllOverlays();
  }

  function showOverlay(name) {
    hideAllOverlays();
    if (ui.overlays[name]) ui.overlays[name].classList.add('overlay--visible');
  }

  function hideAllOverlays() {
    Object.values(ui.overlays).forEach(el => el.classList.remove('overlay--visible'));
  }

  function openShop() {
    state.mode = 'shop';
    audio.wave();
    ui.shopTitle.textContent = `Oleada ${state.wave} superada`;
    ui.shopSubtitle.textContent = 'Compra mejoras antes de enfrentarte a la siguiente horda.';
    renderShop();
    showOverlay('shop');
  }

  function nextWave() {
    state.wave += 1;
    prepareWave();
    state.mode = 'playing';
    hideAllOverlays();
  }

  function endGame() {
    state.mode = 'game-over';
    audio.fail();
    state.bestScore = Math.max(state.bestScore, Math.floor(state.score));
    saveBestScore(state.bestScore);
    ui.finalStats.textContent = `Puntuación: ${formatScore(state.score)} · Oleada: ${state.wave} · Bajas: ${state.totalKills}`;
    ui.bestStats.textContent = `Récord: ${formatScore(state.bestScore)}`;
    showOverlay('gameOver');
  }

  function getWeapon() {
    return WEAPON_CATALOG[state.player.weaponId];
  }

  function spawnZombie() {
    const edge = Math.floor(Math.random() * 4);
    const zombie = {
      radius: rand(16, 24),
      speed: rand(40, 60) + state.wave * 7,
      life: 28 + state.wave * 10,
      maxLife: 28 + state.wave * 10,
      damage: 12 + state.wave * 0.8,
      hitCooldown: 0,
      tint: Math.random() > 0.82 ? '#9ae66e' : '#7fc15d',
      x: 0,
      y: 0,
    };

    if (edge === 0) { zombie.x = rand(0, GAME_WIDTH); zombie.y = -40; }
    if (edge === 1) { zombie.x = GAME_WIDTH + 40; zombie.y = rand(0, GAME_HEIGHT); }
    if (edge === 2) { zombie.x = rand(0, GAME_WIDTH); zombie.y = GAME_HEIGHT + 40; }
    if (edge === 3) { zombie.x = -40; zombie.y = rand(0, GAME_HEIGHT); }

    state.zombies.push(zombie);
    state.zombiesSpawnedThisWave += 1;
  }

  function spawnBlood(x, y, count = 8) {
    for (let i = 0; i < count; i += 1) {
      state.particles.push({
        x, y,
        vx: rand(-150, 150),
        vy: rand(-150, 150),
        life: rand(0.2, 0.45),
        maxLife: 0.45,
        radius: rand(2, 5),
        color: Math.random() > 0.35 ? '#bb2c2c' : '#6f1515',
      });
    }
  }

  function spawnMuzzle(x, y, color) {
    for (let i = 0; i < 4; i += 1) {
      state.particles.push({
        x, y,
        vx: rand(-60, 60),
        vy: rand(-60, 60),
        life: rand(0.08, 0.18),
        maxLife: 0.18,
        radius: rand(2, 4),
        color,
      });
    }
  }

  function nearestZombie() {
    let target = null;
    let best = Infinity;
    for (const zombie of state.zombies) {
      const d = distance(state.player.x, state.player.y, zombie.x, zombie.y);
      if (d < best) {
        best = d;
        target = zombie;
      }
    }
    return target;
  }

  function fireWeapon() {
    const target = nearestZombie();
    if (!target) return;

    const weapon = getWeapon();
    const angleBase = Math.atan2(target.y - state.player.y, target.x - state.player.x);
    state.player.facing = angleBase;
    const effectiveFireRate = weapon.fireRate / state.player.fireRateMultiplier;
    state.player.fireCooldown = effectiveFireRate;

    for (let i = 0; i < weapon.pellets; i += 1) {
      const spreadOffset = weapon.pellets === 1 ? 0 : (-weapon.spread / 2) + (weapon.spread / (weapon.pellets - 1)) * i;
      const angle = angleBase + spreadOffset + rand(-weapon.spread * 0.2, weapon.spread * 0.2);
      state.bullets.push({
        x: state.player.x + Math.cos(angle) * 20,
        y: state.player.y + Math.sin(angle) * 20,
        vx: Math.cos(angle) * weapon.bulletSpeed,
        vy: Math.sin(angle) * weapon.bulletSpeed,
        life: 1.2,
        radius: weapon.id === 'shotgun' ? 4 : 3,
        damage: weapon.damage * state.player.damageMultiplier,
        color: weapon.color,
      });
    }

    state.screenShake = Math.min(7, state.screenShake + (weapon.id === 'shotgun' ? 4 : 2));
    spawnMuzzle(state.player.x + Math.cos(angleBase) * 18, state.player.y + Math.sin(angleBase) * 18, weapon.color);
    audio.shoot();
  }

  function updatePlayer(dt) {
    const input = state.input;
    let mx = 0;
    let my = 0;

    if (input.touchActive) {
      const dx = input.touchX - input.touchStartX;
      const dy = input.touchY - input.touchStartY;
      const len = Math.hypot(dx, dy);
      if (len > 6) {
        mx = dx / Math.max(30, len);
        my = dy / Math.max(30, len);
      }
    } else {
      const left = input.keys.has('arrowleft') || input.keys.has('a');
      const right = input.keys.has('arrowright') || input.keys.has('d');
      const up = input.keys.has('arrowup') || input.keys.has('w');
      const down = input.keys.has('arrowdown') || input.keys.has('s');
      mx = (right ? 1 : 0) - (left ? 1 : 0);
      my = (down ? 1 : 0) - (up ? 1 : 0);
      const len = Math.hypot(mx, my) || 1;
      mx /= len;
      my /= len;
    }

    state.player.x = clamp(state.player.x + mx * state.player.speed * dt, 24, GAME_WIDTH - 24);
    state.player.y = clamp(state.player.y + my * state.player.speed * dt, 24, GAME_HEIGHT - 24);

    state.player.fireCooldown -= dt;
    state.player.hurtFlash = Math.max(0, state.player.hurtFlash - dt);
    if (state.player.fireCooldown <= 0 && state.zombies.length > 0) fireWeapon();
  }

  function updateWaveSpawning(dt) {
    if (state.zombiesSpawnedThisWave >= state.zombiesToSpawn) return;
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) {
      spawnZombie();
      const spawnBase = Math.max(0.18, 0.85 - state.wave * 0.035);
      state.spawnTimer = spawnBase;
    }
  }

  function updateZombies(dt) {
    for (const zombie of state.zombies) {
      const ang = Math.atan2(state.player.y - zombie.y, state.player.x - zombie.x);
      zombie.x += Math.cos(ang) * zombie.speed * dt;
      zombie.y += Math.sin(ang) * zombie.speed * dt;
      zombie.hitCooldown = Math.max(0, zombie.hitCooldown - dt);

      if (circleOverlap(state.player, zombie) && zombie.hitCooldown <= 0) {
        zombie.hitCooldown = 0.7;
        state.player.life = Math.max(0, state.player.life - zombie.damage);
        state.player.hurtFlash = 0.14;
        state.screenShake = Math.min(10, state.screenShake + 5);
        spawnBlood(state.player.x, state.player.y, 10);
        audio.hurt();
        state.feedbackText = `-${Math.floor(zombie.damage)} vida`;
        state.feedbackTimer = 0.35;
        if (state.player.life <= 0) {
          endGame();
          return;
        }
      }
    }
  }

  function updateBullets(dt) {
    for (const bullet of state.bullets) {
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
      bullet.life -= dt;
    }
    state.bullets = state.bullets.filter(b => b.life > 0 && b.x > -20 && b.x < GAME_WIDTH + 20 && b.y > -20 && b.y < GAME_HEIGHT + 20);

    for (const bullet of [...state.bullets]) {
      for (const zombie of [...state.zombies]) {
        if (!circleOverlap(bullet, zombie)) continue;
        zombie.life -= bullet.damage;
        bullet.life = 0;
        spawnBlood(zombie.x, zombie.y, 6);

        if (zombie.life <= 0) {
          state.zombies.splice(state.zombies.indexOf(zombie), 1);
          state.totalKills += 1;
          state.zombiesKilledThisWave += 1;
          state.coins += 12 + Math.floor(state.wave * 2.5);
          state.score += 50 + state.wave * 10;
          state.feedbackText = '+kill';
          state.feedbackTimer = 0.22;
          audio.hitZombie();
        }
        break;
      }
    }

    state.bullets = state.bullets.filter(b => b.life > 0);
  }

  function updateParticles(dt) {
    for (const p of state.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
    }
    state.particles = state.particles.filter(p => p.life > 0);
  }

  function updateGame(dt) {
    if (state.mode !== 'playing') {
      updateParticles(dt);
      render();
      return;
    }

    state.elapsed += dt;
    state.score += 6 * dt;
    state.feedbackTimer = Math.max(0, state.feedbackTimer - dt);
    state.screenShake = Math.max(0, state.screenShake - dt * 20);

    updatePlayer(dt);
    if (state.mode !== 'playing') {
      render();
      return;
    }
    updateWaveSpawning(dt);
    updateZombies(dt);
    if (state.mode !== 'playing') {
      render();
      return;
    }
    updateBullets(dt);
    updateParticles(dt);

    if (state.zombiesKilledThisWave >= state.zombiesToSpawn && state.zombies.length === 0) {
      openShop();
    }

    render();
  }

  function drawBackground() {
    ctx.fillStyle = '#2f3a32';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    ctx.fillStyle = '#39463b';
    for (let x = 0; x < GAME_WIDTH; x += 64) {
      for (let y = 0; y < GAME_HEIGHT; y += 64) {
        ctx.fillRect(x + 2, y + 2, 60, 60);
      }
    }

    ctx.strokeStyle = 'rgba(0,0,0,0.16)';
    ctx.lineWidth = 2;
    for (let x = 0; x < GAME_WIDTH; x += 128) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, GAME_HEIGHT);
      ctx.stroke();
    }
  }

  function drawPlayer() {
    const p = state.player;
    const facing = p.facing;

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(facing);

    ctx.fillStyle = p.hurtFlash > 0 ? '#ffd6d6' : '#f1d5b5';
    ctx.beginPath();
    ctx.arc(0, -12, 9, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#3a7bd5';
    ctx.fillRect(-10, -4, 20, 24);

    ctx.strokeStyle = '#232323';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(5, 2);
    ctx.lineTo(24, 0);
    ctx.stroke();

    ctx.strokeStyle = '#f1d5b5';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-8, 4);
    ctx.lineTo(-15, 16);
    ctx.moveTo(8, 4);
    ctx.lineTo(15, 16);
    ctx.moveTo(-5, 20);
    ctx.lineTo(-8, 34);
    ctx.moveTo(5, 20);
    ctx.lineTo(8, 34);
    ctx.stroke();
    ctx.restore();
  }

  function drawZombies() {
    for (const z of state.zombies) {
      const angle = Math.atan2(state.player.y - z.y, state.player.x - z.x);
      ctx.save();
      ctx.translate(z.x, z.y);
      ctx.rotate(angle);
      ctx.fillStyle = z.tint;
      ctx.beginPath();
      ctx.arc(0, -10, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(-10, -2, 20, 22);
      ctx.strokeStyle = '#27451c';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-6, 2); ctx.lineTo(-16, 14);
      ctx.moveTo(6, 2); ctx.lineTo(16, 14);
      ctx.moveTo(-5, 20); ctx.lineTo(-8, 32);
      ctx.moveTo(5, 20); ctx.lineTo(8, 32);
      ctx.stroke();

      const lifeWidth = 28;
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(-lifeWidth / 2, -28, lifeWidth, 4);
      ctx.fillStyle = '#ff6666';
      ctx.fillRect(-lifeWidth / 2, -28, lifeWidth * (z.life / z.maxLife), 4);
      ctx.restore();
    }
  }

  function drawBullets() {
    for (const bullet of state.bullets) {
      ctx.fillStyle = bullet.color;
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawParticles() {
    for (const p of state.particles) {
      ctx.globalAlpha = p.life / p.maxLife;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawTouchStick() {
    if (!state.input.touchActive) return;
    ctx.save();
    ctx.globalAlpha = 0.65;
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(state.input.touchStartX, state.input.touchStartY, 34, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(177,255,112,0.5)';
    ctx.beginPath();
    ctx.arc(state.input.touchX, state.input.touchY, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawHUD() {
    const p = state.player;
    const weapon = getWeapon();

    ctx.fillStyle = 'rgba(18, 22, 18, 0.78)';
    ctx.fillRect(14, 14, 350, 108);
    ctx.strokeStyle = 'rgba(177,255,112,0.24)';
    ctx.strokeRect(14, 14, 350, 108);

    ctx.fillStyle = '#f5f7ef';
    ctx.font = '700 26px Inter, sans-serif';
    ctx.fillText(`Score ${formatScore(state.score)}`, 28, 44);
    ctx.font = '600 16px Inter, sans-serif';
    ctx.fillStyle = '#bcc5b3';
    ctx.fillText(`Récord ${formatScore(state.bestScore)}`, 28, 68);
    ctx.fillText(`Oleada ${state.wave}`, 28, 92);
    ctx.fillText(`Arma ${weapon.name}`, 170, 92);
    ctx.fillText(`Monedas ${state.coins}`, 170, 68);

    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fillRect(28, 100, 300, 12);
    ctx.fillStyle = p.life > 35 ? '#66d96f' : '#ff6666';
    ctx.fillRect(28, 100, 300 * (p.life / p.maxLife), 12);

    if (state.feedbackTimer > 0) {
      ctx.globalAlpha = state.feedbackTimer / 0.5;
      ctx.fillStyle = '#ffffff';
      ctx.font = '800 28px Inter, sans-serif';
      ctx.fillText(state.feedbackText, GAME_WIDTH / 2 - 48, 60);
      ctx.globalAlpha = 1;
    }
  }

  function render() {
    ctx.save();
    const shakeX = rand(-state.screenShake, state.screenShake);
    const shakeY = rand(-state.screenShake, state.screenShake);
    ctx.setTransform(1, 0, 0, 1, shakeX, shakeY);
    ctx.clearRect(-40, -40, GAME_WIDTH + 80, GAME_HEIGHT + 80);
    drawBackground();
    drawBullets();
    drawZombies();
    drawPlayer();
    drawParticles();
    drawTouchStick();
    drawHUD();
    ctx.restore();
  }

  function renderShop() {
    ui.shopCoins.textContent = String(state.coins);
    ui.shopGrid.innerHTML = '';

    SHOP_ITEMS.forEach(item => {
      const card = document.createElement('div');
      card.className = 'shop-item';
      let title = item.label || WEAPON_CATALOG[item.weaponId]?.name || 'Objeto';
      let description = item.description || WEAPON_CATALOG[item.weaponId]?.description || '';
      let owned = false;

      if (item.type === 'weapon' && state.player.weaponId === item.weaponId) {
        owned = true;
      }

      card.innerHTML = `
        <h3>${title}</h3>
        <p>${description}</p>
        <p class="shop-price">${owned ? 'Comprado' : item.price + ' monedas'}</p>
      `;

      const button = document.createElement('button');
      button.className = 'ui-button';
      button.type = 'button';
      button.textContent = owned ? 'Equipado' : 'Comprar';
      button.disabled = owned;
      button.addEventListener('click', () => buyItem(item));
      card.appendChild(button);
      ui.shopGrid.appendChild(card);
    });
  }

  function buyItem(item) {
    if (item.type === 'weapon' && state.player.weaponId === item.weaponId) return;
    if (state.coins < item.price) {
      state.feedbackText = 'monedas insuficientes';
      state.feedbackTimer = 0.5;
      return;
    }

    state.coins -= item.price;
    if (item.type === 'weapon') {
      state.player.weaponId = item.weaponId;
      state.feedbackText = `${WEAPON_CATALOG[item.weaponId].name} comprada`;
    } else if (item.type === 'upgrade' && item.id === 'upgrade-damage') {
      state.player.damageMultiplier *= 1.2;
      state.feedbackText = 'daño mejorado';
    } else if (item.type === 'upgrade' && item.id === 'upgrade-fire-rate') {
      state.player.fireRateMultiplier *= 1.18;
      state.feedbackText = 'cadencia mejorada';
    } else if (item.type === 'heal') {
      state.player.life = clamp(state.player.life + 35, 0, state.player.maxLife);
      state.feedbackText = 'vida recuperada';
    }
    state.feedbackTimer = 0.6;
    audio.buy();
    renderShop();
  }

  function attachEvents() {
    window.addEventListener('keydown', (e) => state.input.keys.add(e.key.toLowerCase()));
    window.addEventListener('keyup', (e) => state.input.keys.delete(e.key.toLowerCase()));

    function pointerPos(e) {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    }

    canvas.addEventListener('pointerdown', (e) => {
      const pos = pointerPos(e);
      state.input.touchActive = true;
      state.input.touchId = e.pointerId;
      state.input.touchStartX = pos.x;
      state.input.touchStartY = pos.y;
      state.input.touchX = pos.x;
      state.input.touchY = pos.y;
    });

    canvas.addEventListener('pointermove', (e) => {
      const pos = pointerPos(e);
      state.input.mouseX = pos.x;
      state.input.mouseY = pos.y;
      if (!state.input.touchActive || e.pointerId !== state.input.touchId) return;
      state.input.touchX = pos.x;
      state.input.touchY = pos.y;
    });

    function endPointer(e) {
      if (e.pointerId !== state.input.touchId) return;
      state.input.touchActive = false;
      state.input.touchId = null;
    }

    canvas.addEventListener('pointerup', endPointer);
    canvas.addEventListener('pointercancel', endPointer);
    canvas.addEventListener('pointerleave', endPointer);

    ui.startButton.addEventListener('click', startGame);
    ui.howToButton.addEventListener('click', () => showOverlay('instructions'));
    ui.backMenuButton.addEventListener('click', () => showOverlay('start'));
    ui.nextWaveButton.addEventListener('click', nextWave);
    ui.restartButton.addEventListener('click', startGame);
    ui.menuButton.addEventListener('click', () => { state.mode = 'menu'; showOverlay('start'); });
    ui.muteButton.addEventListener('click', () => audio.toggle());

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) state.lastTime = 0;
    });
  }

  function loop(t) {
    const dt = Math.min(0.033, ((t - state.lastTime) / 1000) || 0.016);
    state.lastTime = t;
    updateGame(dt);
    requestAnimationFrame(loop);
  }

  attachEvents();
  showOverlay('start');
  requestAnimationFrame(loop);
})();
