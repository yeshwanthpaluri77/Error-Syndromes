import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Info, RotateCcw, Sparkles, X, XCircle } from 'lucide-react';
import { CONCEPTS } from '../../data/concepts';
import type { ConceptId, FailureInfo, Feedback } from '../../types/game';

const FEEDBACK_STYLE = {
  info: { icon: Info, cls: 'border-signal/30 bg-[#0b1c1f]/95 text-signal' },
  success: { icon: CheckCircle2, cls: 'border-ok/35 bg-[#0a1e18]/95 text-ok' },
  warn: { icon: AlertTriangle, cls: 'border-noise/35 bg-[#211a0a]/95 text-noise' },
  error: { icon: XCircle, cls: 'border-bad/35 bg-[#231019]/95 text-bad' },
};

export function FeedbackBanner({ feedback, onClose }: { feedback: Feedback | null; onClose: () => void }) {
  return (
    <div className="pointer-events-none absolute inset-x-3 top-3 z-20 flex justify-center md:right-[17%] md:left-[27%]" role="status" aria-live="assertive">
      <AnimatePresence mode="wait">
        {feedback && (
          <motion.div
            key={feedback.id}
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8 }}
            className={`pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-xl border px-4 py-2.5 shadow-2xl backdrop-blur-md ${FEEDBACK_STYLE[feedback.tone].cls}`}
          >
            {(() => {
              const Icon = FEEDBACK_STYLE[feedback.tone].icon;
              return <Icon size={18} className="mt-0.5 shrink-0" aria-hidden />;
            })()}
            <div className="min-w-0">
              <p className="font-mono text-[0.78rem] font-bold tracking-[0.14em] uppercase">{feedback.title}</p>
              {feedback.body && <p className="mt-0.5 text-sm text-slate-200">{feedback.body}</p>}
            </div>
            <button type="button" onClick={onClose} className="ml-1 shrink-0 rounded p-0.5 text-slate-400 hover:text-white" aria-label="Dismiss">
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function ConceptCard({ id, onClose }: { id: ConceptId | null; onClose: () => void }) {
  const concept = id ? CONCEPTS[id] : null;
  return (
    <div>
      <AnimatePresence mode="wait">
        {concept && (
          <motion.div
            key={concept.id}
            initial={{ opacity: 0, height: 0, scale: 0.97 }}
            animate={{ opacity: 1, height: 'auto', scale: 1 }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            className="rounded-2xl border border-probe/35 bg-ink-850 p-4 shadow-[0_20px_60px_-20px_rgba(167,139,250,0.45)]"
            role="dialog"
            aria-label={`Concept discovered: ${concept.title}`}
          >
            <div className="flex items-center gap-2 font-mono text-[0.65rem] tracking-[0.2em] text-probe uppercase">
              <Sparkles size={13} aria-hidden /> Concept discovered
            </div>
            <h3 className="mt-1 font-display text-xl font-semibold text-white">{concept.title}</h3>
            <ul className="mt-2 space-y-1.5">
              {concept.lines.map((l) => (
                <li key={l} className="text-[0.88rem] leading-snug text-slate-300">
                  {l}
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={onClose}
              className="mt-3 rounded-lg border border-probe/40 px-3 py-1.5 font-mono text-[0.7rem] font-semibold tracking-[0.16em] text-probe uppercase transition hover:bg-probe/10"
            >
              Got it
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function FailureCard({ failure, onRetry }: { failure: FailureInfo | null; onRetry: () => void }) {
  return (
    <AnimatePresence>
      {failure && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-30 flex items-center justify-center rounded-2xl bg-ink-950/75 p-4 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.94, y: 10 }}
            animate={{ scale: 1, y: 0 }}
            className="w-full max-w-md rounded-2xl border border-bad/30 bg-ink-850 p-5 shadow-[0_30px_80px_-30px_rgba(251,113,133,0.5)]"
            role="alertdialog"
            aria-label={failure.title}
          >
            <div className="flex items-center gap-2 font-mono text-[0.68rem] tracking-[0.2em] text-bad uppercase">
              <AlertTriangle size={14} aria-hidden /> Debrief
            </div>
            <h3 className="mt-1 font-display text-2xl font-semibold text-white">{failure.title}</h3>
            <div className="mt-3 space-y-2">
              {failure.lines.map((l, i) => (
                <p key={i} className={i === 0 ? 'font-medium text-slate-100' : 'text-[0.92rem] text-slate-300'}>
                  {l}
                </p>
              ))}
            </div>
            <button
              type="button"
              autoFocus
              onClick={onRetry}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 font-mono text-[0.75rem] font-bold tracking-[0.16em] text-ink-950 uppercase transition hover:bg-signal"
            >
              <RotateCcw size={15} aria-hidden /> {failure.action ?? 'Rewind & retry'}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
