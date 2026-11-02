export const COL = {
  cyan: "#3de9ff",
  mag: "#ff3fd1",
  gold: "#ffd84a",
  mint: "#52ffb0",
  orange: "#ff9d4d",
  violet: "#b57bff",
  red: "#ff5c7a",
  blue: "#4da3ff",
  white: "#ffffff",
};

const cache = new Map<string, HTMLCanvasElement>();
/** Pre-rendered radial glow sprite (cheap alternative to shadowBlur). */
export function glow(color: string): HTMLCanvasElement {
  let c = cache.get(color);
  if (c) return c;
  c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, "#ffffffee");
  gr.addColorStop(0.16, color);
  gr.addColorStop(0.5, color + "50");
  gr.addColorStop(1, color + "00");
  g.fillStyle = gr;
  g.fillRect(0, 0, 64, 64);
  cache.set(color, c);
  return c;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  kind: number; // 0 glow, 1 streak, 2 ring, 3 shard, 4 confetti
  col: string;
  rot: number;
  vr: number;
  drag: number;
  grav: number;
}

interface Popup {
  text: string;
  x: number;
  y: number;
  life: number;
  max: number;
  col: string;
  size: number;
}

const CONFETTI = ["#3de9ff", "#ff3fd1", "#ffd84a", "#52ffb0", "#b57bff", "#ffffff"];
const rnd = (a: number, b: number) => a + Math.random() * (b - a);

export class Fx {
  ps: Particle[] = [];
  idx = 0;
  popups: Popup[] = [];

  constructor(n = 560) {
    for (let i = 0; i < n; i++)
      this.ps.push({ x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, size: 1, kind: 0, col: "#fff", rot: 0, vr: 0, drag: 0, grav: 0 });
  }

  private alloc(): Particle {
    const p = this.ps[this.idx];
    this.idx = (this.idx + 1) % this.ps.length;
    return p;
  }

  private set(
    kind: number,
    x: number,
    y: number,
    vx: number,
    vy: number,
    life: number,
    size: number,
    col: string,
    drag = 1.5,
    grav = 0
  ) {
    const p = this.alloc();
    p.kind = kind;
    p.x = x;
    p.y = y;
    p.vx = vx;
    p.vy = vy;
    p.life = p.max = life;
    p.size = size;
    p.col = col;
    p.drag = drag;
    p.grav = grav;
    p.rot = Math.random() * 6.28;
    p.vr = rnd(-12, 12);
  }

  glowDot(x: number, y: number, life: number, size: number, col: string) {
    this.set(0, x, y, 0, 0, life, size, col, 0, 0);
  }

