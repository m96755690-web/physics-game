import type { HudState } from "../game/types";
import { AnimatedNumber } from "./AnimatedNumber";
import { HeartIcon, PauseIcon, SoundIcon } from "./icons";

interface Props {
  hud: HudState;
  sound: boolean;
  onPause: () => void;
  onSound: () => void;
}

export function Hud({ hud, sound, onPause, onSound }: Props) {
  return (
    <div
      className="pointer-events-none fixed top-0 left-1/2 z-20 -translate-x-1/2"
      style={{
        width: "min(100vw, calc((100dvh - 78px) * 600 / 900))",
        paddingTop: "max(8px, env(safe-area-inset-top))",
        paddingInline: 8,
      }}
    >
      <div className="flex h-[52px] items-center justify-between gap-2">
        {/* score */}
        <div className="flex min-w-0 flex-col leading-none">
          <span className="text-[10px] font-bold tracking-wide text-cyan-200/70">النقاط</span>
          <AnimatedNumber
            value={hud.score}
            pop
            className="mt-0.5 text-[26px] font-black text-white drop-shadow-[0_0_10px_rgba(61,233,255,0.7)]"
          />
        </div>

        {/* level + lives */}
        <div className="flex flex-col items-center gap-1">
          <div className="rounded-full border border-fuchsia-400/40 bg-fuchsia-500/10 px-3 py-0.5 text-[13px] font-extrabold whitespace-nowrap text-fuchsia-100">
            المرحلة {hud.level}
            <span className="text-fuchsia-300/60"> / {hud.levels}</span>
          </div>
          <div className="flex gap-1" aria-label={`الأرواح ${hud.lives}`}>
            {Array.from({ length: 3 }).map((_, i) => (
              <HeartIcon key={i} size={17} filled={i < hud.lives} className={i < hud.lives ? "drop-shadow-[0_0_6px_rgba(255,63,122,0.8)]" : ""} />
            ))}
          </div>
        </div>

        {/* buttons */}
        <div className="pointer-events-auto flex gap-2">
          <button className="icon-btn" onClick={onSound} aria-label="الصوت" title="الصوت (M)">
            <SoundIcon on={sound} />
          </button>
          <button className="icon-btn" onClick={onPause} aria-label="إيقاف مؤقت" title="إيقاف (P)">
            <PauseIcon />
          </button>
        </div>
      </div>
    </div>
  );
}
