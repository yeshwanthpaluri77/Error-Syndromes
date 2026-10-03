import { motion } from 'framer-motion';
import { Infinity as InfinityIcon, Map as MapIcon } from 'lucide-react';
import { useEffect } from 'react';
import { MessageDial } from '../components/Dial/MessageDial';
import { FINAL_PHRASE_DISPLAY } from '../data/levels';
import { useGame } from '../hooks/useGame';
import { useNav } from '../hooks/useNav';

const LINES = [
  "You didn't read the message.",
  'You diagnosed the damage.',
  'You used indirect evidence.',
  'You extracted a syndrome.',
  'You corrected the error.',
];

const SIX = [
  ['Why not copy it?', 'An unknown quantum state cannot be copied. Physics forbids it.'],
  ['Why not look?', 'Measuring the data forces it to 0 or 1 and destroys the message.'],
  ['Why a helper?', 'An ancilla stores the answer to an indirect question, so the data is never read.'],
  ['What does it ask?', 'Parity: do these qubits agree? Never: what are they?'],
  ['What is a syndrome?', 'The pattern of probe answers. It fingerprints the error, not the message.'],
  ['How is it fixed?', 'Read the fingerprint, apply the same flip to the suspect, touch nothing else.'],
];

export function Finale() {
  const nav = useNav();
  const { setProgress } = useGame();

  useEffect(() => {
    setProgress((p) => ({ ...p, finaleSeen: true }));
  }, [setProgress]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-14">
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-mono text-[0.72rem] tracking-[0.4em] text-ok uppercase">
        Transmission restored
      </motion.p>
      <div className="mt-6 flex flex-wrap justify-center gap-1.5" aria-label={FINAL_PHRASE_DISPLAY}>
        {FINAL_PHRASE_DISPLAY.split('').map((ch, i) =>
          ch === ' ' ? (
            <span key={i} className="w-4" />
          ) : (
            <motion.span
              key={i}
              initial={{ opacity: 0, y: -14, rotateX: 90 }}
              animate={{ opacity: 1, y: 0, rotateX: 0 }}
              transition={{ delay: 0.3 + i * 0.09, type: 'spring', stiffness: 220, damping: 16 }}
              className="grid h-14 w-11 place-items-center rounded-lg border border-signal/30 bg-signal/[0.08] font-mono text-3xl font-bold text-signal shadow-[0_0_24px_-8px_rgba(94,234,212,0.7)] sm:h-16 sm:w-12"
            >
              {ch}
            </motion.span>
          ),
        )}
      </div>

      <div className="mt-10 grid w-full max-w-4xl items-center gap-10 md:grid-cols-[1fr_auto]">
        <div className="space-y-2">
          {LINES.map((l, i) => (
            <motion.p
              key={l}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.6 + i * 0.45 }}
              className="font-display text-2xl text-slate-100 md:text-3xl"
            >
              {l}
            </motion.p>
          ))}
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 4.2 }} className="pt-3 font-display text-2xl font-semibold text-signal md:text-3xl">
            That's the idea behind quantum error correction.
          </motion.p>
        </div>
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1 }} className="mx-auto w-56">
          <MessageDial arrow={{ phi: Math.PI / 4, tone: 'ok' }} highlightPos={3} highlightTone="ok" caption="DELIVERED · INTACT" captionTone="ok" />
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 4.8 }} className="mt-12 w-full max-w-4xl">
        <p className="panel-title mb-3">The whole idea, in six lines</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {SIX.map(([q, a]) => (
            <div key={q} className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
              <p className="font-mono text-[0.7rem] tracking-[0.14em] text-signal uppercase">{q}</p>
              <p className="mt-1 text-[0.92rem] text-slate-300">{a}</p>
            </div>
          ))}
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={nav.toEndless}
            className="inline-flex items-center gap-2 rounded-xl bg-signal px-6 py-3.5 font-mono text-sm font-bold tracking-[0.2em] text-ink-950 uppercase transition hover:brightness-110"
          >
            <InfinityIcon size={18} aria-hidden /> Endless repair mode
          </button>
          <button
            type="button"
            onClick={nav.toMap}
            className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-5 py-3.5 font-mono text-[0.75rem] tracking-[0.16em] text-slate-200 uppercase transition hover:bg-white/5"
          >
            <MapIcon size={16} aria-hidden /> Mission map
          </button>
        </div>
      </motion.div>
    </div>
  );
}
