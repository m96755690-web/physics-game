// Tiny WebAudio synth: every sound is generated, no asset files needed.
const PENT = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.5];
const AMB = [110, 164.81, 196, 220, 246.94, 293.66, 329.63, 392, 440, 493.88];

export class Sfx {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private musicBus!: GainNode;
  private noiseBuf: AudioBuffer | null = null;
  private timer: number | null = null;
  private duck = 1;
  enabled = true;
  musicWanted = false;

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.enabled ? 0.85 : 0;
      this.master.connect(this.ctx.destination);
      this.musicBus = this.ctx.createGain();
      this.musicBus.gain.value = 0.55 * this.duck;
      const delay = this.ctx.createDelay(1);
      delay.delayTime.value = 0.34;
      const fb = this.ctx.createGain();
      fb.gain.value = 0.38;
      delay.connect(fb);
      fb.connect(delay);
      this.musicBus.connect(this.master);
      this.musicBus.connect(delay);
      delay.connect(this.master);
      const len = this.ctx.sampleRate * 0.6;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      if (this.musicWanted) this.startMusic();
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  setEnabled(v: boolean) {
    this.enabled = v;
    if (this.ctx) this.master.gain.setTargetAtTime(v ? 0.85 : 0, this.ctx.currentTime, 0.04);
  }

  private tone(freq: number, dur: number, type: OscillatorType, vol: number, slideTo?: number, delay = 0, dest?: AudioNode) {
    const c = this.ctx;
    if (!c || !this.enabled) return;
    const t = c.currentTime + delay;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(dest ?? this.master);
    o.start(t);
    o.stop(t + dur + 0.03);
  }

  private noise(dur: number, vol: number, freq: number, type: BiquadFilterType, delay = 0) {
    const c = this.ctx;
    if (!c || !this.enabled || !this.noiseBuf) return;
    const t = c.currentTime + delay;
    const s = c.createBufferSource();
    s.buffer = this.noiseBuf;
    const f = c.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f);
    f.connect(g);
    g.connect(this.master);
    s.start(t);
    s.stop(t + dur + 0.02);
  }

  click() {
    this.tone(660, 0.07, "triangle", 0.18, 990);
  }
  launch(power: number) {
    this.tone(180 + power * 120, 0.28, "sawtooth", 0.1, 760 + power * 500);
    this.noise(0.22, 0.18, 1400 + power * 1500, "bandpass");
  }
  bounce(speed: number) {
    const n = PENT[(Math.random() * 5) | 0] * 0.5;
    const v = Math.min(0.3, 0.07 + speed / 3500);
    this.tone(n, 0.16, "triangle", v, n * 0.8);
    this.tone(n * 2, 0.08, "sine", v * 0.5);
  }
  bumper() {
    this.tone(420, 0.14, "square", 0.1, 940);
    this.tone(1250, 0.18, "sine", 0.14, 900);
  }
  star(combo: number) {
    const f = PENT[Math.min(PENT.length - 1, combo - 1 + 2)];
    this.tone(f, 0.32, "sine", 0.24);
    this.tone(f * 2, 0.22, "triangle", 0.1, undefined, 0.02);
    this.tone(f * 1.5, 0.28, "sine", 0.1, undefined, 0.06);
  }
  crystal() {
    this.noise(0.28, 0.35, 3800, "highpass");
    this.tone(1568, 0.3, "sine", 0.12, 2400);
    this.tone(2093, 0.22, "triangle", 0.08, undefined, 0.04);
  }
  portal() {
    this.tone(260, 0.3, "sine", 0.2, 1100);
    this.tone(1100, 0.3, "triangle", 0.1, 300, 0.04);
  }
  goal() {
    [0, 2, 3, 5, 7].forEach((n, i) => {
      this.tone(PENT[n], 0.6, "triangle", 0.2, undefined, i * 0.07);
      this.tone(PENT[n] * 2, 0.4, "sine", 0.07, undefined, i * 0.07 + 0.02);
    });
    this.noise(0.5, 0.14, 5000, "highpass", 0.05);
  }
  fail() {
    this.tone(330, 0.55, "sawtooth", 0.14, 70);
    this.tone(247, 0.6, "square", 0.08, 55, 0.05);
    this.noise(0.4, 0.14, 300, "lowpass");
  }
  fizzle() {
    this.tone(300, 0.3, "triangle", 0.14, 90);
  }
  tick() {
    this.tone(1400, 0.04, "square", 0.05);
  }

  // ---- ambient music
  startMusic() {
    this.musicWanted = true;
    const c = this.ctx;
    if (!c || this.timer !== null) return;
    // slow pad
    const pad = (f: number, v: number) => {
      const o = c.createOscillator();
      const g = c.createGain();
      const lp = c.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 520;
      o.type = "sawtooth";
      o.frequency.value = f;
      g.gain.value = v;
      o.connect(lp);
      lp.connect(g);
      g.connect(this.musicBus);
      o.start();
    };
    pad(55, 0.035);
    pad(82.4, 0.025);
    pad(110.3, 0.018);
    let step = 0;
    this.timer = window.setInterval(() => {
      if (!this.ctx || !this.enabled) return;
      step++;
      if (Math.random() < 0.62) {
        const f = AMB[(Math.random() * AMB.length) | 0];
        this.tone(f, 1.6, "triangle", 0.06, undefined, 0, this.musicBus);
        if (step % 4 === 0) this.tone(f * 2, 1.2, "sine", 0.03, undefined, 0.12, this.musicBus);
      }
    }, 420);
  }

  setDuck(v: number) {
    this.duck = v;
    if (this.ctx) this.musicBus.gain.setTargetAtTime(0.55 * v, this.ctx.currentTime, 0.1);
  }
}
