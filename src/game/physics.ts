import type { LevelDef, Seg } from "./types";

export const W = 600;
export const H = 900;
export const BALL_R = 9;
export const DT = 1 / 120;
export const V_MIN = 280;
export const V_MAX = 1050;
export const DAMP = 0.16;
export const GOAL_CAPTURE = 22;
export const GOAL_ASSIST = 62;
export const PORTAL_R = 22;
export const STAR_R = 13;
export const MUZZLE = 26;
export const MAX_LIFE = 13;
export const CRYSTAL_BREAK = 400;
const TAU = Math.PI * 2;

export interface Ball {
  x: number;
  y: number;
  px: number;
  py: number;
  vx: number;
  vy: number;
  t: number;
  slow: number;
  cd: number;
}

export interface World {
  level: LevelDef;
  segAlive: boolean[];
  starAlive: boolean[];
  time: number;
}

export type HitKind = "wall" | "edge" | "bumper" | "crystal" | "portal" | "star";
export type EvFn = (
  kind: HitKind,
  x: number,
  y: number,
  nx: number,
  ny: number,
  speed: number,
  idx: number
) => void;

export const newBall = (): Ball => ({ x: 0, y: 0, px: 0, py: 0, vx: 0, vy: 0, t: 0, slow: 0, cd: 0 });

export const makeWorld = (level: LevelDef): World => ({
  level,
  segAlive: level.segs.map(() => true),
  starAlive: level.stars.map(() => true),
  time: 0,
});

export const launchSpeed = (p: number) => V_MIN + (V_MAX - V_MIN) * p;

export function launchBall(b: Ball, level: LevelDef, angle: number, power: number) {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  b.x = level.start[0] + dx * MUZZLE;
  b.y = level.start[1] + dy * MUZZLE;
  b.px = b.x;
  b.py = b.y;
  const v = launchSpeed(power);
  b.vx = dx * v;
  b.vy = dy * v;
  b.t = 0;
  b.slow = 0;
  b.cd = 0;
}

const off = { x: 0, y: 0, vx: 0, vy: 0 };
export function segOffset(s: Seg, t: number) {
  const m = s.move;
  if (!m) {
    off.x = off.y = off.vx = off.vy = 0;
    return off;
  }
  const w = TAU / m.period;
  const ph = w * t + (m.phase ?? 0);
  const sn = Math.sin(ph);
  const cs = Math.cos(ph);
  off.x = m.ax * sn;
  off.y = m.ay * sn;
  off.vx = m.ax * w * cs;
  off.vy = m.ay * w * cs;
  return off;
}

/**
 * Advance the ball one fixed step.
 * returns 0 = flying, 1 = reached goal, 2 = shot lost
 */
