import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { CONCEPTS } from '../../data/concepts';
import { EMPTY_PROGRESS } from '../../game/progression/progress';
import { useGame } from '../../hooks/useGame';
import type { ConceptId } from '../../types/game';

export function Modal({ open, title, onClose, children, wide }: { open: boolean; title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-ink-950/80 p-4 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 16, scale: 0.98 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: 8, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={`panel !bg-ink-900/95 flex max-h-[88vh] w-full flex-col ${wide ? 'max-w-3xl' : 'max-w-lg'}`}
          >
            <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
              <h2 className="font-display text-xl font-semibold text-white">{title}</h2>
              <button type="button" onClick={onClose} aria-label="Close" autoFocus className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <div className="scrollbar-thin overflow-y-auto px-5 py-4">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Toggle({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl px-1 py-3">
      <span>
        <span className="block font-medium text-white">{label}</span>
        <span className="block text-sm text-mute">{desc}</span>
      </span>
      <input type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="relative mt-1 h-6 w-11 shrink-0 rounded-full bg-white/10 transition peer-checked:bg-signal/70 peer-focus-visible:outline-2 peer-focus-visible:outline-signal after:absolute after:top-0.5 after:left-0.5 after:size-5 after:rounded-full after:bg-white after:transition peer-checked:after:translate-x-5" />
    </label>
  );
}

export function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { settings, updateSettings, setProgress } = useGame();
  return (
    <Modal open={open} title="Settings" onClose={onClose}>
      <div className="divide-y divide-white/5">
        <Toggle label="Sound" desc="Subtle interface sounds. Never needed to play." checked={!settings.muted} onChange={(v) => updateSettings({ muted: !v })} />
        <div className="py-3">
          <span className="block font-medium text-white">Motion</span>
          <span className="block text-sm text-mute">Reduced motion removes travelling pulses and flashes.</span>
          <div className="mt-2 flex gap-2" role="radiogroup" aria-label="Motion">
            {(['system', 'reduced', 'full'] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={settings.motion === m}
                onClick={() => updateSettings({ motion: m })}
                className={`rounded-lg border px-3 py-1.5 font-mono text-xs tracking-wider uppercase ${
                  settings.motion === m ? 'border-signal bg-signal/10 text-signal' : 'border-white/10 text-slate-300 hover:bg-white/5'
                }`}
              >
                {m === 'system' ? 'Follow system' : m}
              </button>
            ))}
          </div>
        </div>
        <Toggle
          label="Relaxed storm"
          desc="More time between noise pulses in the final mission."
          checked={settings.relaxed}
          onChange={(v) => updateSettings({ relaxed: v })}
        />
        <Toggle
          label="Unlock all missions"
          desc="Open any mission directly from the map. Handy for replaying or reviewing."
          checked={settings.unlockAll}
          onChange={(v) => updateSettings({ unlockAll: v })}
        />
        <div className="py-3">
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Erase all progress, ranks and recovered letters?')) setProgress(() => EMPTY_PROGRESS);
            }}
            className="rounded-lg border border-bad/30 px-3 py-2 font-mono text-xs tracking-wider text-bad uppercase hover:bg-bad/10"
          >
            Reset progress
          </button>
        </div>
      </div>
    </Modal>
  );
}

const NOTE_ORDER: ConceptId[] = [
  'qubit',
  'xError',
  'collapse',
  'majority',
  'noCloning',
  'spread',
  'shield',
  'ancilla',
  'parity',
  'syndrome',
  'correction',
  'nonDestructive',
  'zError',
  'phaseShield',
  'oneShield',
  'shor',
  'blockPhase',
  'threshold',
];

export function FieldNotesModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { progress } = useGame();
  const found = NOTE_ORDER.filter((id) => progress.concepts.includes(id));
  return (
    <Modal open={open} title="Field notes" onClose={onClose} wide>
      <p className="mb-4 text-sm text-mute">
        Every idea you've uncovered so far: {found.length} of {NOTE_ORDER.length}. Locked notes appear as you play.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {NOTE_ORDER.map((id) => {
          const c = CONCEPTS[id];
          const has = progress.concepts.includes(id);
          return (
            <div key={id} className={`rounded-xl border p-3.5 ${has ? 'border-probe/25 bg-probe/[0.05]' : 'border-white/5 bg-white/[0.02]'}`}>
              <h3 className={`font-display font-semibold ${has ? 'text-white' : 'text-white/25'}`}>{has ? c.title : 'Undiscovered'}</h3>
              {has ? (
                <ul className="mt-1.5 space-y-1 text-sm text-slate-300">
                  {c.lines.map((l) => (
                    <li key={l}>{l}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-sm text-white/20">Keep repairing.</p>
              )}
            </div>
          );
        })}
      </div>
    </Modal>
  );
}

export function HowToPlayModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const rows: Array<[string, string]> = [
    ['Your job', 'Quantum messages arrive damaged by noise. Find the damage and repair it, without looking at the message itself.'],
    ['Tools', 'Pick a tool from the bar under the bench, then click a carrier (or press 1, 2, 3). Esc puts the tool down.'],
    ['Helpers ◇', 'Wire helpers to carriers by clicking the sockets on their columns. Running a probe reads the helper, never the carriers.'],
    ['Receiver', 'The dial on the right shows where the message points. A repaired message points at the right letter.'],
    ['Stuck?', 'Each step has three hints, from a gentle nudge to almost the answer. Hints never cost rating.'],
    ['Failure', "Collapsing the message isn't game over. You get a debrief and rewind to try again."],
    ['Missions', 'Missions unlock in order. To jump anywhere, turn on Unlock all missions in Settings.'],
  ];
  return (
    <Modal open={open} title="How to play" onClose={onClose}>
      <dl className="space-y-3">
        {rows.map(([k, v]) => (
          <div key={k} className="grid grid-cols-[6.5rem_1fr] gap-3">
            <dt className="font-mono text-xs tracking-wider text-signal uppercase">{k}</dt>
            <dd className="text-sm text-slate-300">{v}</dd>
          </div>
        ))}
      </dl>
    </Modal>
  );
}
