import { motion } from 'framer-motion';
import { ArrowRight, Check, Map as MapIcon, RotateCcw, Star, X } from 'lucide-react';
import type { Rating } from '../../game/scoring/score';
import { rankOf } from '../../game/progression/ranks';
import type { LevelDef, RankId } from '../../types/game';

interface LevelCompleteProps {
  level: LevelDef;
  rating: Rating;
  newRank: RankId | null;
  onNext: () => void;
  onReplay: () => void;
  onMap: () => void;
  nextLabel: string;
}

export function LevelComplete({ level, rating, newRank, onNext, onReplay, onMap, nextLabel }: LevelCompleteProps) {
  const rank = newRank ? rankOf(newRank) : null;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-ink-950/85 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label="Mission complete"
    >
      <motion.div
        initial={{ y: 24, scale: 0.97 }}
        animate={{ y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 22 }}
        className="panel my-auto w-full max-w-3xl !bg-ink-900/95 p-6 md:p-8"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[0.7rem] tracking-[0.24em] text-ok uppercase">Mission {level.code} complete</p>
            <h2 className="mt-1 font-display text-3xl font-semibold text-white md:text-4xl">{level.title}</h2>
          </div>
          <div className="flex flex-col items-center rounded-xl border border-signal/25 bg-signal/[0.06] px-4 py-2">
            <span className="font-mono text-[0.6rem] tracking-[0.2em] text-mute uppercase">Fragment recovered</span>
            <motion.span
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.35, type: 'spring' }}
              className="font-mono text-4xl font-bold text-signal"
            >
              {level.letter}
            </motion.span>
          </div>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div>
            <h3 className="panel-title mb-3">You just learned</h3>
            <ul className="space-y-2">
              {level.learned.map((l, i) => (
                <motion.li
                  key={l}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + i * 0.12 }}
                  className="flex gap-2.5 text-[0.95rem] leading-snug text-slate-200"
                >
                  <Check size={17} className="mt-0.5 shrink-0 text-ok" aria-hidden />
                  {l}
                </motion.li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="panel-title mb-3">Quantum repair rating</h3>
            <div className="flex gap-1" aria-label={`${rating.stars} out of 5 stars`}>
              {Array.from({ length: 5 }).map((_, i) => (
                <motion.span key={i} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.4 + i * 0.08, type: 'spring' }}>
                  <Star size={26} className={i < rating.stars ? 'fill-noise text-noise' : 'text-white/15'} aria-hidden />
                </motion.span>
              ))}
            </div>
            {rating.checks.length > 0 ? (
              <ul className="mt-3 space-y-1.5">
                {rating.checks.map((c) => (
                  <li key={c.key} className="flex items-center justify-between gap-3 rounded-lg bg-white/[0.03] px-3 py-1.5 text-sm">
                    <span className="flex items-center gap-2 text-slate-200">
                      {c.passed ? <Check size={15} className="text-ok" aria-label="passed" /> : <X size={15} className="text-bad" aria-label="missed" />}
                      {c.label}
                    </span>
                    <span className="text-right text-xs text-mute">{c.note}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-mute">Discovery mission: nothing to score, only things to notice.</p>
            )}
          </div>
        </div>

        {rank && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="mt-6 flex items-center gap-4 rounded-xl border border-probe/30 bg-probe/[0.07] p-4"
          >
            <div className="grid size-11 shrink-0 place-items-center rounded-full border border-probe/50 font-mono text-lg text-probe">◆</div>
            <div>
              <p className="font-mono text-[0.65rem] tracking-[0.2em] text-probe uppercase">Rank up</p>
              <p className="font-display text-lg font-semibold text-white">{rank.title}</p>
              <p className="text-sm text-slate-300">{rank.mastered}</p>
            </div>
          </motion.div>
        )}

        <div className="mt-7 flex flex-wrap gap-3">
          <button
            type="button"
            autoFocus
            onClick={onNext}
            className="inline-flex items-center gap-2 rounded-xl bg-signal px-5 py-3 font-mono text-[0.78rem] font-bold tracking-[0.16em] text-ink-950 uppercase transition hover:brightness-110"
          >
            {nextLabel} <ArrowRight size={16} aria-hidden />
          </button>
          <button
            type="button"
            onClick={onReplay}
            className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-3 font-mono text-[0.72rem] font-semibold tracking-[0.16em] text-slate-200 uppercase transition hover:bg-white/5"
          >
            <RotateCcw size={15} aria-hidden /> Replay
          </button>
          <button
            type="button"
            onClick={onMap}
            className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-3 font-mono text-[0.72rem] font-semibold tracking-[0.16em] text-slate-200 uppercase transition hover:bg-white/5"
          >
            <MapIcon size={15} aria-hidden /> Missions
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
