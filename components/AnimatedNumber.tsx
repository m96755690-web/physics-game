import { useEffect, useRef, useState } from "react";

interface Props {
  value: number;
  className?: string;
  /** play a pop animation each time the value increases */
  pop?: boolean;
  /** count-up from zero on mount */
  fromZero?: boolean;
  duration?: number;
}

export function AnimatedNumber({ value, className = "", pop = false, fromZero = false, duration }: Props) {
  const [shown, setShown] = useState(fromZero ? 0 : value);
  const cur = useRef(fromZero ? 0 : value);
  const [bump, setBump] = useState(0);

  useEffect(() => {
    const from = cur.current;
    const to = value;
    if (from === to) return;
    if (pop && to > from) setBump((b) => b + 1);
    const start = performance.now();
    const dur = duration ?? Math.min(1000, 260 + Math.abs(to - from) * 0.7);
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / dur);
      const e = 1 - Math.pow(1 - k, 3);
      const v = Math.round(from + (to - from) * e);
      cur.current = v;
      setShown(v);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, pop, duration]);

  return (
    <span key={bump} className={`inline-block tabular-nums ${bump > 0 ? "anim-score" : ""} ${className}`}>
      {shown.toLocaleString("en-US")}
    </span>
  );
}
