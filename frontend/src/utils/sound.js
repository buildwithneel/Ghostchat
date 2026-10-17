// GhostChat Web Audio Engine
// Provides zero-latency, cross-platform synthesized sound effects for web, Android, and iOS PWA
// Handles browser/mobile autoplay permissions and fallback audio safely

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.lastReceiveTime = 0;
    this.lastSendTime = 0;
    this.isUnlocked = false;

    if (typeof window !== 'undefined') {
      this._bindUserUnlock();
    }
  }

  _bindUserUnlock() {
    const unlockHandler = () => {
      this.unlockAudio();
      window.removeEventListener('pointerdown', unlockHandler);
      window.removeEventListener('touchstart', unlockHandler);
      window.removeEventListener('keydown', unlockHandler);
      window.removeEventListener('click', unlockHandler);
    };

    window.addEventListener('pointerdown', unlockHandler, { passive: true });
    window.addEventListener('touchstart', unlockHandler, { passive: true });
    window.addEventListener('keydown', unlockHandler, { passive: true });
    window.addEventListener('click', unlockHandler, { passive: true });
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

  unlockAudio() {
    this.init();
    if (!this.ctx) return;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    // iOS Safari & Android hardware priming: play a 1-sample silent buffer
    if (!this.isUnlocked) {
      try {
        const buffer = this.ctx.createBuffer(1, 1, 22050);
        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(this.ctx.destination);
        source.start(0);
        this.isUnlocked = true;
      } catch {
        // Ignored
      }
    }
  }

  setEnabled(val) {
    this.enabled = !!val;
    if (this.enabled) {
      this.unlockAudio();
      this.playToggle();
    }
  }

  // Sent message sound: subtle, swift upward whoosh/pop
  playSend() {
    if (!this.enabled) return;

    const nowTime = Date.now();
    if (nowTime - this.lastSendTime < 80) return; // Prevent duplicate rapid clicks
    this.lastSendTime = nowTime;

    this.unlockAudio();

    if (this.ctx && this.ctx.state === 'running') {
      try {
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(420, now);
        osc.frequency.exponentialRampToValueAtTime(840, now + 0.08);

        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.12);
        return;
      } catch {
        // Fallback to HTML5 audio if synthesis fails
      }
    }

    this.fallbackPlay('/send.mp3');
  }

  // Incoming message notification: dual crystal chime
  playReceive() {
    if (!this.enabled) return;

    // Prevent duplicate sounds from bursts or multiple event dispatches
    const nowTime = Date.now();
    if (nowTime - this.lastReceiveTime < 150) return;
    this.lastReceiveTime = nowTime;

    this.unlockAudio();

    if (this.ctx && this.ctx.state === 'running') {
      try {
        const now = this.ctx.currentTime;
        const notes = [659.25, 880]; // E5, A5 crystal intervals

        notes.forEach((freq, idx) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();

          const startTime = now + idx * 0.09;
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, startTime);

          gain.gain.setValueAtTime(0.001, startTime);
          gain.gain.linearRampToValueAtTime(0.22, startTime + 0.015);
          gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.35);

          osc.connect(gain);
          gain.connect(this.ctx.destination);

          osc.start(startTime);
          osc.stop(startTime + 0.35);
        });
        return;
      } catch {
        // Fallback to HTML5 audio if synthesis fails
      }
    }

    // Fallback: If context is suspended, try to resume for next time, but play fallback audio now
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    this.fallbackPlay('/notification.mp3');
  }

  // Sound toggle feedback
  playToggle() {
    if (!this.enabled) return;
    this.unlockAudio();

    if (this.ctx && this.ctx.state === 'running') {
      try {
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
  }

  fallbackPlay(url) {
    if (!this.enabled) return;
    try {
      const audio = new Audio(url);
      audio.volume = 0.35;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Autoplay policy or permissions blocked without user interaction
        });
      }
    } catch {
      // Ignored
    }
  }
}

export const soundEngine = new SoundEngine();
