import type { LevelDef } from "./types";
import { RAW_LEVELS } from "./levelDefs";
import { STARS } from "./stars";

export const LEVELS: LevelDef[] = RAW_LEVELS.map((l, i) => ({ ...l, stars: STARS[i] ?? [] }));

/** Attract-mode arena used behind the main menu. */
export const DEMO_LEVEL: LevelDef = {
  name: "demo",
  hint: "",
  start: [300, 830],
  goal: [-900, -900],
  shots: 0,
  gravity: 0,
  preview: 0,
  closed: true,
  bounce: 1,
  stars: [],
  portals: [],
  wells: [{ x: 300, y: 450, r: 200, k: 700 }],
  bumpers: [
    { x: 130, y: 220, r: 30 },
    { x: 470, y: 260, r: 26 },
    { x: 150, y: 640, r: 26 },
    { x: 460, y: 700, r: 32 },
    { x: 300, y: 130, r: 22 },
  ],
  segs: [
    { x1: 60, y1: 450, x2: 190, y2: 400, w: 12, kind: "wall" },
    { x1: 410, y1: 480, x2: 540, y2: 430, w: 12, kind: "wall" },
  ],
};
