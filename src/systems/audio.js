export class AudioManager {
  constructor() {
    this.enabled = true;
    this.audioContext = null;
  }

  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  async ensureContext() {
    if (!this.enabled) return null;
    if (!this.audioContext) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return null;
      this.audioContext = new AudioContextClass();
    }
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    return this.audioContext;
  }

  async playTone({ frequency = 440, duration = 0.08, type = 'sine', volume = 0.03, slideTo = null }) {
    const context = await this.ensureContext();
    if (!context) return;

    const oscillator = context.createOscillator();
    const gainNode = context.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, context.currentTime);

    if (slideTo) {
      oscillator.frequency.exponentialRampToValueAtTime(slideTo, context.currentTime + duration);
    }

    gainNode.gain.setValueAtTime(volume, context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + duration);
  }

  pickup() {
    this.playTone({ frequency: 740, duration: 0.09, type: 'triangle', volume: 0.045, slideTo: 980 });
  }

  shield() {
    this.playTone({ frequency: 320, duration: 0.22, type: 'sawtooth', volume: 0.05, slideTo: 680 });
  }

  hit() {
    this.playTone({ frequency: 180, duration: 0.2, type: 'square', volume: 0.055, slideTo: 90 });
  }

  nearMiss() {
    this.playTone({ frequency: 580, duration: 0.05, type: 'triangle', volume: 0.02, slideTo: 650 });
  }

  click() {
    this.playTone({ frequency: 480, duration: 0.04, type: 'square', volume: 0.02, slideTo: 440 });
  }
}