  burst(x: number, y: number, n: number, speed: number, col: string, size = 5, life = 0.6, grav = 0) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.283;
      const s = speed * rnd(0.25, 1);
      this.set(Math.random() < 0.45 ? 1 : 0, x, y, Math.cos(a) * s, Math.sin(a) * s, life * rnd(0.6, 1.2), size * rnd(0.6, 1.2), col, 2.2, grav);
    }
  }

  cone(x: number, y: number, nx: number, ny: number, n: number, speed: number, spread: number, col: string) {
    const base = Math.atan2(ny, nx);
    for (let i = 0; i < n; i++) {
      const a = base + rnd(-spread, spread);
      const s = speed * rnd(0.3, 1);
      this.set(Math.random() < 0.6 ? 1 : 0, x, y, Math.cos(a) * s, Math.sin(a) * s, rnd(0.25, 0.55), rnd(2, 4.5), col, 2.4, 260);
    }
  }

  ring(x: number, y: number, maxR: number, col: string, life = 0.5, width = 4) {
    this.set(2, x, y, 0, 0, life, maxR, col, 0, 0);
    this.ps[(this.idx + this.ps.length - 1) % this.ps.length].rot = width;
  }

  shards(x: number, y: number, n: number, col: string, speed = 360) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.283;
      const s = speed * rnd(0.3, 1);
      this.set(3, x, y, Math.cos(a) * s, Math.sin(a) * s - 80, rnd(0.5, 1), rnd(4, 9), col, 1.2, 700);
    }
  }

  confetti(x: number, y: number, n: number, speed = 520) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.283;
      const s = speed * rnd(0.2, 1);
      this.set(4, x, y, Math.cos(a) * s, Math.sin(a) * s - 120, rnd(0.9, 1.6), rnd(5, 10), CONFETTI[i % CONFETTI.length], 1.6, 520);
    }
  }

  text(text: string, x: number, y: number, col: string, size = 26) {
    if (this.popups.length > 24) this.popups.shift();
    this.popups.push({ text, x, y, life: 1.0, max: 1.0, col, size });
  }

  clear() {
    for (const p of this.ps) p.life = 0;
    this.popups.length = 0;
  }

  update(dt: number) {
    for (let i = 0; i < this.ps.length; i++) {
      const p = this.ps[i];
      if (p.life <= 0) continue;
      p.life -= dt;
      if (p.kind === 2) continue;
      const d = 1 - p.drag * dt;
      p.vx *= d > 0 ? d : 0;
      p.vy = p.vy * (d > 0 ? d : 0) + p.grav * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
    }
    for (let i = this.popups.length - 1; i >= 0; i--) {
      const q = this.popups[i];
      q.life -= dt;
      q.y -= 46 * dt * (q.life / q.max + 0.3);
      if (q.life <= 0) this.popups.splice(i, 1);
    }
  }

  drawAdditive(ctx: CanvasRenderingContext2D) {
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";
    for (let i = 0; i < this.ps.length; i++) {
      const p = this.ps[i];
      if (p.life <= 0 || p.kind > 2) continue;
      const k = p.life / p.max;
      ctx.globalAlpha = k > 1 ? 1 : k;
      if (p.kind === 0) {
        const s = p.size * (0.35 + 0.65 * k) * 2.2;
        ctx.drawImage(glow(p.col), p.x - s, p.y - s, s * 2, s * 2);
      } else if (p.kind === 1) {
        ctx.strokeStyle = p.col;
        ctx.lineWidth = p.size * (0.3 + 0.7 * k);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 0.04, p.y - p.vy * 0.04);
        ctx.stroke();
      } else {
        const r = p.size * (1 - k * k);
        ctx.strokeStyle = p.col;
        ctx.lineWidth = Math.max(0.5, p.rot * k);
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, 6.283);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }

  drawSolid(ctx: CanvasRenderingContext2D) {
    for (let i = 0; i < this.ps.length; i++) {
      const p = this.ps[i];
      if (p.life <= 0 || p.kind < 3) continue;
      const k = p.life / p.max;
      ctx.globalAlpha = k > 0.5 ? 1 : k * 2;
      ctx.fillStyle = p.col;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      if (p.kind === 3) {
        ctx.beginPath();
        ctx.moveTo(-p.size * 0.6, -p.size * 0.5);
        ctx.lineTo(p.size * 0.7, 0);
        ctx.lineTo(-p.size * 0.2, p.size * 0.6);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.scale(1, Math.cos(p.rot * 2));
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  drawPopups(ctx: CanvasRenderingContext2D, font: string) {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    for (const q of this.popups) {
      const age = q.max - q.life;
      const pop = 1 + 0.7 * Math.max(0, 1 - age / 0.2);
      ctx.globalAlpha = Math.min(1, q.life / 0.35);
      ctx.font = `900 ${q.size * pop}px ${font}`;
      ctx.lineWidth = 5;
      ctx.strokeStyle = "rgba(6,3,24,0.85)";
      ctx.strokeText(q.text, q.x, q.y);
      ctx.fillStyle = q.col;
      ctx.fillText(q.text, q.x, q.y);
    }
    ctx.globalAlpha = 1;
  }
}
