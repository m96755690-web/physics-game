import type { ScoreEntry } from "../game/types";
import { TrophyIcon } from "./icons";

interface Props {
  scores: ScoreEntry[];
  highlight?: ScoreEntry | null;
  limit?: number;
}

const medal = ["#ffd84a", "#d7e0f5", "#ff9d4d"];

export function ScoreTable({ scores, highlight, limit = 10 }: Props) {
  const rows = scores.slice(0, limit);
  if (!rows.length) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-8 text-center text-sm text-indigo-200/70">
        <TrophyIcon size={34} className="mx-auto mb-2 text-indigo-300/60" />
        لا توجد نتائج بعد — كن الأول على اللوحة!
      </div>
    );
  }
  return (
    <ol className="flex flex-col gap-1.5">
      {rows.map((e, i) => {
        const mine = highlight && e.date === highlight.date && e.score === highlight.score;
        return (
          <li
            key={e.date + "-" + i}
            style={{ animationDelay: `${i * 45}ms` }}
            className={`anim-row flex items-center gap-3 rounded-xl border px-3 py-2 ${
              mine
                ? "border-cyan-300/80 bg-cyan-400/15 shadow-[0_0_18px_rgba(61,233,255,0.35)]"
                : "border-white/10 bg-white/5"
            }`}
          >
            <span
              className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[13px] font-black text-[#06031a]"
              style={{ background: i < 3 ? medal[i] : "rgba(255,255,255,0.16)", color: i < 3 ? "#06031a" : "#cbd5ff" }}
            >
              {i + 1}
            </span>
            <span className="min-w-0 flex-1 truncate text-right font-bold text-white">{e.name}</span>
            <span className="shrink-0 text-xs text-indigo-200/70">{e.won ? "🏆 أكمل" : `م ${e.level}`}</span>
            <span className="w-20 shrink-0 text-left text-lg font-black text-cyan-200 tabular-nums">
              {e.score.toLocaleString("en-US")}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
