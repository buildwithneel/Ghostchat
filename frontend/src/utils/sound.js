// GhostChat Web Audio Engine
// Provides zero-latency, cross-platform synthesized sound effects for web, Android, and iOS PWA

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  setEnabled(val) {
    this.enabled = !!val;
    if (this.enabled) {
      this.init();
      this.playToggle();
    }
  }

  // Sent message sound: subtle, swift upward whoosh/pop
  playSend() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) {
        this.fallbackPlay('/send.mp3');
        return;
      }
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.exponentialRampToValueAtTime(840, now + 0.08);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.12);
    } catch (_err) {
      this.fallbackPlay('/send.mp3');
    }
  }

  // Incoming message notification: dual crystal chime
  playReceive() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) {
        this.fallbackPlay('/notification.mp3');
        return;
      }
      const now = this.ctx.currentTime;
      const notes = [659.25, 880]; // E5, A5 crystal intervals

      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        const startTime = now + idx * 0.09;
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.001, startTime);
        gain.gain.linearRampToValueAtTime(0.25, startTime + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.35);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.35);
      });
    } catch (_err) {
      this.fallbackPlay('/notification.mp3');
    }
  }

  // Sound toggle feedback
  playToggle() {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(680, now + 0.05);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.08);
    } catch {
      // Ignored
    }
  }

  fallbackPlay(url) {
    try {
      const audio = new Audio(url);
      audio.volume = 0.35;
      audio.play().catch(() => {});
    } catch {
      // Ignored
    }
  }
}

export const soundEngine = new SoundEngine();
