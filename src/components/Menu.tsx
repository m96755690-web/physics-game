import { useState } from "react";
import type { ScoreEntry } from "../game/types";
import { ArrowIcon, HelpIcon, Logo, PlayIcon, SoundIcon, TrophyIcon } from "./icons";
import { ScoreTable } from "./ScoreTable";

interface Props {
  scores: ScoreEntry[];
  name: string;
  onName: (n: string) => void;
  onStart: () => void;
  sound: boolean;
  onSound: () => void;
  levels: number;
}

type View = "main" | "scores" | "help";

function Dot({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-1.5 h-3.5 w-3.5 shrink-0 rounded-full" style={{ background: color, boxShadow: `0 0 10px ${color}` }} />
      <span className="text-[15px] leading-relaxed text-indigo-100/90">{children}</span>
    </li>
  );
}

export function Menu({ scores, name, onName, onStart, sound, onSound, levels }: Props) {
  const [view, setView] = useState<View>("main");
  const best = scores.length ? scores[0].score : 0;

  return (
    <div className="overlay z-30 bg-[radial-gradient(ellipse_at_center,rgba(5,3,18,0.72),rgba(5,3,18,0.88))]">
      {view === "main" && (
        <div className="anim-pop flex w-full max-w-md flex-col items-center gap-5 text-center">
          <Logo size={104} />
          <div>
            <h1 className="title-grad text-[40px] leading-[1.15] font-black sm:text-5xl">ألغاز العقل الفيزيائية</h1>
            <p className="mt-2 text-sm font-bold tracking-[0.35em] text-cyan-200/80" dir="ltr">
              MIND PHYSICS
            </p>
          </div>
          <p className="max-w-sm text-[15px] leading-relaxed text-indigo-100/85">
            صوّب، ارتدّ، وانحنِ بالجاذبية… أدخل الكرة في الهدف الأخضر في {levels} مرحلة تختبر عقلك.
          </p>

          <button className="btn btn-primary w-full max-w-xs py-4 text-xl" onClick={onStart}>
            <PlayIcon size={24} />
            ابدأ اللعب
          </button>

          <div className="grid w-full max-w-xs grid-cols-2 gap-3">
            <button className="btn btn-ghost !px-3 !py-2.5 text-[15px]" onClick={() => setView("scores")}>
              <TrophyIcon size={19} className="text-amber-300" />
              الصدارة
            </button>
            <button className="btn btn-ghost !px-3 !py-2.5 text-[15px]" onClick={() => setView("help")}>
              <HelpIcon size={19} className="text-cyan-300" />
              كيف تلعب؟
            </button>
          </div>

          <div className="flex w-full max-w-xs items-center gap-2 rounded-2xl border border-white/15 bg-white/5 p-2 pe-3">
            <label htmlFor="pname" className="ps-2 text-sm font-bold whitespace-nowrap text-indigo-200/80">
              اسمك
            </label>
            <input
              id="pname"
              value={name}
              maxLength={14}
              onChange={(e) => onName(e.target.value)}
              placeholder="لاعب"
              className="min-w-0 flex-1 rounded-xl bg-black/30 px-3 py-2 text-center text-base font-bold text-white outline-none ring-cyan-300/60 placeholder:text-white/30 focus:ring-2"
            />
            <button className="icon-btn !h-10 !w-10 shrink-0" onClick={onSound} aria-label="الصوت" title="الصوت (M)">
              <SoundIcon on={sound} />
            </button>
          </div>

          {best > 0 && (
            <div className="text-sm font-bold text-amber-200/90">
              أفضل نتيجة: <span className="text-lg font-black text-amber-300 tabular-nums">{best.toLocaleString("en-US")}</span>
            </div>
          )}
          <p className="hidden text-xs text-indigo-300/60 [@media(hover:hover)]:block">
            <span className="kbd">Enter</span> أو <span className="kbd">مسافة</span> للبدء
          </p>
          <p className="hidden text-xs text-amber-200/80 [@media(orientation:landscape)_and_(max-height:520px)]:block">
            للحصول على أفضل تجربة اجعل الجهاز بالوضع العمودي
          </p>
        </div>
      )}

      {view === "scores" && (
        <div className="panel anim-pop w-full max-w-md p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-2xl font-black text-white">
              <TrophyIcon size={26} className="text-amber-300" />
              لوحة الصدارة
            </h2>
            <button className="icon-btn" onClick={() => setView("main")} aria-label="رجوع">
              <ArrowIcon />
            </button>
          </div>
          <ScoreTable scores={scores} />
          <p className="mt-3 text-center text-xs text-indigo-300/60">النتائج محفوظة على جهازك</p>
        </div>
      )}

      {view === "help" && (
        <div className="panel anim-pop w-full max-w-md p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-2xl font-black text-white">
              <HelpIcon size={26} className="text-cyan-300" />
              كيف تلعب؟
            </h2>
            <button className="icon-btn" onClick={() => setView("main")} aria-label="رجوع">
              <ArrowIcon />
            </button>
          </div>

          <div className="mb-3 rounded-2xl border border-cyan-300/30 bg-cyan-300/10 p-3 text-[15px] leading-relaxed">
            <b className="text-cyan-200">باللمس / الماوس:</b> اضغط واسحب <b>للخلف</b> (عكس الاتجاه الذي تريده) ثم أفلت. كلما سحبت أكثر زادت القوة.
            <div className="mt-2">
              <b className="text-cyan-200">بالكيبورد:</b> <span className="kbd">←</span> <span className="kbd">→</span> توجيه ·{" "}
              <span className="kbd">↑</span> <span className="kbd">↓</span> قوة · <span className="kbd">مسافة</span> إطلاق
            </div>
            <div className="mt-2 text-sm text-indigo-200/80">
              <span className="kbd">P</span> إيقاف · <span className="kbd">R</span> إعادة المرحلة · <span className="kbd">M</span> الصوت
            </div>
          </div>

          <ul className="flex flex-col gap-2.5">
            <Dot color="#52ffb0">أدخل الكرة في الدائرة الخضراء لإنهاء المرحلة.</Dot>
            <Dot color="#ffd84a">النجوم +200 — وتتضاعف عند جمع أكثر من نجمة في طلقة واحدة (كومبو).</Dot>
            <Dot color="#ff3fd1">المصدّات الوردية تقذف الكرة بقوة وتمنحك +50.</Dot>
            <Dot color="#ff9d4d">الكريستال البرتقالي ينكسر فقط بالسرعة العالية.</Dot>
            <Dot color="#b57bff">الثقب البنفسجي يجذب الكرة، والأحمر يطردها.</Dot>
            <Dot color="#4da3ff">بوّابتان زرقاء وبرتقالية تنقلان الكرة بينهما.</Dot>
            <Dot color="#3de9ff">الوقت يتجمّد أثناء التصويب، والنقاط المنقّطة تُظهر المسار المتوقع.</Dot>
          </ul>
          <p className="mt-3 text-sm text-indigo-200/80">لديك 3 أرواح — تخسر روحاً عند نفاد الطلقات دون الوصول للهدف.</p>
        </div>
      )}
    </div>
  );
}
