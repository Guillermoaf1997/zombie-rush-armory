import { GAME_CONFIG } from '../config.js';

export function loadBestScore() {
  try {
    const raw = localStorage.getItem(GAME_CONFIG.storageKey);
    return raw ? Number.parseInt(raw, 10) || 0 : 0;
  } catch {
    return 0;
  }
}

export function saveBestScore(score) {
  try {
    localStorage.setItem(GAME_CONFIG.storageKey, String(score));
  } catch {
    // No hacemos nada si el almacenamiento no está disponible.
  }
}
