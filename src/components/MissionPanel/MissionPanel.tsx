import { AnimatePresence, motion } from 'framer-motion';
import { ChevronRight, Lightbulb, Target } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';
import type { LogTone, MissionApi } from '../../hooks/useMission';
import { ConceptCard } from '../ConceptCard/Overlays';

const TONE_CLASS: Record<LogTone, string> = {
  sys: 'text-slate-200',
  good: 'text-ok',
  warn: 'text-noise',
  bad: 'text-bad',
  note: 'text-mute',
};

const TONE_MARK: Record<LogTone, string> = {
  sys: '›',
  good: '✓',
  warn: '!',
  bad: '✕',
  note: '·',
};

interface MissionPanelProps {
  mission: MissionApi;
  /** Extra content under the objective, e.g. a Continue button. */
  children?: ReactNode;
}

export function MissionPanel({ mission, children }: MissionPanelProps) {
  const scroller = useRef<HTMLDivElement>(null);
  const { log, stepIndex } = mission;

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [log.length]);

  // Stay pinned to the newest line when the panel shrinks (e.g. a concept card opens below it).
  useEffect(() => {
    const el = scroller.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => el.scrollTo({ top: el.scrollHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="panel flex min-h-0 flex-1 flex-col p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="panel-title">Lab log</span>
          <span className="font-mono text-[0.65rem] text-mute">
            step {stepIndex + 1}/{mission.level.steps.length}
          </span>
        </div>
        <div ref={scroller} className="scrollbar-thin -mr-2 min-h-[8rem] flex-1 space-y-2 overflow-y-auto pr-2" aria-live="polite">
          <AnimatePresence initial={false}>
            {log.map((line, i) => {
              const current = line.stepIndex === stepIndex;
              const newest = i >= log.length - 4;
              return (
                <motion.p
                  key={line.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: current ? 1 : 0.45, y: 0 }}
                  transition={{ duration: 0.35, delay: newest ? Math.max(0, (i - (log.length - 4))) * 0.12 : 0 }}
                  className={`flex gap-2 text-[0.9rem] leading-relaxed ${TONE_CLASS[line.tone]}`}
                >
                  <span className="mt-px shrink-0 font-mono text-xs leading-relaxed text-signal/70" aria-hidden>
                    {TONE_MARK[line.tone]}
                  </span>
                  <span>{line.text}</span>
                </motion.p>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      <ConceptCard id={mission.concept} onClose={mission.dismissConcept} />

      <div className="panel p-4 max-lg:order-first">
        <div className="mb-2 flex items-center gap-2">
          <Target size={14} className="text-noise" aria-hidden />
          <span className="panel-title !text-noise/90">Objective</span>
        </div>
        <AnimatePresence mode="wait">
          <motion.p
            key={mission.objective}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 6 }}
            data-objective
            className="font-display text-[1.02rem] leading-snug font-medium text-white"
          >
            {mission.objective}
          </motion.p>
        </AnimatePresence>
        {children && <div className="mt-3">{children}</div>}
        <HintBox mission={mission} />
      </div>
    </div>
  );
}

function HintBox({ mission }: { mission: MissionApi }) {
  const { hints, hintLevel } = mission;
  if (hints.length === 0) return null;
  const labels = ['Clue', 'Stronger clue', 'Almost the answer'];
  return (
    <div className="mt-3 border-t border-white/5 pt-3">
      <AnimatePresence initial={false}>
        {hints.slice(0, hintLevel).map((h, i) => (
          <motion.div key={`${mission.stepId}-${i}`} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mb-2 overflow-hidden">
            <div className="rounded-lg border border-noise/15 bg-noise/[0.06] px-3 py-2 text-sm text-amber-100/90">
              <span className="mr-1.5 font-mono text-[0.62rem] tracking-widest text-noise uppercase">{labels[i]}</span>
              {h}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
      {hintLevel < hints.length && (
        <button
          type="button"
          onClick={mission.nextHint}
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 font-mono text-[0.7rem] tracking-[0.14em] text-mute uppercase transition hover:bg-white/5 hover:text-noise"
        >
          <Lightbulb size={13} aria-hidden />
          {hintLevel === 0 ? 'Need a hint?' : 'Another hint'}
          <ChevronRight size={12} aria-hidden />
        </button>
      )}
    </div>
  );
}
