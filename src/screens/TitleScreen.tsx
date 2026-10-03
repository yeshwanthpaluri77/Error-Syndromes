import { motion } from 'framer-motion';
import { HelpCircle, Map as MapIcon, Play, Settings } from 'lucide-react';
import { LEVELS } from '../data/levels';
import { nextLevelId } from '../game/progression/progress';
import { useGame } from '../hooks/useGame';
import { useNav } from '../hooks/useNav';
import { Logo, TransmissionTracker } from '../components/HUD/TopBar';
import { sfx } from '../utils/audio';

export function TitleScreen() {
  const { progress } = useGame();
  const nav = useNav();
  const started = Object.keys(progress.completed).length > 0;
  const next = nextLevelId(progress);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-12">
      <BackgroundSignal />
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="relative z-10 flex flex-col items-center text-center">
        <Logo size={64} />
        <p className="mt-6 font-mono text-[0.7rem] tracking-[0.4em] text-signal/80 uppercase">Error syndromes &amp; parity probes</p>
        <h1 className="mt-3 font-display text-5xl font-semibold tracking-[0.06em] text-white uppercase sm:text-6xl md:text-7xl">
          Quantum
          <br className="sm:hidden" /> Repair Lab
        </h1>
        <p className="mt-5 max-w-md text-lg text-slate-300">
          The message is broken. <span className="text-white">Don't look inside.</span> Find out why.
        </p>

        <button
          type="button"
          autoFocus
          onClick={() => {
            sfx.success();
            nav.toLevel(started ? next : 0);
          }}
          className="group mt-10 inline-flex items-center gap-3 rounded-2xl bg-signal px-8 py-4 font-mono text-sm font-bold tracking-[0.24em] text-ink-950 uppercase shadow-[0_0_40px_-8px_rgba(94,234,212,0.6)] transition hover:brightness-110"
        >
          <Play size={18} className="fill-ink-950" aria-hidden />
          {started ? `Continue · Mission ${LEVELS[next].code}` : 'Start repair'}
        </button>

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {started && (
            <TitleLink onClick={nav.toMap} icon={<MapIcon size={15} />}>
              Missions
            </TitleLink>
          )}
          <TitleLink onClick={nav.openHelp} icon={<HelpCircle size={15} />}>
            How to play
          </TitleLink>
          <TitleLink onClick={nav.openSettings} icon={<Settings size={15} />}>
            Settings
          </TitleLink>
        </div>

        {started && (
          <div className="mt-10 flex flex-col items-center gap-2">
            <span className="font-mono text-[0.62rem] tracking-[0.3em] text-mute uppercase">Recovered transmission</span>
            <TransmissionTracker />
          </div>
        )}
      </motion.div>
    </div>
  );
}

function TitleLink({ children, icon, onClick }: { children: string; icon: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 font-mono text-[0.72rem] tracking-[0.16em] text-slate-300 uppercase transition hover:border-white/25 hover:bg-white/5 hover:text-white"
    >
      {icon}
      {children}
    </button>
  );
}

function BackgroundSignal() {
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-60" preserveAspectRatio="none" viewBox="0 0 1200 800" aria-hidden>
      {[300, 400, 500].map((y, i) => (
        <g key={y}>
          <line x1={0} y1={y} x2={1200} y2={y} stroke="rgba(94,234,212,0.07)" strokeWidth={1.5} />
          <motion.circle
            r={3}
            cy={y}
            fill="rgba(94,234,212,0.8)"
            initial={{ cx: -20 }}
            animate={{ cx: 1220 }}
            transition={{ duration: 9 + i * 2, repeat: Infinity, ease: 'linear', delay: i * 1.7 }}
          />
        </g>
      ))}
      <motion.line
        x1={760}
        x2={760}
        y1={250}
        y2={550}
        stroke="rgba(251,191,36,0.25)"
        strokeWidth={2}
        animate={{ opacity: [0, 0, 0.9, 0, 0] }}
        transition={{ duration: 6, repeat: Infinity, times: [0, 0.6, 0.62, 0.66, 1] }}
      />
    </svg>
  );
}
