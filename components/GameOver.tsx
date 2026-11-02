import type { GameOverInfo, ScoreEntry } from "../game/types";
import { AnimatedNumber } from "./AnimatedNumber";
import { HomeIcon, RestartIcon, TrophyIcon } from "./icons";
import { ScoreTable } from "./ScoreTable";

interface Props {
  info: GameOverInfo;
  rank: number;
  entry: ScoreEntry;
  scores: ScoreEntry[];
  levels: number;
  onRestart: () => void;
  onMenu: () => void;
}

export function GameOver({ info, rank, entry, scores, levels, onRestart, onMenu }: Props) {
  const record = rank === 1;
  return (
    <div className="overlay z-30 bg-[#050312]/78">
      <div className="panel anim-pop flex w-full max-w-md flex-col gap-4 p-5">
        <div className="text-center">
          <h2
            className={`text-4xl font-black ${
              info.won ? "text-emerald-300 drop-shadow-[0_0_16px_rgba(82,255,176,0.7)]" : "text-rose-300 drop-shadow-[0_0_16px_rgba(255,92,122,0.6)]"
            }`}
          >
            {info.won ? "أكملت كل المراحل!" : "انتهت اللعبة"}
          </h2>
          <p className="mt-1 text-sm text-indigo-200/80">
            {info.won ? `عقل فذّ! أنهيت ${levels} مرحلة` : `وصلت إلى المرحلة ${info.level} من ${levels}`}
          </p>
        </div>

        <div className="rounded-2xl border border-cyan-300/40 bg-cyan-300/10 py-3 text-center">
          <div className="text-xs font-bold tracking-wide text-cyan-100/70">النتيجة النهائية</div>
          <AnimatedNumber
            value={info.score}
            fromZero
            duration={1100}
            className="text-5xl font-black text-white drop-shadow-[0_0_14px_rgba(61,233,255,0.8)]"
          />
          {record ? (
            <div className="anim-pop mx-auto mt-2 flex w-fit items-center gap-2 rounded-full bg-amber-300 px-4 py-1 text-sm font-black text-[#2a1a00]">
              <TrophyIcon size={18} /> رقم قياسي جديد!
            </div>
          ) : rank > 0 ? (
            <div className="mt-2 text-sm font-extrabold text-amber-200">دخلت لوحة الصدارة — المركز #{rank}</div>
          ) : (
            <div className="mt-2 text-sm text-indigo-200/70">لم تدخل لوحة الصدارة هذه المرة</div>
          )}
        </div>

        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-extrabold text-indigo-100">
            <TrophyIcon size={18} className="text-amber-300" /> أفضل النتائج
          </div>
          <ScoreTable scores={scores} highlight={rank > 0 ? entry : null} limit={5} />
        </div>

        <div className="grid grid-cols-[1fr_auto] gap-3">
          <button className="btn btn-primary text-lg" onClick={onRestart}>
            <RestartIcon size={22} />
            العب مجدداً
          </button>
          <button className="btn btn-ghost" onClick={onMenu} aria-label="القائمة" title="القائمة (Esc)">
            <HomeIcon size={22} />
          </button>
        </div>
        <p className="-mt-1 hidden text-center text-xs text-indigo-300/60 [@media(hover:hover)]:block">
          <span className="kbd">Enter</span> / <span className="kbd">R</span> إعادة فورية · <span className="kbd">Esc</span> القائمة
        </p>
      </div>
    </div>
  );
}
