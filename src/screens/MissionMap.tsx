import { motion } from 'framer-motion';
import { Infinity as InfinityIcon, Lock, Star } from 'lucide-react';
import { TopBar, TransmissionTracker } from '../components/HUD/TopBar';
import { LEVELS } from '../data/levels';
import { endlessUnlocked, isUnlocked, nextLevelId } from '../game/progression/progress';
import { RANKS, rankIndex } from '../game/progression/ranks';
import { useGame } from '../hooks/useGame';
import { useNav } from '../hooks/useNav';

export function MissionMap() {
  const { progress, settings } = useGame();
  const nav = useNav();
  const next = nextLevelId(progress);
  const rIdx = rankIndex(progress.rank);
  const endlessOpen = endlessUnlocked(progress.completed, settings.unlockAll);

  return (
    <div className="min-h-screen">
      <TopBar center={<span className="font-display font-semibold text-white">Mission map</span>} />
      <main className="mx-auto max-w-6xl px-4 py-8 md:px-6">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="panel-title">Recovered transmission</p>
            <div className="mt-2">
              <TransmissionTracker />
            </div>
            <p className="mt-2 max-w-md text-sm text-mute">Each repaired mission recovers one letter of a message from the source.</p>
          </div>
          <div className="w-full max-w-md">
            <p className="panel-title">Repair rank</p>
            <ol className="mt-2 flex gap-1">
              {RANKS.map((r, i) => (
                <li key={r.id} className="flex-1" title={`${r.title}: ${r.mastered}`}>
                  <div className={`h-1.5 rounded-full ${i <= rIdx ? 'bg-probe' : 'bg-white/10'}`} />
                  <span className={`mt-1.5 block truncate font-mono text-[0.58rem] tracking-wider uppercase ${i === rIdx ? 'text-probe' : 'text-mute/60'}`}>{r.title}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {LEVELS.map((l, i) => {
            const unlocked = isUnlocked(progress, l.id, settings.unlockAll);
            const stars = progress.completed[l.id];
            const isNext = l.id === next && stars === undefined;
            return (
              <motion.button
                key={l.id}
                type="button"
                disabled={!unlocked}
                onClick={() => nav.toLevel(l.id)}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className={`panel group relative flex flex-col p-4 text-left transition ${
                  unlocked ? 'hover:border-signal/40 hover:bg-white/[0.04]' : 'cursor-not-allowed opacity-45'
                } ${isNext ? '!border-signal/50 shadow-[0_0_30px_-12px_rgba(94,234,212,0.6)]' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[0.68rem] tracking-[0.2em] text-mute uppercase">Mission {l.code}</span>
                  {!unlocked ? (
                    <Lock size={14} className="text-mute" aria-label="Locked" />
                  ) : stars !== undefined ? (
                    <span className="flex gap-0.5" aria-label={`${stars} of 5 stars`}>
                      {Array.from({ length: 5 }).map((_, k) => (
                        <Star key={k} size={11} className={k < stars ? 'fill-noise text-noise' : 'text-white/15'} aria-hidden />
                      ))}
                    </span>
                  ) : isNext ? (
                    <span className="rounded bg-signal/15 px-1.5 py-0.5 font-mono text-[0.6rem] tracking-widest text-signal uppercase">Next</span>
                  ) : null}
                </div>
                <h3 className="mt-2 font-display text-lg font-semibold text-white">{l.title}</h3>
                <p className="mt-1 flex-1 text-sm text-slate-400">{l.teaser}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="font-mono text-[0.64rem] tracking-[0.14em] text-signal/80 uppercase">{l.idea}</span>
                  <span className={`grid size-6 place-items-center rounded font-mono text-xs font-bold ${stars !== undefined ? 'bg-signal/15 text-signal' : 'bg-white/5 text-white/20'}`}>
                    {stars !== undefined ? l.letter : '·'}
                  </span>
                </div>
              </motion.button>
            );
          })}
          <button
            type="button"
            disabled={!endlessOpen}
            onClick={nav.toEndless}
            className={`panel flex flex-col p-4 text-left transition sm:col-span-2 lg:col-span-3 ${endlessOpen ? 'hover:border-probe/40 hover:bg-white/[0.04]' : 'cursor-not-allowed opacity-45'}`}
          >
            <div className="flex items-center gap-2 font-mono text-[0.68rem] tracking-[0.2em] text-probe uppercase">
              <InfinityIcon size={15} aria-hidden /> Endless repair
              {!endlessOpen && <Lock size={13} className="text-mute" aria-label="Locked" />}
            </div>
            <h3 className="mt-2 font-display text-lg font-semibold text-white">Random signals, unknown damage</h3>
            <p className="mt-1 text-sm text-slate-400">
              {endlessOpen ? 'Bit shield, phase shield or the nine-qubit shield. Build a repair streak.' : 'Unlocks after Mission 07.'}
            </p>
          </button>
        </div>
      </main>
    </div>
  );
}
