import { GAME_STATES } from '../config.js';
import { formatScore } from '../core/utils.js';

export class DomUI {
  constructor(audioManager) {
    this.audioManager = audioManager;
    this.overlays = {
      [GAME_STATES.MENU]: document.getElementById('startScreen'),
      [GAME_STATES.INSTRUCTIONS]: document.getElementById('instructionsScreen'),
      [GAME_STATES.GAME_OVER]: document.getElementById('gameOverScreen'),
    };

    this.elements = {
      startButton: document.getElementById('startButton'),
      howToPlayButton: document.getElementById('howToPlayButton'),
      backToMenuButton: document.getElementById('backToMenuButton'),
      restartButton: document.getElementById('restartButton'),
      menuButton: document.getElementById('menuButton'),
      muteButton: document.getElementById('muteButton'),
      finalScoreText: document.getElementById('finalScoreText'),
      bestScoreText: document.getElementById('bestScoreText'),
    };
  }

  bind(events) {
    this.elements.startButton.addEventListener('click', () => {
      this.audioManager.click();
      events.onStart();
    });
    this.elements.howToPlayButton.addEventListener('click', () => {
      this.audioManager.click();
      events.onOpenInstructions();
    });
    this.elements.backToMenuButton.addEventListener('click', () => {
      this.audioManager.click();
      events.onBackToMenu();
    });
    this.elements.restartButton.addEventListener('click', () => {
      this.audioManager.click();
      events.onRestart();
    });
    this.elements.menuButton.addEventListener('click', () => {
      this.audioManager.click();
      events.onBackToMenu();
    });
    this.elements.muteButton.addEventListener('click', () => {
      const isEnabled = this.audioManager.toggle();
      this.elements.muteButton.textContent = isEnabled ? '🔊' : '🔈';
    });
  }

  show(state) {
    Object.values(this.overlays).forEach((overlay) => overlay.classList.remove('overlay--visible'));
    if (this.overlays[state]) {
      this.overlays[state].classList.add('overlay--visible');
    }
  }

  hideAll() {
    Object.values(this.overlays).forEach((overlay) => overlay.classList.remove('overlay--visible'));
  }

  updateGameOver(score, bestScore) {
    this.elements.finalScoreText.textContent = `Puntuación: ${formatScore(score)}`;
    this.elements.bestScoreText.textContent = `Récord: ${formatScore(bestScore)}`;
  }
}