export function stepBall(b: Ball, w: World, ev?: EvFn): number {
  const L = w.level;
  const dt = DT;
  b.px = b.x;
  b.py = b.y;
  w.time += dt;
  b.t += dt;
  if (b.cd > 0) b.cd -= dt;
  const t = w.time;

  // ---- forces
  let ax = 0;
  let ay = L.gravity;
  for (let i = 0; i < L.wells.length; i++) {
    const wl = L.wells[i];
    const dx = wl.x - b.x;
    const dy = wl.y - b.y;
    const d2 = dx * dx + dy * dy;
    if (d2 < wl.r * wl.r) {
      const d = Math.sqrt(d2) || 1;
      const f = 1 - d / wl.r;
      const core = d < 16 ? d / 16 : 1;
      const a = wl.k * f * f * core;
      ax += (dx / d) * a;
      ay += (dy / d) * a;
    }
  }
  {
    const dx = L.goal[0] - b.x;
    const dy = L.goal[1] - b.y;
    const d = Math.sqrt(dx * dx + dy * dy) || 1;
    if (d < GOAL_ASSIST) {
      const a = 900 * (1 - d / GOAL_ASSIST);
      ax += (dx / d) * a;
      ay += (dy / d) * a;
    }
  }
  const k = 1 - DAMP * dt;
  b.vx = (b.vx + ax * dt) * k;
  b.vy = (b.vy + ay * dt) * k;
  const sp0 = b.vx * b.vx + b.vy * b.vy;
  if (sp0 > 1500 * 1500) {
    const s = 1500 / Math.sqrt(sp0);
    b.vx *= s;
    b.vy *= s;
  }

  // ---- integrate
  b.x += b.vx * dt;
  b.y += b.vy * dt;

  const e = L.bounce ?? 0.88;
  const eb = 0.9;

  // ---- segments
  for (let i = 0; i < L.segs.length; i++) {
    if (!w.segAlive[i]) continue;
    const s = L.segs[i];
    const o = segOffset(s, t);
    const x1 = s.x1 + o.x;
    const y1 = s.y1 + o.y;
    const ex = s.x2 - s.x1;
    const ey = s.y2 - s.y1;
    const len2 = ex * ex + ey * ey;
    let u = len2 > 0 ? ((b.x - x1) * ex + (b.y - y1) * ey) / len2 : 0;
    u = u < 0 ? 0 : u > 1 ? 1 : u;
    const cx = x1 + ex * u;
    const cy = y1 + ey * u;
    const dx = b.x - cx;
    const dy = b.y - cy;
    const rr = BALL_R + s.w / 2;
    const d2 = dx * dx + dy * dy;
    if (d2 >= rr * rr) continue;
    const d = Math.sqrt(d2);
    let nx: number;
    let ny: number;
    if (d < 1e-4) {
      const len = Math.sqrt(len2) || 1;
      nx = -ey / len;
      ny = ex / len;
      if (nx * b.vx + ny * b.vy > 0) {
        nx = -nx;
        ny = -ny;
      }
    } else {
      nx = dx / d;
      ny = dy / d;
    }
    const vn = (b.vx - o.vx) * nx + (b.vy - o.vy) * ny;
    if (s.kind === "crystal" && vn < -CRYSTAL_BREAK) {
      w.segAlive[i] = false;
      b.vx *= 0.82;
      b.vy *= 0.82;
      ev?.("crystal", cx, cy, nx, ny, -vn, i);
      continue;
    }
    b.x = cx + nx * rr;
    b.y = cy + ny * rr;
    if (vn < 0) {
      const bounce = -vn < 60 ? 0 : s.kind === "crystal" ? 0.5 : e;
      b.vx -= (1 + bounce) * vn * nx;
      b.vy -= (1 + bounce) * vn * ny;
      b.vx *= 0.998;
      b.vy *= 0.998;
      if (-vn > 90) ev?.("wall", cx + nx * (s.w / 2), cy + ny * (s.w / 2), nx, ny, -vn, i);
    }
  }

  // ---- bumpers
  for (let i = 0; i < L.bumpers.length; i++) {
    const bp = L.bumpers[i];
    const dx = b.x - bp.x;
    const dy = b.y - bp.y;
    const rr = BALL_R + bp.r;
    const d2 = dx * dx + dy * dy;
    if (d2 >= rr * rr) continue;
    const d = Math.sqrt(d2) || 0.001;
    const nx = dx / d;
    const ny = dy / d;
    b.x = bp.x + nx * rr;
    b.y = bp.y + ny * rr;
    const vn = b.vx * nx + b.vy * ny;
    if (vn < 0) {
      const out = Math.max(-vn, 430);
      b.vx += (out - vn) * nx;
      b.vy += (out - vn) * ny;
      ev?.("bumper", bp.x + nx * bp.r, bp.y + ny * bp.r, nx, ny, out, i);
    }
  }

  // ---- borders
  if (b.x < BALL_R) {
    b.x = BALL_R;
    if (b.vx < 0) {
      if (-b.vx > 90) ev?.("edge", 0, b.y, 1, 0, -b.vx, 0);
      b.vx = -b.vx * eb;
    }
  } else if (b.x > W - BALL_R) {
    b.x = W - BALL_R;
    if (b.vx > 0) {
      if (b.vx > 90) ev?.("edge", W, b.y, -1, 0, b.vx, 1);
      b.vx = -b.vx * eb;
    }
  }
  if (b.y < BALL_R) {
    b.y = BALL_R;
    if (b.vy < 0) {
      if (-b.vy > 90) ev?.("edge", b.x, 0, 0, 1, -b.vy, 2);
      b.vy = -b.vy * eb;
    }
  } else if (L.closed && b.y > H - BALL_R) {
    b.y = H - BALL_R;
    if (b.vy > 0) {
      if (b.vy > 90) ev?.("edge", b.x, H, 0, -1, b.vy, 3);
      b.vy = -b.vy * eb;
    }
  }

  // ---- portals
  if (b.cd <= 0) {
    for (let i = 0; i < L.portals.length; i++) {
      const p = L.portals[i];
      for (let k2 = 0; k2 < 2; k2++) {
        const from = k2 === 0 ? p.a : p.b;
        const to = k2 === 0 ? p.b : p.a;
        const dx = b.x - from[0];
        const dy = b.y - from[1];
        if (dx * dx + dy * dy < PORTAL_R * PORTAL_R * 0.45) {
          ev?.("portal", from[0], from[1], to[0], to[1], Math.sqrt(b.vx * b.vx + b.vy * b.vy), i * 2 + k2);
          b.x = to[0];
          b.y = to[1];
          b.px = b.x;
          b.py = b.y;
          b.cd = 0.4;
          k2 = 2;
          i = L.portals.length;
        }
      }
    }
  }

  // ---- stars
  for (let i = 0; i < L.stars.length; i++) {
    if (!w.starAlive[i]) continue;
    const dx = b.x - L.stars[i][0];
    const dy = b.y - L.stars[i][1];
    const rr = BALL_R + STAR_R;
    if (dx * dx + dy * dy < rr * rr) {
      w.starAlive[i] = false;
      ev?.("star", L.stars[i][0], L.stars[i][1], 0, 0, 0, i);
    }
  }

  // ---- goal
  {
    const dx = L.goal[0] - b.x;
    const dy = L.goal[1] - b.y;
    if (dx * dx + dy * dy < GOAL_CAPTURE * GOAL_CAPTURE) return 1;
  }

  // ---- lost conditions
  if (!L.closed) {
    if (b.y > H + 40) return 2;
    const sp = b.vx * b.vx + b.vy * b.vy;
    if (sp < 900) b.slow += dt;
    else b.slow = 0;
    if (b.slow > 0.8) return 2;
    if (b.t > MAX_LIFE) return 2;
  }
  return 0;
}

