import type { LucideIcon } from 'lucide-react';
import { useEffect } from 'react';
import { sfx } from '../../utils/audio';

export type ActionTone = 'noise' | 'probe' | 'fix' | 'phase' | 'danger' | 'primary' | 'neutral';

export interface ActionDef {
  id: string;
  label: string;
  icon: LucideIcon;
  /** Single-key shortcut, shown on the button. */
  hotkey?: string;
  tone?: ActionTone;
  /** Tools stay selected until used; actions fire immediately. */
  kind?: 'tool' | 'action';
  disabled?: boolean;
  /** Draws attention to the next useful control. */
  pulse?: boolean;
  title?: string;
  onClick?: () => void;
}

const TONES: Record<ActionTone, { base: string; active: string }> = {
  noise: { base: 'text-noise border-noise/25 hover:border-noise/60 hover:bg-noise/10', active: 'bg-noise/15 border-noise text-noise' },
  probe: { base: 'text-probe border-probe/25 hover:border-probe/60 hover:bg-probe/10', active: 'bg-probe/15 border-probe text-probe' },
  fix: { base: 'text-ok border-ok/25 hover:border-ok/60 hover:bg-ok/10', active: 'bg-ok/15 border-ok text-ok' },
  phase: { base: 'text-phase border-phase/25 hover:border-phase/60 hover:bg-phase/10', active: 'bg-phase/15 border-phase text-phase' },
  danger: { base: 'text-bad border-bad/25 hover:border-bad/60 hover:bg-bad/10', active: 'bg-bad/15 border-bad text-bad' },
  primary: { base: 'text-ink-950 bg-signal border-signal hover:brightness-110', active: 'bg-signal border-signal text-ink-950' },
  neutral: { base: 'text-slate-200 border-white/10 hover:border-white/30 hover:bg-white/5', active: 'bg-white/10 border-white/40 text-white' },
};

interface ActionBarProps {
  actions: ActionDef[];
  selected?: string | null;
  onSelect?: (id: string | null) => void;
  /** Number keys 1–n apply the selected tool to qubit n. */
  onQubitKey?: (q: number) => void;
  qubitKeys?: number;
}

function keyOf(hotkey: string) {
  return hotkey === 'Space' ? ' ' : hotkey.toLowerCase();
}

export function ActionBar({ actions, selected, onSelect, onQubitKey, qubitKeys = 0 }: ActionBarProps) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      // Let Space/Enter activate a focused button natively.
      if (target && (target.tagName === 'BUTTON' || target.getAttribute('role') === 'button') && (e.key === ' ' || e.key === 'Enter')) return;
      if (e.key === 'Escape' && selected) {
        onSelect?.(null);
        return;
      }
      const n = Number(e.key);
      if (onQubitKey && n >= 1 && n <= qubitKeys) {
        e.preventDefault();
        onQubitKey(n - 1);
        return;
      }
      const a = actions.find((x) => x.hotkey && keyOf(x.hotkey) === e.key.toLowerCase());
      if (a && !a.disabled) {
        e.preventDefault();
        // A hotkey always picks its tool up (clicking the button again puts it down).
        if (a.kind === 'tool' && selected === a.id) return;
        activate(a);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  function activate(a: ActionDef) {
    if (a.kind === 'tool') {
      sfx.select();
      onSelect?.(selected === a.id ? null : a.id);
    } else {
      sfx.click();
      a.onClick?.();
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((a) => {
        const tone = TONES[a.tone ?? 'neutral'];
        const isActive = a.kind === 'tool' && selected === a.id;
        const Icon = a.icon;
        return (
          <button
            key={a.id}
            type="button"
            disabled={a.disabled}
            aria-pressed={a.kind === 'tool' ? isActive : undefined}
            title={a.title}
            onClick={() => activate(a)}
            className={[
              'relative inline-flex min-h-10 items-center gap-2 rounded-xl border px-3 py-2 font-mono text-[0.72rem] font-semibold tracking-[0.12em] uppercase transition',
              'disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent',
              isActive ? tone.active : tone.base,
              isActive ? 'shadow-[0_0_0_3px_rgba(255,255,255,0.05)]' : '',
            ].join(' ')}
          >
            {a.pulse && !a.disabled && <span className="pointer-events-none absolute -inset-px animate-pulse rounded-xl border border-noise/80" aria-hidden />}
            <Icon size={15} strokeWidth={2.2} aria-hidden />
            <span>{a.label}</span>
            {a.hotkey && (
              <kbd className={`ml-0.5 rounded border px-1 text-[0.6rem] ${a.tone === 'primary' ? 'border-ink-950/30 text-ink-950/70' : 'border-current/30 opacity-60'}`}>
                {a.hotkey}
              </kbd>
            )}
          </button>
        );
      })}
    </div>
  );
}
