import { HomeIcon, PlayIcon, RestartIcon, SoundIcon } from "./icons";

interface Props {
  onResume: () => void;
  onRestartLevel: () => void;
  onNewGame: () => void;
  onMenu: () => void;
  sound: boolean;
  onSound: () => void;
}

export function PauseMenu({ onResume, onRestartLevel, onNewGame, onMenu, sound, onSound }: Props) {
  return (
    <div className="overlay z-30 bg-[#050312]/72">
      <div className="panel anim-pop flex w-full max-w-sm flex-col gap-3 p-6">
        <h2 className="mb-1 text-center text-3xl font-black text-white">إيقاف مؤقت</h2>
        <button className="btn btn-primary w-full text-lg" onClick={onResume}>
          <PlayIcon size={22} />
          متابعة
        </button>
        <button className="btn btn-ghost w-full" onClick={onRestartLevel}>
          <RestartIcon size={20} className="text-cyan-300" />
          إعادة المرحلة
          <span className="kbd ms-1">R</span>
        </button>
        <button className="btn btn-ghost w-full" onClick={onSound}>
          <SoundIcon on={sound} className="text-cyan-300" />
          الصوت: {sound ? "مفعّل" : "مكتوم"}
          <span className="kbd ms-1">M</span>
        </button>
        <div className="grid grid-cols-2 gap-3">
          <button className="btn btn-danger !px-3 text-[15px]" onClick={onNewGame}>
            لعبة جديدة
          </button>
          <button className="btn btn-ghost !px-3 text-[15px]" onClick={onMenu}>
            <HomeIcon size={18} />
            القائمة
          </button>
        </div>
        <p className="mt-1 text-center text-xs text-indigo-300/60">
          <span className="kbd">Esc</span> أو <span className="kbd">P</span> للمتابعة
        </p>
      </div>
    </div>
  );
}
