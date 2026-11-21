// Gilded Shadow — sound, synthesized with WebAudio. No audio files, no
// network: every sound is an oscillator (or a short noise burst) shaped by an
// envelope. Footsteps are the gameplay signal — a guard's steps get louder
// and pan toward the player as the guard closes in.
export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.master = null;
  }

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return true;
    }
    try {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return false;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
      return true;
    } catch {
      return false;
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.5;
    return this.muted;
  }

  tone(freq, seconds, type, volume, when = 0, slideTo = null) {
    if (!this.ensure() || this.muted) return;
    if (!Number.isFinite(freq) || freq <= 0) return;
    if (slideTo !== null && (!Number.isFinite(slideTo) || slideTo <= 0)) slideTo = null;
    try {
      const t0 = this.ctx.currentTime + when;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + seconds);
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(volume, t0 + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + seconds);
      osc.connect(gain);
      gain.connect(this.master);
      osc.start(t0);
      osc.stop(t0 + seconds + 0.05);
    } catch { /* audio is garnish; never break the game */ }
  }

  noise(seconds, volume, when = 0, pan = 0) {
    if (!this.ensure() || this.muted) return;
    try {
      const t0 = this.ctx.currentTime + when;
      const len = Math.max(1, Math.floor(this.ctx.sampleRate * seconds));
      const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      const gain = this.ctx.createGain();
      gain.gain.value = volume;
      let node = gain;
      if (this.ctx.createStereoPanner) {
        const panner = this.ctx.createStereoPanner();
        panner.pan.value = Math.max(-1, Math.min(1, pan));
        gain.connect(panner);
        node = panner;
      }
      source.connect(gain);
      node.connect(this.master);
      source.start(t0);
    } catch { /* audio is garnish; never break the game */ }
  }

  /** Soft floor tap. Louder + lower when sprinting. */
  footstep(sprinting) {
    this.noise(0.05, sprinting ? 0.10 : 0.05);
  }

  /** A guard's step, panned by where the guard is relative to the player. */
  guardStep(distance, pan) {
    const volume = Math.max(0, 0.16 * (1 - distance / 340));
    if (volume <= 0.01) return;
    this.noise(0.06, volume, 0, pan);
  }

  /** Two-note alert sting when a guard spots the thief. */
  alert() {
    this.tone(392, 0.16, 'square', 0.12);
    this.tone(311, 0.28, 'square', 0.12, 0.14);
  }

  /** Suspicious "hmm?" blip when a guard turns to investigate. */
  suspicious() { this.tone(220, 0.12, 'sine', 0.08, 0, 180); }

  /** Pebble clink on the floor. */
  pebble() { this.tone(1250, 0.07, 'triangle', 0.10, 0, 700); }

  pickup() {
    this.tone(660, 0.10, 'sine', 0.10);
    this.tone(990, 0.16, 'sine', 0.10, 0.09);
  }

  win() {
    [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.22, 'sine', 0.11, i * 0.11));
  }

  lose() {
    [330, 262, 196].forEach((f, i) => this.tone(f, 0.3, 'triangle', 0.10, i * 0.16));
  }
}
