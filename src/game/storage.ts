import type { ScoreEntry } from "./types";

const K_SCORES = "mpz.scores.v1";
const K_NAME = "mpz.name.v1";
const K_SOUND = "mpz.sound.v1";
export const MAX_SCORES = 10;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable — ignore */
  }
}

export function loadScores(): ScoreEntry[] {
  const list = read<ScoreEntry[]>(K_SCORES, []);
  return Array.isArray(list) ? list.filter((e) => e && typeof e.score === "number") : [];
}

/** Saves an entry, returns the updated table and the entry's rank (1-based) or 0 if it didn't qualify. */
export function saveScore(entry: ScoreEntry): { scores: ScoreEntry[]; rank: number } {
  const all = [...loadScores(), entry].sort((a, b) => b.score - a.score || a.date - b.date);
  const top = all.slice(0, MAX_SCORES);
  const rank = top.indexOf(entry) + 1;
  write(K_SCORES, top);
  return { scores: top, rank };
}

export const getName = (): string => (read<string>(K_NAME, "") || "").trim() || "لاعب";
export const setName = (n: string) => write(K_NAME, n.slice(0, 14));
export const getSound = (): boolean => read<boolean>(K_SOUND, true);
export const setSound = (v: boolean) => write(K_SOUND, v);
export const bestScore = (): number => loadScores().reduce((m, e) => Math.max(m, e.score), 0);