// ---------------------------------------------------------------- preview
const pvBall = newBall();
const pvWorld: World = { level: null as unknown as LevelDef, segAlive: [], starAlive: new Array(32).fill(false), time: 0 };
export const PREVIEW_MAX_POINTS = 600;
export const previewBuf = new Float32Array(PREVIEW_MAX_POINTS * 2);

/** Simulates the shot with the exact same physics; returns number of points written to previewBuf. */
export function previewPath(level: LevelDef, segAlive: boolean[], angle: number, power: number, maxT: number): number {
  pvWorld.level = level;
  pvWorld.time = 0;
  for (let i = 0; i < level.segs.length; i++) pvWorld.segAlive[i] = segAlive[i];
  launchBall(pvBall, level, angle, power);
  const steps = Math.floor(maxT / DT);
  let n = 0;
  previewBuf[n++] = level.start[0] + Math.cos(angle) * MUZZLE;
  previewBuf[n++] = level.start[1] + Math.sin(angle) * MUZZLE;
  for (let i = 1; i <= steps; i++) {
    const r = stepBall(pvBall, pvWorld);
    if (i % 3 === 0 && n < previewBuf.length - 2) {
      previewBuf[n++] = pvBall.x;
      previewBuf[n++] = pvBall.y;
    }
    if (r !== 0) break;
  }
  return n / 2;
}
