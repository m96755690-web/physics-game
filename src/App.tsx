import { useCallback, useEffect, useRef, useState } from "react";
import { Game } from "./game/Game";
import { LEVELS } from "./game/levels";
import { getName, getSound, loadScores, saveScore, setName } from "./game/storage";
import type { ClearInfo, GameOverInfo, HudState, Phase, ScoreEntry } from "./game/types";
import { Hud } from "./components/Hud";
import { Menu } from "./components/Menu";
import { PauseMenu } from "./components/PauseMenu";
import { LevelClear } from "./components/LevelClear";
import { GameOver } from "./components/GameOver";

interface OverState {
  info: GameOverInfo;
  rank: number;
  entry: ScoreEntry;
  scores: ScoreEntry[];
}

const INITIAL_HUD: HudState = {
  score: 0,
  level: 1,
  levels: LEVELS.length,
  lives: 3,
  shotsLeft: 0,
  shotsMax: 0,
  stars: 0,
  starsTotal: 0,
  name: "",
};

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const [phase, setPhase] = useState<Phase>("menu");
  const [hud, setHud] = useState<HudState>(INITIAL_HUD);
  const [clear, setClear] = useState<ClearInfo | null>(null);
  const [over, setOver] = useState<OverState | null>(null);
  const [sound, setSound] = useState(getSound());
  const [scores, setScores] = useState<ScoreEntry[]>(() => loadScores());
  const [name, setNameState] = useState(() => {
    const n = getName();
    return n === "لاعب" ? "" : n;
  });

  useEffect(() => {
    const g = new Game(canvasRef.current!, {
      onPhase: setPhase,
      onHud: setHud,
      onClear: setClear,
      onSound: setSound,
      onGameOver: (info) => {
        const entry: ScoreEntry = { name: getName(), score: info.score, level: info.level, won: info.won, date: Date.now() };
        const res = saveScore(entry);
        setScores(res.scores);
        setOver({ info, rank: res.rank, entry, scores: res.scores });
      },
    });
    gameRef.current = g;
    return () => {
      g.destroy();
      gameRef.current = null;
    };
  }, []);

  const game = () => gameRef.current;
  const onName = useCallback((n: string) => {
    setNameState(n);
    setName(n);
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden bg-ink">
      <canvas ref={canvasRef} className="absolute inset-0" />

      {phase !== "menu" && phase !== "gameover" && (
        <Hud hud={hud} sound={sound} onPause={() => game()?.pause()} onSound={() => game()?.toggleSound()} />
      )}

      {phase === "menu" && (
        <Menu
          scores={scores}
          name={name}
          onName={onName}
          onStart={() => game()?.startGame()}
          sound={sound}
          onSound={() => game()?.toggleSound()}
          levels={LEVELS.length}
        />
      )}

      {phase === "paused" && (
        <PauseMenu
          onResume={() => game()?.resume()}
          onRestartLevel={() => game()?.restartLevel()}
          onNewGame={() => game()?.startGame()}
          onMenu={() => game()?.toMenu()}
          sound={sound}
          onSound={() => game()?.toggleSound()}
        />
      )}

      {phase === "clear" && clear && <LevelClear key={clear.level} info={clear} onNext={() => game()?.nextLevel()} />}

      {phase === "gameover" && over && (
        <GameOver
          key={over.entry.date}
          info={over.info}
          rank={over.rank}
          entry={over.entry}
          scores={over.scores}
          levels={LEVELS.length}
          onRestart={() => game()?.startGame()}
          onMenu={() => game()?.toMenu()}
        />
      )}
    </div>
  );
}
