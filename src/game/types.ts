export interface Move {
  ax: number;
  ay: number;
  period: number;
  phase?: number;
}

export type SegKind = "wall" | "crystal" | "mover";

/** A thick line segment (capsule collider). */
export interface Seg {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  w: number;
  kind: SegKind;
  move?: Move;
}

export interface Bumper {
  x: number;
  y: number;
  r: number;
}

/** k > 0 attracts, k < 0 repels. r = radius of influence. */
export interface Well {
  x: number;
  y: number;
  r: number;
  k: number;
}

export interface PortalPair {
  a: [number, number];
  b: [number, number];
}

export interface LevelDef {
  name: string;
  hint: string;
  start: [number, number];
  goal: [number, number];
  shots: number;
  gravity: number;
  /** seconds of simulated trajectory shown while aiming */
  preview: number;
  segs: Seg[];
  bumpers: Bumper[];
  wells: Well[];
  portals: PortalPair[];
  stars: [number, number][];
  /** closed = bottom edge also bounces (menu demo only) */
  closed?: boolean;
  bounce?: number;
}

export type Phase = "menu" | "playing" | "paused" | "clear" | "gameover";

export interface HudState {
  score: number;
  level: number;
  levels: number;
  lives: number;
  shotsLeft: number;
  shotsMax: number;
  stars: number;
  starsTotal: number;
  name: string;
}

export interface ClearRow {
  label: string;
  value: number;
}

export interface ClearInfo {
  level: number;
  name: string;
  rows: ClearRow[];
  total: number;
  stars: number;
  starsTotal: number;
  last: boolean;
}

export interface GameOverInfo {
  score: number;
  level: number;
  won: boolean;
}

export interface ScoreEntry {
  name: string;
  score: number;
  level: number;
  won: boolean;
  date: number;
}
