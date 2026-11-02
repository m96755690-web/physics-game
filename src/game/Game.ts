import {
  BALL_R,
  DT,
  GOAL_ASSIST,
  H,
  MUZZLE,
  PORTAL_R,
  W,
  launchBall,
  makeWorld,
  newBall,
  previewBuf,
  previewPath,
  segOffset,
  stepBall,
  type Ball,
  type EvFn,
  type World,
} from "./physics";
import { DEMO_LEVEL, LEVELS } from "./levels";
import { COL, Fx, glow } from "./fx";
import { Sfx } from "./audio";
import { getName, getSound, setSound } from "./storage";
import type { ClearInfo, ClearRow, GameOverInfo, HudState, LevelDef, Phase } from "./types";

export const FONT = '"Cairo Variable", "Segoe UI", Tahoma, sans-serif';
const TAU = Math.PI * 2;
const TOP_PAD = 68;
const BOTTOM_PAD = 10;
const DRAG_MIN = 22;
const DRAG_MAX = 150;
const A_MIN = -Math.PI + 0.06;
const A_MAX = -0.06;
const TRAIL = 40;
export const START_LIVES = 3;

export interface GameCallbacks {
  onPhase(p: Phase): void;
  onHud(h: HudState): void;
  onClear(i: ClearInfo): void;
  onGameOver(i: GameOverInfo): void;
  onSound(on: boolean): void;
}

const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const vib = (p: number | number[]) => {
  try {
    navigator.vibrate?.(p);
  } catch {
    /* ignore */
  }
};

