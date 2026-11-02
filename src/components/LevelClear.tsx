import type { ClearInfo } from "../game/types";
import { AnimatedNumber } from "./AnimatedNumber";
import { ArrowIcon, StarIcon } from "./icons";

interface Props {
  info: ClearInfo;
  onNext: () => void;
}

export function LevelClear({ info, onNext }: Props) {
  const n = info.starsTotal;
  const rowDelay = 380;
  const totalDelay = 380 + info.rows.length * 110 + 150;
  return (
    <div className="overlay z-30 items-end bg-gradient-to-t from-[#050312]/80 via-[#050312]/25 to-transparent sm:items-center">
      <div className="panel anim-pop w-full max-w-sm p-5">
        <div className="text-center">
          <div className="text-sm font-extrabold tracking-wide text-emerald-300/90">المرحلة {info.level} مكتملة</div>
          <h2 className="mt-0.5 text-3xl font-black text-white drop-shadow-[0_0_14px_rgba(82,255,176,0.6)]">أحسنت!</h2>
          <div className="text-sm text-indigo-200/80">{info.name}</div>
        </div>

        {n > 0 && (
          <div className="my-3 flex justify-center gap-3" dir="ltr">
            {Array.from({ length: n }).map((_, i) => (
              <div key={i} className={i < info.stars ? "anim-star" : "opacity-60"} style={{ animationDelay: `${150 + i * 170}ms` }}>
                <StarIcon size={46} filled={i < info.stars} />
              </div>
            ))}
          </div>
        )}

        <ul className="flex flex-col gap-1.5">
          {info.rows.map((r, i) => (
            <li
              key={r.label}
              style={{ animationDelay: `${rowDelay + i * 110}ms` }}
              className="anim-row flex items-center justify-between rounded-xl bg-white/6 px-3 py-1.5 text-[15px]"
            >
              <span className="font-bold text-indigo-100">{r.label}</span>
              <span className="font-black text-cyan-200 tabular-nums">+{r.value.toLocaleString("en-US")}</span>
            </li>
          ))}
        </ul>

        <div
          style={{ animationDelay: `${totalDelay}ms` }}
          className="anim-row mt-3 flex items-center justify-between rounded-xl border border-amber-300/50 bg-amber-300/10 px-3 py-2"
        >
          <span className="font-extrabold text-amber-100">إجمالي المرحلة</span>
          <AnimatedNumber value={info.total} fromZero duration={900} className="text-2xl font-black text-amber-300" />
        </div>

        <button className="btn btn-primary mt-4 w-full text-lg" onClick={onNext}>
          {info.last ? "النتيجة النهائية" : "المرحلة التالية"}
          <ArrowIcon className="rotate-0" />
        </button>
        <p className="mt-2 hidden text-center text-xs text-indigo-300/60 [@media(hover:hover)]:block">
          <span className="kbd">Enter</span> أو <span className="kbd">مسافة</span>
        </p>
      </div>
    </div>
  );
}