function starPath(ctx: CanvasRenderingContext2D, x: number, y: number, R: number, r: number, rot: number) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = rot + (i * Math.PI) / 5 - Math.PI / 2;
    const rad = i % 2 === 0 ? R : r;
    const px = x + Math.cos(a) * rad;
    const py = y + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private cb: GameCallbacks;
  readonly sfx = new Sfx();
  private fx = new Fx();

  private dpr = 1;
  private vw = 0;
  private vh = 0;
  private scale = 1;
  private offX = 0;
  private offY = 0;
  private bg = document.createElement("canvas");
  private panel = document.createElement("canvas");
  private coarse = false;

  phase: Phase = "menu";
  private levelIndex = 0;
  private lives = START_LIVES;
  private score = 0;
  private levelStartScore = 0;
  private level: LevelDef = LEVELS[0];
  private world: World = makeWorld(LEVELS[0]);
  private shotsLeft = 0;
  private shotsUsed = 0;
  private starsGot = 0;

  private ball: Ball = newBall();
  private ballActive = false;
  private ix = 0;
  private iy = 0;
  private combo = 0;
  private shotBounces = 0;
  private squash = 0;
  private squashAng = 0;
  private acc = 0;

  private angle = -Math.PI / 2;
  private power = 0.7;
  private drag: { id: number; sx: number; sy: number; cx: number; cy: number; dist: number } | null = null;
  private keys = new Set<string>();
  private rotHold = 0;
  private powHold = 0;
  private pvN = 0;
  private pvDirty = true;

  private capture: { t: number; x0: number; y0: number; boom: boolean } | null = null;
  private after: { t: number; fn: () => void } | null = null;

  private recoil = 0;
  private trauma = 0;
  private freeze = 0;
  private slowT = 0;
  private timeScale = 1;
  private flash = 0;
  private flashCol = "#ffffff";
  private time = 0;
  private bannerT = 99;
  private segFlash: number[] = [];
  private bumpPulse: number[] = [];
  private edgeFlash = [0, 0, 0, 0];
  private portalPulse: number[] = [];

  private trailX = new Float32Array(TRAIL);
  private trailY = new Float32Array(TRAIL);
  private trailHead = 0;
  private trailLen = 0;

  private demoBalls: Ball[] = [];
  private demoWorld = makeWorld(DEMO_LEVEL);
  private demoAcc = 0;

  private raf = 0;
  private last = 0;
  private dirty = true;
  private destroyed = false;

  constructor(canvas: HTMLCanvasElement, cb: GameCallbacks) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: false })!;
    this.cb = cb;
    this.sfx.enabled = getSound();
    this.sfx.musicWanted = true;
    this.coarse = typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;

    window.addEventListener("resize", this.resize);
    window.addEventListener("orientationchange", this.resize);
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.onBlur);
    document.addEventListener("visibilitychange", this.onVis);
    canvas.addEventListener("pointerdown", this.onPointerDown);
    canvas.addEventListener("pointermove", this.onPointerMove);
    canvas.addEventListener("pointerup", this.onPointerUp);
    canvas.addEventListener("pointercancel", this.onPointerCancel);

    this.resize();
    this.loadLevel(0);
    this.resetDemo();
    this.cb.onPhase("menu");
    this.emitHud();
    this.raf = requestAnimationFrame(this.frame);
  }

  destroy() {
    this.destroyed = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener("resize", this.resize);
    window.removeEventListener("orientationchange", this.resize);
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.onBlur);
    document.removeEventListener("visibilitychange", this.onVis);
    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
    this.canvas.removeEventListener("pointermove", this.onPointerMove);
    this.canvas.removeEventListener("pointerup", this.onPointerUp);
    this.canvas.removeEventListener("pointercancel", this.onPointerCancel);
  }

  // ------------------------------------------------------------ public API
  get soundOn() {
    return this.sfx.enabled;
  }

  toggleSound() {
    this.sfx.unlock();
    const on = !this.sfx.enabled;
    this.sfx.setEnabled(on);
    setSound(on);
    this.cb.onSound(on);
    if (on) this.sfx.click();
  }

  startGame() {
    if (this.phase !== "menu" && this.phase !== "gameover" && this.phase !== "paused") return;
    this.sfx.unlock();
    this.sfx.startMusic();
    this.sfx.setDuck(1);
    this.sfx.click();
    this.score = 0;
    this.lives = START_LIVES;
    this.levelStartScore = 0;
    this.keys.clear();
    this.drag = null;
    this.loadLevel(0);
    this.setPhase("playing");
  }

  restartLevel() {
    if (this.phase !== "playing" && this.phase !== "paused") return;
    this.sfx.click();
    this.score = this.levelStartScore;
    this.drag = null;
    this.loadLevel(this.levelIndex);
    this.sfx.setDuck(1);
    this.setPhase("playing");
  }

  pause() {
    if (this.phase !== "playing") return;
    this.drag = null;
    this.keys.clear();
    this.sfx.click();
    this.sfx.setDuck(0.3);
    this.setPhase("paused");
  }

  resume() {
    if (this.phase !== "paused") return;
    this.sfx.click();
    this.sfx.setDuck(1);
    this.setPhase("playing");
  }

  toMenu() {
    if (this.phase !== "paused" && this.phase !== "gameover") return;
    this.sfx.click();
    this.sfx.setDuck(0.7);
    this.fx.clear();
    this.resetDemo();
    this.setPhase("menu");
  }

  nextLevel() {
    if (this.phase !== "clear") return;
    this.sfx.click();
    if (this.levelIndex >= LEVELS.length - 1) {
      this.score += this.lives * 1000;
      this.emitHud();
      this.gameOver(true);
      return;
    }
    this.levelStartScore = this.score;
    this.loadLevel(this.levelIndex + 1);
    this.setPhase("playing");
  }

  // ------------------------------------------------------------ state
  private setPhase(p: Phase) {
    this.phase = p;
    this.dirty = true;
    this.cb.onPhase(p);
    this.emitHud();
  }

  private emitHud() {
    this.cb.onHud({
      score: this.score,
      level: this.levelIndex + 1,
      levels: LEVELS.length,
      lives: this.lives,
      shotsLeft: this.shotsLeft,
      shotsMax: this.level.shots,
      stars: this.starsGot,
      starsTotal: this.level.stars.length,
      name: getName(),
    });
  }

  private loadLevel(i: number) {
    this.levelIndex = i;
    this.level = LEVELS[i];
    this.world = makeWorld(this.level);
    this.shotsLeft = this.level.shots;
    this.shotsUsed = 0;
    this.starsGot = 0;
    this.ballActive = false;
    this.combo = 0;
    this.capture = null;
    this.after = null;
    this.angle = -Math.PI / 2;
    this.power = 0.7;
    this.segFlash = this.level.segs.map(() => 0);
    this.bumpPulse = this.level.bumpers.map(() => 0);
    this.portalPulse = this.level.portals.map(() => 0);
    this.edgeFlash = [0, 0, 0, 0];
    this.trailLen = 0;
    this.fx.clear();
    this.bannerT = 0;
    this.recoil = 0;
    this.pvDirty = true;
    this.timeScale = 1;
    this.slowT = 0;
    this.freeze = 0;
    this.fx.ring(this.level.start[0], this.level.start[1], 90, COL.cyan, 0.8, 3);
    this.fx.burst(this.level.start[0], this.level.start[1], 16, 220, COL.cyan, 4, 0.6);
    this.emitHud();
  }

  private canFire() {
    return this.phase === "playing" && !this.ballActive && !this.capture && !this.after && this.shotsLeft > 0;
  }

  private addTrauma(v: number) {
    this.trauma = Math.min(1, this.trauma + v);
  }

  private fire() {
    if (!this.canFire()) return;
    const L = this.level;
    this.shotsLeft--;
    this.shotsUsed++;
    this.world.time = 0;
    launchBall(this.ball, L, this.angle, this.power);
    this.ix = this.ball.x;
    this.iy = this.ball.y;
    this.ballActive = true;
    this.combo = 0;
    this.shotBounces = 0;
    this.acc = 0;
    this.trailLen = 0;
    this.recoil = 1;
    this.bannerT = Math.max(this.bannerT, 2.6);
    const dx = Math.cos(this.angle);
    const dy = Math.sin(this.angle);
    this.fx.cone(L.start[0] + dx * MUZZLE, L.start[1] + dy * MUZZLE, dx, dy, 16, 420 + this.power * 360, 0.32, COL.cyan);
    this.fx.ring(L.start[0], L.start[1], 62, COL.cyan, 0.4, 3);
    this.addTrauma(0.22 + this.power * 0.1);
    this.sfx.launch(this.power);
    vib(10);
    this.emitHud();
  }

  private onHit: EvFn = (kind, x, y, nx, ny, speed, idx) => {
    const fx = this.fx;
    switch (kind) {
      case "wall": {
        const seg = this.level.segs[idx];
        const col = seg.kind === "crystal" ? COL.orange : seg.kind === "mover" ? COL.violet : COL.cyan;
        fx.cone(x, y, nx, ny, 5 + ((speed / 140) | 0), 180 + speed * 0.5, 0.7, col);
        this.segFlash[idx] = 1;
        this.squash = Math.min(1, speed / 800);
        this.squashAng = Math.atan2(ny, nx);
        this.addTrauma(Math.min(0.2, speed / 4500));
        this.sfx.bounce(speed);
        this.shotBounces++;
        break;
      }
      case "edge": {
        fx.cone(x, y, nx, ny, 5 + ((speed / 140) | 0), 180 + speed * 0.5, 0.7, COL.cyan);
        this.edgeFlash[idx] = 1;
        this.squash = Math.min(1, speed / 800);
        this.squashAng = Math.atan2(ny, nx);
        this.addTrauma(Math.min(0.2, speed / 4500));
        this.sfx.bounce(speed);
        this.shotBounces++;
        break;
      }
      case "bumper": {
        this.bumpPulse[idx] = 1;
        fx.cone(x, y, nx, ny, 14, 420, 0.8, COL.mag);
        fx.ring(x, y, 52, COL.mag, 0.38, 3);
        this.score += 50;
        fx.text("+50", x + nx * 30, y + ny * 30, COL.mag, 22);
        this.squash = 1;
        this.squashAng = Math.atan2(ny, nx);
        this.addTrauma(0.3);
        this.sfx.bumper();
        this.shotBounces++;
        vib(8);
        this.emitHud();
        break;
      }
      case "crystal": {
        fx.shards(x, y, 16, COL.orange);
        fx.shards(x, y, 8, "#ffe3b8", 240);
        fx.ring(x, y, 78, COL.orange, 0.5, 4);
        fx.burst(x, y, 12, 320, "#ffd9a0", 4, 0.5);
        this.score += 100;
        fx.text("+100", x, y - 26, COL.orange, 24);
        this.addTrauma(0.45);
        this.freeze = 0.05;
        this.sfx.crystal();
        this.pvDirty = true;
        vib(14);
        this.emitHud();
        break;
      }
      case "portal": {
        const from = idx % 2 === 0 ? COL.blue : COL.orange;
        const to = idx % 2 === 0 ? COL.orange : COL.blue;
        fx.ring(x, y, 60, from, 0.45, 4);
        fx.burst(x, y, 16, 280, from, 4, 0.5);
        fx.ring(nx, ny, 60, to, 0.45, 4);
        fx.burst(nx, ny, 16, 280, to, 4, 0.5);
        this.portalPulse[(idx / 2) | 0] = 1;
        this.trailLen = 0;
        this.addTrauma(0.12);
        this.sfx.portal();
        break;
      }
      case "star": {
        this.combo++;
        const pts = 200 * this.combo;
        this.score += pts;
        this.starsGot++;
        fx.burst(x, y, 24, 340, COL.gold, 5, 0.7);
        fx.ring(x, y, 64, COL.gold, 0.5, 4);
        fx.text(`+${pts}`, x, y - 24, COL.gold, 28);
        if (this.combo > 1) fx.text(`كومبو ×${this.combo}`, x, y - 56, COL.mint, 22);
        this.addTrauma(0.12);
        this.sfx.star(this.combo);
        vib(8);
        this.emitHud();
        break;
      }
    }
  };

  private shotLost() {
    this.ballActive = false;
    this.world.time = 0;
    this.pvDirty = true;
    const b = this.ball;
    const px = clamp(b.x, 70, W - 70);
    const py = clamp(b.y, 90, H - 110);
    this.fx.burst(px, py, 10, 160, COL.cyan, 4, 0.5);
    this.sfx.fizzle();
    if (this.shotsLeft > 0) {
      this.fx.text("أخطأت!", px, py, COL.red, 30);
    } else {
      this.levelFailed();
    }
    this.emitHud();
  }

  private levelFailed() {
    this.lives--;
    this.addTrauma(0.75);
    this.flash = 0.35;
    this.flashCol = "#ff2d55";
    this.sfx.fail();
    vib([40, 30, 60]);
    this.fx.text(this.lives > 0 ? "نفدت الطلقات" : "انتهت الطاقة", W / 2, H / 2 - 40, COL.red, 42);
    this.emitHud();
    this.after = {
      t: 1.2,
      fn: () => {
        if (this.lives <= 0) this.gameOver(false);
        else {
          this.score = this.levelStartScore;
          this.loadLevel(this.levelIndex);
        }
      },
    };
  }

  private goalReached() {
    const L = this.level;
    const b = this.ball;
    this.ballActive = false;
    this.capture = { t: 0, x0: b.x, y0: b.y, boom: false };
    this.slowT = 0.6;
    this.freeze = 0.07;
    this.addTrauma(0.85);
    this.flash = 0.5;
    this.flashCol = "#d8fff0";
    this.fx.confetti(L.goal[0], L.goal[1], 70);
    this.fx.ring(L.goal[0], L.goal[1], 160, COL.mint, 0.8, 6);
    this.fx.ring(L.goal[0], L.goal[1], 100, "#ffffff", 0.6, 3);
    this.fx.burst(L.goal[0], L.goal[1], 30, 520, COL.mint, 5, 0.8);
    this.sfx.goal();
    vib([20, 30, 40]);

    const rows: ClearRow[] = [];
    const live = this.score - this.levelStartScore;
    if (live > 0) rows.push({ label: "نقاط الطريق", value: live });
    const bonus: ClearRow[] = [{ label: "إنجاز المرحلة", value: 1000 }];
    if (this.shotsLeft > 0) bonus.push({ label: `طلقات متبقية ×${this.shotsLeft}`, value: this.shotsLeft * 300 });
    if (L.stars.length > 0 && this.starsGot === L.stars.length) bonus.push({ label: "كل النجوم", value: 500 });
    if (this.shotsUsed === 1) bonus.push({ label: "ضربة واحدة!", value: 500 });
    const bb = Math.min(this.shotBounces, 12);
    if (bb >= 3) bonus.push({ label: `ارتدادات ×${bb}`, value: bb * 25 });
    for (const r of bonus) this.score += r.value;
    rows.push(...bonus);
    const total = rows.reduce((s, r) => s + r.value, 0);
    const info: ClearInfo = {
      level: this.levelIndex + 1,
      name: L.name,
      rows,
      total,
      stars: this.starsGot,
      starsTotal: L.stars.length,
      last: this.levelIndex >= LEVELS.length - 1,
    };
    this.emitHud();
    this.after = {
      t: 1.3,
      fn: () => {
        this.setPhase("clear");
        this.cb.onClear(info);
      },
    };
  }

  private gameOver(won: boolean) {
    this.after = null;
    this.capture = null;
    this.sfx.setDuck(0.5);
    this.setPhase("gameover");
    this.cb.onGameOver({ score: this.score, level: this.levelIndex + 1, won });
  }

  // ------------------------------------------------------------ demo (menu)
  private resetDemo() {
    this.demoWorld = makeWorld(DEMO_LEVEL);
    this.demoBalls = [];
    this.bumpPulse = DEMO_LEVEL.bumpers.map(() => 0);
    this.segFlash = DEMO_LEVEL.segs.map(() => 0);
    this.edgeFlash = [0, 0, 0, 0];
    for (let i = 0; i < 3; i++) {
      const b = newBall();
      b.x = rnd(90, 510);
      b.y = rnd(120, 760);
      const a = rnd(0, TAU);
      const v = rnd(420, 640);
      b.vx = Math.cos(a) * v;
      b.vy = Math.sin(a) * v;
      b.px = b.x;
      b.py = b.y;
      this.demoBalls.push(b);
    }
  }

  private demoEv: EvFn = (kind, x, y, nx, ny, speed, idx) => {
    if (kind === "bumper") {
      this.bumpPulse[idx] = 1;
      this.fx.cone(x, y, nx, ny, 10, 300, 0.8, COL.mag);
      this.fx.ring(x, y, 50, COL.mag, 0.4, 3);
    } else if (kind === "wall") {
      this.segFlash[idx] = 1;
      this.fx.cone(x, y, nx, ny, 6, 220, 0.7, COL.cyan);
    } else if (kind === "edge") {
      this.edgeFlash[idx] = 1;
      this.fx.cone(x, y, nx, ny, 6 + ((speed / 200) | 0), 220, 0.7, COL.cyan);
    }
  };

  private updateDemo(sdt: number) {
    this.demoAcc += sdt;
    let n = 0;
    while (this.demoAcc >= DT && n < 8) {
      for (const b of this.demoBalls) stepBall(b, this.demoWorld, this.demoEv);
      this.demoAcc -= DT;
      n++;
    }
    if (n === 8) this.demoAcc = 0;
    const cols = [COL.cyan, COL.mag, COL.gold];
    this.demoBalls.forEach((b, i) => {
      const sp = Math.hypot(b.vx, b.vy);
      if (sp < 380) {
        b.vx *= 1.02;
        b.vy *= 1.02;
      }
      this.fx.glowDot(b.x, b.y, 0.5, 6, cols[i % 3]);
    });
  }

  // ------------------------------------------------------------ update
  private frame = (ts: number) => {
    if (this.destroyed) return;
    this.raf = requestAnimationFrame(this.frame);
    let dt = this.last ? (ts - this.last) / 1000 : 1 / 60;
    this.last = ts;
    if (dt > 0.1) dt = 0.1;
    this.update(dt);
    // while paused nothing changes: draw once, then idle (saves battery on mobile)
    if (this.phase === "paused" && !this.dirty) return;
    this.dirty = false;
    this.render();
  };

  private update(dt: number) {
    if (this.phase === "paused") return;
    this.time += dt;
    this.trauma = Math.max(0, this.trauma - dt * 1.7);
    this.flash = Math.max(0, this.flash - dt * 2.2);
    this.recoil = Math.max(0, this.recoil - dt * 5);
    this.squash = Math.max(0, this.squash - dt * 6);
    this.bannerT += dt;
    const dec = dt * 4;
    for (let i = 0; i < this.segFlash.length; i++) if (this.segFlash[i] > 0) this.segFlash[i] = Math.max(0, this.segFlash[i] - dec);
    for (let i = 0; i < this.bumpPulse.length; i++) if (this.bumpPulse[i] > 0) this.bumpPulse[i] = Math.max(0, this.bumpPulse[i] - dt * 3.5);
    for (let i = 0; i < this.portalPulse.length; i++) if (this.portalPulse[i] > 0) this.portalPulse[i] = Math.max(0, this.portalPulse[i] - dt * 3);
    for (let i = 0; i < 4; i++) if (this.edgeFlash[i] > 0) this.edgeFlash[i] = Math.max(0, this.edgeFlash[i] - dt * 3.5);

    if (this.after) {
      this.after.t -= dt;
      if (this.after.t <= 0) {
        const f = this.after.fn;
        this.after = null;
        f();
      }
    }

    this.slowT -= dt;
    const target = this.slowT > 0 ? 0.28 : 1;
    this.timeScale += (target - this.timeScale) * Math.min(1, dt * 10);
    let sdt = dt * this.timeScale;
    if (this.freeze > 0) {
      this.freeze -= dt;
      sdt = 0;
    }

    if (this.phase === "menu") {
      this.updateDemo(sdt);
    } else {
      if (this.phase === "playing") this.updateAim(dt);
      if (this.ballActive) this.stepPhysics(sdt);
      else if (this.trailLen > 0) this.trailLen = Math.max(0, this.trailLen - 1);
      if (this.capture) {
        this.capture.t += dt;
        if (!this.capture.boom && this.capture.t > 0.42) {
          this.capture.boom = true;
          const g = this.level.goal;
          this.fx.burst(g[0], g[1], 36, 460, "#ffffff", 4, 0.7);
          this.fx.ring(g[0], g[1], 120, COL.mint, 0.6, 5);
          this.addTrauma(0.25);
        }
      }
    }
    this.fx.update(sdt);
  }

  private stepPhysics(sdt: number) {
    this.acc += sdt;
    let n = 0;
    while (this.acc >= DT && this.ballActive && n < 10) {
      const r = stepBall(this.ball, this.world, this.onHit);
      this.acc -= DT;
      n++;
      if (r === 1) {
        this.goalReached();
        return;
      }
      if (r === 2) {
        this.shotLost();
        return;
      }
    }
    if (n >= 10) this.acc = 0;
    const b = this.ball;
    const a = clamp(this.acc / DT, 0, 1);
    this.ix = b.px + (b.x - b.px) * a;
    this.iy = b.py + (b.y - b.py) * a;
    this.trailHead = (this.trailHead + 1) % TRAIL;
    this.trailX[this.trailHead] = this.ix;
    this.trailY[this.trailHead] = this.iy;
    if (this.trailLen < TRAIL) this.trailLen++;
    if (Math.random() < 0.5) this.fx.glowDot(this.ix, this.iy, 0.3, 4, COL.cyan);
  }

  private updateAim(dt: number) {
    if (!this.canFire()) {
      this.rotHold = this.powHold = 0;
      return;
    }
    const k = this.keys;
    const l = k.has("ArrowLeft") || k.has("KeyA");
    const r = k.has("ArrowRight") || k.has("KeyD");
    const u = k.has("ArrowUp") || k.has("KeyW");
    const d = k.has("ArrowDown") || k.has("KeyS");
    if (l !== r) {
      this.rotHold += dt;
      const sp = 0.22 + Math.min(1, this.rotHold / 0.8) * 1.0;
      this.angle = clamp(this.angle + (r ? 1 : -1) * sp * dt, A_MIN, A_MAX);
      this.pvDirty = true;
      this.bannerT = Math.max(this.bannerT, 2.6);
    } else this.rotHold = 0;
    if (u !== d) {
      this.powHold += dt;
      const sp = 0.3 + Math.min(1, this.powHold / 0.8) * 0.7;
      this.power = clamp(this.power + (u ? 1 : -1) * sp * dt, 0.05, 1);
      this.pvDirty = true;
      this.bannerT = Math.max(this.bannerT, 2.6);
    } else this.powHold = 0;
  }

  // ------------------------------------------------------------ input
  private onKeyDown = (e: KeyboardEvent) => {
    const t = e.target as HTMLElement | null;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT")) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.code;
    this.sfx.unlock();
    if (k === "KeyM") {
      this.toggleSound();
      return;
    }
    const confirm = k === "Enter" || k === "Space" || k === "NumpadEnter";
    switch (this.phase) {
      case "menu":
        if (confirm) {
          e.preventDefault();
          this.startGame();
        }
        break;
      case "playing":
        if (confirm) {
          e.preventDefault();
          if (!e.repeat) this.fire();
        } else if (k === "KeyP" || k === "Escape") {
          e.preventDefault();
          this.pause();
        } else if (k === "KeyR") {
          if (!e.repeat) this.restartLevel();
        } else if (k.startsWith("Arrow") || k === "KeyA" || k === "KeyD" || k === "KeyW" || k === "KeyS") {
          e.preventDefault();
          this.keys.add(k);
        }
        break;
      case "paused":
        if (k === "KeyP" || k === "Escape" || confirm) {
          e.preventDefault();
          this.resume();
        } else if (k === "KeyR") this.restartLevel();
        break;
      case "clear":
        if (confirm) {
          e.preventDefault();
          if (!e.repeat) this.nextLevel();
        }
        break;
      case "gameover":
        if (confirm || k === "KeyR") {
          e.preventDefault();
          if (!e.repeat) this.startGame();
        } else if (k === "Escape") this.toMenu();
        break;
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
  };

  private onBlur = () => {
    this.keys.clear();
    this.drag = null;
    if (this.phase === "playing") this.pause();
  };

  private onVis = () => {
    if (document.hidden && this.phase === "playing") this.pause();
  };

  private onPointerDown = (e: PointerEvent) => {
    this.sfx.unlock();
    if (this.phase !== "playing" || !this.canFire()) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    this.drag = { id: e.pointerId, sx: e.clientX, sy: e.clientY, cx: e.clientX, cy: e.clientY, dist: 0 };
    try {
      this.canvas.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    this.bannerT = Math.max(this.bannerT, 2.6);
    e.preventDefault();
  };

  private onPointerMove = (e: PointerEvent) => {
    const d = this.drag;
    if (!d || e.pointerId !== d.id) return;
    d.cx = e.clientX;
    d.cy = e.clientY;
    const dx = (e.clientX - d.sx) / this.scale;
    const dy = (e.clientY - d.sy) / this.scale;
    const dist = Math.hypot(dx, dy);
    d.dist = dist;
    if (dist >= 6) {
      this.angle = clamp(Math.atan2(-dy, -dx), A_MIN, A_MAX);
      this.power = clamp((dist - 14) / (DRAG_MAX - 14), 0.04, 1);
      this.pvDirty = true;
    }
    e.preventDefault();
  };

  private onPointerUp = (e: PointerEvent) => {
    const d = this.drag;
    if (!d || e.pointerId !== d.id) return;
    this.drag = null;
    if (d.dist >= DRAG_MIN) this.fire();
  };

  private onPointerCancel = () => {
    this.drag = null;
  };

  // ------------------------------------------------------------ layout
  private resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    this.dpr = dpr;
    this.vw = vw;
    this.vh = vh;
    this.canvas.width = Math.round(vw * dpr);
    this.canvas.height = Math.round(vh * dpr);
    this.canvas.style.width = vw + "px";
    this.canvas.style.height = vh + "px";
    const availH = Math.max(100, vh - TOP_PAD - BOTTOM_PAD);
    this.scale = Math.min((vw - 4) / W, availH / H);
    this.offX = (vw - W * this.scale) / 2;
    this.offY = TOP_PAD + (availH - H * this.scale) / 2;
    this.buildBg();
    this.buildPanel();
    this.dirty = true;
  };

  private buildBg() {
    const { vw, vh, dpr } = this;
    const c = this.bg;
    c.width = Math.round(vw * dpr);
    c.height = Math.round(vh * dpr);
    const g = c.getContext("2d")!;
    g.scale(dpr, dpr);
    const R = Math.max(vw, vh);
    const gr = g.createRadialGradient(vw / 2, vh * 0.42, 0, vw / 2, vh * 0.42, R * 0.85);
    gr.addColorStop(0, "#221258");
    gr.addColorStop(0.55, "#0e0831");
    gr.addColorStop(1, "#04020f");
    g.fillStyle = gr;
    g.fillRect(0, 0, vw, vh);
    const blobs: [number, number, number, string, number][] = [
      [0.12, 0.18, 0.55, COL.mag, 0.13],
      [0.9, 0.78, 0.6, COL.cyan, 0.11],
      [0.78, 0.12, 0.45, COL.violet, 0.16],
      [0.1, 0.85, 0.4, COL.violet, 0.12],
    ];
    for (const [bx, by, br, col, a] of blobs) {
      const rr = R * br;
      const bgr = g.createRadialGradient(vw * bx, vh * by, 0, vw * bx, vh * by, rr);
      bgr.addColorStop(0, col);
      bgr.addColorStop(1, col + "00");
      g.globalAlpha = a;
      g.fillStyle = bgr;
      g.fillRect(0, 0, vw, vh);
    }
    g.globalAlpha = 1;
    let s = 987654;
    const rn = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 170; i++) {
      const x = rn() * vw;
      const y = rn() * vh;
      const big = rn() < 0.08;
      g.globalAlpha = 0.2 + rn() * 0.65;
      g.fillStyle = rn() < 0.2 ? "#9deaff" : rn() < 0.2 ? "#ffc4f4" : "#ffffff";
      g.beginPath();
      g.arc(x, y, big ? 1.5 : 0.35 + rn() * 0.9, 0, TAU);
      g.fill();
    }
    g.globalAlpha = 1;
  }

  private panelPath(g: CanvasRenderingContext2D) {
    const r = 24;
    g.beginPath();
    g.moveTo(1.5, H - 1.5);
    g.lineTo(1.5, r);
    g.arcTo(1.5, 1.5, r, 1.5, r - 1.5);
    g.lineTo(W - r, 1.5);
    g.arcTo(W - 1.5, 1.5, W - 1.5, r, r - 1.5);
    g.lineTo(W - 1.5, H - 1.5);
  }

  private buildPanel() {
    const c = this.panel;
    const s = this.scale * this.dpr;
    c.width = Math.max(2, Math.ceil(W * s));
    c.height = Math.max(2, Math.ceil(H * s));
    const g = c.getContext("2d")!;
    g.setTransform(c.width / W, 0, 0, c.height / H, 0, 0);
    this.panelPath(g);
    g.closePath();
    const fill = g.createLinearGradient(0, 0, 0, H);
    fill.addColorStop(0, "rgba(22,13,62,0.9)");
    fill.addColorStop(1, "rgba(9,5,30,0.93)");
    g.fillStyle = fill;
    g.fill();
    g.save();
    g.clip();
    g.strokeStyle = "rgba(130,170,255,0.065)";
    g.lineWidth = 1;
    g.beginPath();
    for (let x = 50; x < W; x += 50) {
      g.moveTo(x, 0);
      g.lineTo(x, H);
    }
    for (let y = 50; y < H; y += 50) {
      g.moveTo(0, y);
      g.lineTo(W, y);
    }
    g.stroke();
    const vg = g.createLinearGradient(0, H - 90, 0, H);
    vg.addColorStop(0, "rgba(255,50,120,0)");
    vg.addColorStop(1, "rgba(255,50,120,0.2)");
    g.fillStyle = vg;
    g.fillRect(0, H - 90, W, 90);
    g.restore();
    this.panelPath(g);
    g.strokeStyle = "rgba(61,233,255,0.14)";
    g.lineWidth = 12;
    g.stroke();
    g.strokeStyle = "rgba(61,233,255,0.9)";
    g.lineWidth = 3;
    g.stroke();
    g.setLineDash([12, 9]);
    g.strokeStyle = "rgba(255,80,140,0.75)";
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(1.5, H - 1.5);
    g.lineTo(W - 1.5, H - 1.5);
    g.stroke();
    g.setLineDash([]);
  }

  // ------------------------------------------------------------ render
  private render() {
    const ctx = this.ctx;
    const dpr = this.dpr;
    const demo = this.phase === "menu";
    const L = demo ? DEMO_LEVEL : this.level;
    const w = demo ? this.demoWorld : this.world;
    const T = this.time;
    const tr = this.trauma * this.trauma;
    const sx = (Math.random() * 2 - 1) * tr * 18;
    const sy = (Math.random() * 2 - 1) * tr * 18;
    const sr = (Math.random() * 2 - 1) * tr * 0.03;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#050312";
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, sx * dpr * 0.4, sy * dpr * 0.4);
    ctx.drawImage(this.bg, 0, 0, this.vw, this.vh);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.translate(this.offX + sx + (W * this.scale) / 2, this.offY + sy + (H * this.scale) / 2);
    ctx.rotate(sr);
    ctx.scale(this.scale, this.scale);
    ctx.translate(-W / 2, -H / 2);
    ctx.drawImage(this.panel, 0, 0, W, H);

    this.drawEdges(ctx);
    this.drawWells(ctx, L, T);
    this.drawPortals(ctx, L, T);
    if (!demo) {
      this.drawGoal(ctx, L, T);
      this.drawStars(ctx, L, w, T);
    }
    this.drawSegs(ctx, L, w, T);
    this.drawBumpers(ctx, L);
    if (demo) this.drawDemoBalls(ctx);
    else {
      this.drawLauncher(ctx, L, T);
      this.drawPreview(ctx, L);
      this.drawDragHint(ctx);
      this.drawBall(ctx);
      this.drawStatus(ctx, L);
    }
    this.fx.drawAdditive(ctx);
    this.fx.drawSolid(ctx);
    this.fx.drawPopups(ctx, FONT);
    if (!demo && this.phase !== "gameover") {
      this.drawBanner(ctx);
      this.drawTutorial(ctx, T);
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (this.flash > 0.01) {
      ctx.globalAlpha = this.flash * 0.55;
      ctx.fillStyle = this.flashCol;
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      ctx.globalAlpha = 1;
    }
  }

  private drawEdges(ctx: CanvasRenderingContext2D) {
    const e = this.edgeFlash;
    if (e[0] + e[1] + e[2] + e[3] <= 0) return;
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = COL.cyan;
    ctx.lineWidth = 6;
    ctx.lineCap = "round";
    const lines: [number, number, number, number][] = [
      [2, 20, 2, H - 20],
      [W - 2, 20, W - 2, H - 20],
      [20, 2, W - 20, 2],
    ];
    for (let i = 0; i < 3; i++) {
      if (e[i] <= 0) continue;
      ctx.globalAlpha = e[i] * 0.9;
      ctx.beginPath();
      ctx.moveTo(lines[i][0], lines[i][1]);
      ctx.lineTo(lines[i][2], lines[i][3]);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }

  private drawWells(ctx: CanvasRenderingContext2D, L: LevelDef, T: number) {
    if (!L.wells.length) return;
    for (const wl of L.wells) {
      const att = wl.k > 0;
      const col = att ? COL.violet : COL.red;
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 0.2;
      ctx.drawImage(glow(col), wl.x - wl.r, wl.y - wl.r, wl.r * 2, wl.r * 2);
      ctx.globalAlpha = 0.7;
      ctx.drawImage(glow(col), wl.x - 38, wl.y - 38, 76, 76);
      ctx.strokeStyle = col;
      ctx.lineWidth = 2;
      for (let j = 0; j < 4; j++) {
        const f = (T * 0.4 + j / 4) % 1;
        const rad = att ? wl.r * (1 - f) : wl.r * f;
        ctx.globalAlpha = Math.sin(f * Math.PI) * 0.55;
        ctx.beginPath();
        ctx.arc(wl.x, wl.y, Math.max(1, rad), 0, TAU);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      if (att) {
        ctx.fillStyle = "#05020f";
        ctx.beginPath();
        ctx.arc(wl.x, wl.y, 15, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = col;
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.7;
        for (let k = 0; k < 3; k++) {
          const a = T * 2.2 + (k * TAU) / 3;
          ctx.beginPath();
          ctx.arc(wl.x, wl.y, 24, a, a + 1.1);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      } else {
        ctx.strokeStyle = col;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(wl.x, wl.y, 12 + Math.sin(T * 5) * 2, 0, TAU);
        ctx.stroke();
        ctx.fillStyle = "#ffd0d8";
        ctx.beginPath();
        ctx.arc(wl.x, wl.y, 4, 0, TAU);
        ctx.fill();
      }
    }
  }

  private drawPortals(ctx: CanvasRenderingContext2D, L: LevelDef, T: number) {
    for (let i = 0; i < L.portals.length; i++) {
      const p = L.portals[i];
      const pulse = this.portalPulse[i] || 0;
      for (let k = 0; k < 2; k++) {
        const pt = k === 0 ? p.a : p.b;
        const col = k === 0 ? COL.blue : COL.orange;
        const r = PORTAL_R * (1 + pulse * 0.35);
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = 0.55 + pulse * 0.4;
        ctx.drawImage(glow(col), pt[0] - r * 2.2, pt[1] - r * 2.2, r * 4.4, r * 4.4);
        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = 1;
        ctx.fillStyle = "#050a22";
        ctx.beginPath();
        ctx.arc(pt[0], pt[1], r * 0.82, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = col;
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        for (let j = 0; j < 3; j++) {
          const a = T * (k ? -3 : 3) + (j * TAU) / 3;
          ctx.beginPath();
          ctx.arc(pt[0], pt[1], r, a, a + 1.4);
          ctx.stroke();
        }
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.6;
        for (let j = 0; j < 2; j++) {
          const a = T * (k ? 4.5 : -4.5) + j * Math.PI;
          ctx.beginPath();
          ctx.arc(pt[0], pt[1], r * 0.55, a, a + 1.6);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
    }
  }

  private drawGoal(ctx: CanvasRenderingContext2D, L: LevelDef, T: number) {
    const [gx, gy] = L.goal;
    const pulse = 1 + Math.sin(T * 3) * 0.06;
    const cap = this.capture ? Math.min(1, this.capture.t * 2) : 0;
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.3 + cap * 0.5;
    ctx.drawImage(glow(COL.mint), gx - 95 * pulse, gy - 95 * pulse, 190 * pulse, 190 * pulse);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "rgba(82,255,176,0.06)";
    ctx.beginPath();
    ctx.arc(gx, gy, GOAL_ASSIST, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#06201a";
    ctx.beginPath();
    ctx.arc(gx, gy, 26, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = COL.mint;
    ctx.lineWidth = 3;
    ctx.setLineDash([11, 8]);
    ctx.lineDashOffset = -T * 28;
    ctx.beginPath();
    ctx.arc(gx, gy, 32 * pulse, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(gx, gy, 20, 0, TAU);
    ctx.stroke();
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = COL.mint;
    ctx.beginPath();
    ctx.arc(gx, gy, 6 + Math.sin(T * 5) * 1.5, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  private drawStars(ctx: CanvasRenderingContext2D, L: LevelDef, w: World, T: number) {
    for (let i = 0; i < L.stars.length; i++) {
      if (!w.starAlive[i]) continue;
      const x = L.stars[i][0];
      const y = L.stars[i][1] + Math.sin(T * 3 + i * 1.7) * 2.5;
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 0.55 + Math.sin(T * 4 + i) * 0.15;
      ctx.drawImage(glow(COL.gold), x - 30, y - 30, 60, 60);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      starPath(ctx, x, y, 14, 6.2, Math.sin(T * 1.5 + i) * 0.35);
      ctx.fillStyle = COL.gold;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#fff6c2";
      ctx.stroke();
    }
  }

  private drawSegs(ctx: CanvasRenderingContext2D, L: LevelDef, w: World, T: number) {
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (let i = 0; i < L.segs.length; i++) {
      if (!w.segAlive[i]) continue;
      const s = L.segs[i];
      const o = segOffset(s, w.time);
      const col = s.kind === "crystal" ? COL.orange : s.kind === "mover" ? COL.violet : COL.cyan;
      const fl = this.segFlash[i] || 0;
      ctx.beginPath();
      ctx.moveTo(s.x1 + o.x, s.y1 + o.y);
      ctx.lineTo(s.x2 + o.x, s.y2 + o.y);
      ctx.strokeStyle = col;
      ctx.globalAlpha = 0.13 + fl * 0.45;
      ctx.lineWidth = s.w + 14;
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.lineWidth = s.w;
      ctx.stroke();
      ctx.strokeStyle = s.kind === "crystal" ? "#2b1208" : s.kind === "mover" ? "#170b33" : "#081233";
      ctx.lineWidth = s.w - 5;
      ctx.stroke();
      if (fl > 0) {
        ctx.strokeStyle = "#ffffff";
        ctx.globalAlpha = fl * 0.65;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      if (s.kind !== "wall") {
        ctx.strokeStyle = s.kind === "crystal" ? "rgba(255,225,190,0.75)" : "rgba(214,190,255,0.7)";
        ctx.lineWidth = 2;
        ctx.setLineDash(s.kind === "crystal" ? [3, 13] : [10, 10]);
        ctx.lineDashOffset = s.kind === "mover" ? -T * 36 : 0;
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }

  private drawBumpers(ctx: CanvasRenderingContext2D, L: LevelDef) {
    for (let i = 0; i < L.bumpers.length; i++) {
      const b = L.bumpers[i];
      const pulse = this.bumpPulse[i] || 0;
      const sc = 1 + pulse * 0.3;
      const r = b.r * sc;
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 0.4 + pulse * 0.5;
      ctx.drawImage(glow(COL.mag), b.x - r * 2, b.y - r * 2, r * 4, r * 4);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "#2c0a3a";
      ctx.beginPath();
      ctx.arc(b.x, b.y, r, 0, TAU);
      ctx.fill();
      if (pulse > 0) {
        ctx.fillStyle = `rgba(255,255,255,${pulse * 0.55})`;
        ctx.fill();
      }
      ctx.strokeStyle = COL.mag;
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,63,209,0.5)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(b.x, b.y, r * 0.58, 0, TAU);
      ctx.stroke();
      ctx.fillStyle = "#ffd0f4";
      ctx.beginPath();
      ctx.arc(b.x, b.y, r * 0.2, 0, TAU);
      ctx.fill();
    }
  }

  private drawOrb(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, glowA = 0.9) {
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = glowA;
    ctx.drawImage(glow(COL.cyan), x - 22 * s, y - 22 * s, 44 * s, 44 * s);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(x, y, BALL_R * s, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#aef6ff";
    ctx.beginPath();
    ctx.arc(x + BALL_R * s * 0.15, y + BALL_R * s * 0.2, BALL_R * s * 0.62, 0, TAU);
    ctx.fill();
  }

  private drawDemoBalls(ctx: CanvasRenderingContext2D) {
    for (const b of this.demoBalls) this.drawOrb(ctx, b.x, b.y, 1);
  }

  private drawLauncher(ctx: CanvasRenderingContext2D, L: LevelDef, T: number) {
    const [x, y] = L.start;
    const ready = this.canFire();
    const dx = Math.cos(this.angle);
    const dy = Math.sin(this.angle);
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.35;
    ctx.drawImage(glow(COL.cyan), x - 56, y - 56, 112, 112);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.lineCap = "round";
    // barrel
    const tip = MUZZLE + 3 - this.recoil * 9;
    ctx.beginPath();
    ctx.moveTo(x + dx * 8, y + dy * 8);
    ctx.lineTo(x + dx * tip, y + dy * tip);
    ctx.strokeStyle = COL.cyan;
    ctx.lineWidth = 14;
    ctx.stroke();
    ctx.strokeStyle = "#081233";
    ctx.lineWidth = 8;
    ctx.stroke();
    // base
    ctx.fillStyle = "#081233";
    ctx.beginPath();
    ctx.arc(x, y, 22, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = COL.cyan;
    ctx.lineWidth = 3.5;
    ctx.stroke();
    if (ready) {
      // power gauge
      const a0 = Math.PI * 0.75;
      const sweep = Math.PI * 1.5;
      ctx.lineWidth = 5;
      ctx.strokeStyle = "rgba(255,255,255,0.14)";
      ctx.beginPath();
      ctx.arc(x, y, 38, a0, a0 + sweep);
      ctx.stroke();
      ctx.strokeStyle = `hsl(${185 + this.power * 125} 100% 62%)`;
      ctx.beginPath();
      ctx.arc(x, y, 38, a0, a0 + sweep * this.power);
      ctx.stroke();
      this.drawOrb(ctx, x, y, 0.9 + Math.sin(T * 5) * 0.06, 0.6);
    }
  }

  private drawPreview(ctx: CanvasRenderingContext2D, L: LevelDef) {
    if (!this.canFire() || L.preview <= 0) return;
    if (this.drag && this.drag.dist < DRAG_MIN) return;
    if (this.pvDirty) {
      this.pvN = previewPath(L, this.world.segAlive, this.angle, this.power, L.preview);
      this.pvDirty = false;
    }
    const n = this.pvN;
    if (n < 3) return;
    ctx.globalCompositeOperation = "lighter";
    const bands = 5;
    for (let b = 0; b < bands; b++) {
      const i0 = 1 + Math.floor(((n - 1) * b) / bands);
      const i1 = 1 + Math.floor(((n - 1) * (b + 1)) / bands);
      const r = 3.6 - b * 0.55;
      ctx.fillStyle = `rgba(190,255,255,${0.9 - b * 0.16})`;
      ctx.beginPath();
      for (let i = i0; i < i1 && i < n; i++) {
        const x = previewBuf[i * 2];
        const y = previewBuf[i * 2 + 1];
        ctx.moveTo(x + r, y);
        ctx.arc(x, y, r, 0, TAU);
      }
      ctx.fill();
    }
    const ex = previewBuf[(n - 1) * 2];
    const ey = previewBuf[(n - 1) * 2 + 1];
    ctx.strokeStyle = "rgba(190,255,255,0.45)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(ex, ey, 7, 0, TAU);
    ctx.stroke();
    ctx.globalCompositeOperation = "source-over";
  }

  private drawDragHint(ctx: CanvasRenderingContext2D) {
    const d = this.drag;
    if (!d) return;
    const ax = (d.sx - this.offX) / this.scale;
    const ay = (d.sy - this.offY) / this.scale;
    const cx = (d.cx - this.offX) / this.scale;
    const cy = (d.cy - this.offY) / this.scale;
    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 8]);
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(cx, cy);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.beginPath();
    ctx.arc(ax, ay, 12, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.beginPath();
    ctx.arc(cx, cy, 20, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  private drawBall(ctx: CanvasRenderingContext2D) {
    // trail
    if (this.trailLen > 1) {
      ctx.globalCompositeOperation = "lighter";
      ctx.lineCap = "round";
      ctx.strokeStyle = COL.cyan;
      const len = this.trailLen;
      let px = this.trailX[this.trailHead];
      let py = this.trailY[this.trailHead];
      for (let k = 1; k < len; k++) {
        const idx = (this.trailHead - k + TRAIL * 2) % TRAIL;
        const x = this.trailX[idx];
        const y = this.trailY[idx];
        const f = 1 - k / len;
        ctx.globalAlpha = f * 0.75;
        ctx.lineWidth = BALL_R * 1.9 * f;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(x, y);
        ctx.stroke();
        px = x;
        py = y;
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    }
    if (this.capture) {
      const c = this.capture;
      if (c.t > 0.45) return;
      const p = c.t / 0.45;
      const e = p * p;
      const g = this.level.goal;
      const ang = p * 7;
      const rad = (1 - e) * Math.hypot(c.x0 - g[0], c.y0 - g[1]);
      const base = Math.atan2(c.y0 - g[1], c.x0 - g[0]);
      this.drawOrb(ctx, g[0] + Math.cos(base + ang) * rad, g[1] + Math.sin(base + ang) * rad, 1 - e * 0.7, 1);
      return;
    }
    if (!this.ballActive) return;
    const b = this.ball;
    const sp = Math.hypot(b.vx, b.vy);
    ctx.save();
    ctx.translate(this.ix, this.iy);
    if (this.squash > 0.12) {
      ctx.rotate(this.squashAng);
      ctx.scale(1 - this.squash * 0.32, 1 + this.squash * 0.22);
    } else {
      const st = 1 + Math.min(0.45, sp / 2600);
      ctx.rotate(Math.atan2(b.vy, b.vx));
      ctx.scale(st, 1 / Math.sqrt(st));
    }
    this.drawOrb(ctx, 0, 0, 1, 1);
    ctx.restore();
  }

  private drawStatus(ctx: CanvasRenderingContext2D, L: LevelDef) {
    // remaining shots (bottom-left)
    for (let i = 0; i < L.shots; i++) {
      const x = 26 + i * 20;
      const y = 882;
      if (i < this.shotsLeft) {
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = 0.6;
        ctx.drawImage(glow(COL.cyan), x - 12, y - 12, 24, 24);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = "#e8feff";
        ctx.beginPath();
        ctx.arc(x, y, 5.5, 0, TAU);
        ctx.fill();
      } else {
        ctx.strokeStyle = "rgba(61,233,255,0.35)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, TAU);
        ctx.stroke();
      }
    }
    // stars collected (bottom-right)
    const n = L.stars.length;
    for (let i = 0; i < n; i++) {
      const x = W - 26 - i * 24;
      const got = i < this.starsGot;
      starPath(ctx, x, 880, 9, 4, 0);
      if (got) {
        ctx.fillStyle = COL.gold;
        ctx.fill();
      } else {
        ctx.strokeStyle = "rgba(255,216,74,0.35)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }
  }

  private drawBanner(ctx: CanvasRenderingContext2D) {
    const t = this.bannerT;
    const D = 3.4;
    if (t > D || this.phase === "clear") return;
    const a = Math.min(1, t / 0.25) * Math.min(1, (D - t) / 0.7);
    const slide = 1 - Math.min(1, t / 0.4);
    const ease = slide * slide;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    const cy = 300 + ease * 40;
    // dark pill behind the text for legibility
    {
      const bx = W / 2 - 272;
      const by = cy - 34;
      const bw = 544;
      const bh = 162;
      const r = 26;
      ctx.beginPath();
      ctx.moveTo(bx + r, by);
      ctx.arcTo(bx + bw, by, bx + bw, by + bh, r);
      ctx.arcTo(bx + bw, by + bh, bx, by + bh, r);
      ctx.arcTo(bx, by + bh, bx, by, r);
      ctx.arcTo(bx, by, bx + bw, by, r);
      ctx.closePath();
      ctx.fillStyle = "rgba(6,3,26,0.62)";
      ctx.fill();
      ctx.strokeStyle = "rgba(181,123,255,0.35)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    const hint =
      this.levelIndex === 0 && !this.coarse ? "اسحب للخلف ثم أفلت — أو الأسهم + مسافة" : this.level.hint;
    ctx.font = `800 22px ${FONT}`;
    ctx.fillStyle = COL.violet;
    ctx.fillText(`المرحلة ${this.levelIndex + 1} / ${LEVELS.length}`, W / 2, cy);
    ctx.font = `900 48px ${FONT}`;
    ctx.lineWidth = 8;
    ctx.strokeStyle = "rgba(6,3,24,0.9)";
    ctx.strokeText(this.level.name, W / 2, cy + 52, 540);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(this.level.name, W / 2, cy + 52, 540);
    ctx.font = `700 21px ${FONT}`;
    ctx.lineWidth = 5;
    ctx.strokeText(hint, W / 2, cy + 100, 500);
    ctx.fillStyle = "#c9d6ff";
    ctx.fillText(hint, W / 2, cy + 100, 500);
    ctx.restore();
  }

  private drawTutorial(ctx: CanvasRenderingContext2D, T: number) {
    if (this.levelIndex !== 0 || this.shotsUsed > 0 || this.drag || !this.canFire()) return;
    const cyc = (T % 2) / 2;
    const p = Math.min(1, cyc / 0.65);
    const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
    const fade = cyc < 0.85 ? 1 : 1 - (cyc - 0.85) / 0.15;
    const x = 470;
    const y = 690 + e * 110;
    ctx.save();
    ctx.globalAlpha = 0.85 * fade;
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.lineWidth = 3;
    ctx.setLineDash([7, 9]);
    ctx.beginPath();
    ctx.moveTo(x, 690);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(255,255,255,0.28)";
    ctx.beginPath();
    ctx.arc(x, 690, 14, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.beginPath();
    ctx.arc(x, y, 24, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 0.95;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `800 20px ${FONT}`;
    ctx.fillStyle = "#ffffff";
    ctx.fillText("اسحب للأسفل ثم أفلت", x - 10, 850);
    ctx.restore();
  }
}
