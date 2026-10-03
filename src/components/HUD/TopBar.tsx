import { BookOpen, Map as MapIcon, Settings, Volume2, VolumeX } from 'lucide-react';
import type { ReactNode } from 'react';
import { recoveredLetters } from '../../game/progression/progress';
import { rankOf } from '../../game/progression/ranks';
import { useGame } from '../../hooks/useGame';
import { useNav } from '../../hooks/useNav';

export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <circle cx="32" cy="32" r="22" fill="none" stroke="#5eead4" strokeWidth="2.5" opacity=".5" />
      <path d="M32 10v44" stroke="#5eead4" strokeWidth="2" opacity=".2" />
      <path d="M32 32 45 14" stroke="#5eead4" strokeWidth="4" strokeLinecap="round" />
      <circle cx="32" cy="32" r="4.5" fill="#a78bfa" />
    </svg>
  );
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="grid size-9 place-items-center rounded-lg border border-white/10 text-slate-300 transition hover:border-white/25 hover:bg-white/5 hover:text-white"
    >
      {children}
    </button>
  );
}

export function TransmissionTracker({ compact = false }: { compact?: boolean }) {
  const { progress } = useGame();
  const letters = recoveredLetters(progress);
  return (
    <div className="flex items-center gap-[3px]" aria-label={`Recovered transmission: ${letters.map((l) => l ?? '_').join('')}`}>
      {letters.map((l, i) => (
        <span key={i} className="flex items-center">
          {i === 4 && <span className="w-1.5" />}
          <span
            className={`grid place-items-center rounded font-mono font-bold ${compact ? 'h-5 w-4 text-[0.65rem]' : 'h-6 w-5 text-xs'} ${
              l ? 'bg-signal/15 text-signal' : 'bg-white/[0.04] text-white/20'
            }`}
          >
            {l ?? '·'}
          </span>
        </span>
      ))}
    </div>
  );
}

export function TopBar({ center }: { center?: ReactNode }) {
  const { settings, updateSettings, progress } = useGame();
  const nav = useNav();
  const rank = rankOf(progress.rank);
  return (
    <header className="flex items-center gap-3 border-b border-white/[0.06] bg-ink-950/60 px-4 py-2.5 backdrop-blur-md md:px-5">
      <button type="button" onClick={nav.toTitle} className="flex shrink-0 items-center gap-2.5 rounded-lg" aria-label="Quantum Repair Lab: title screen">
        <Logo />
        <span className="hidden font-display text-[0.95rem] font-semibold tracking-[0.18em] text-white uppercase 2xl:inline">Quantum Repair Lab</span>
      </button>
      <div className="min-w-0 flex-1 px-2">{center}</div>
      <div className="hidden lg:block">
        <TransmissionTracker compact />
      </div>
      <div className="hidden items-center gap-2 rounded-lg border border-probe/20 bg-probe/[0.06] px-2.5 py-1.5 md:flex" title={rank.mastered}>
        <span className="font-mono text-[0.6rem] tracking-[0.18em] text-mute uppercase">Rank</span>
        <span className="font-mono text-[0.72rem] font-semibold tracking-wide text-probe">{rank.title}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <IconButton label="Field notes" onClick={nav.openNotes}>
          <BookOpen size={16} />
        </IconButton>
        <IconButton label="Mission map" onClick={nav.toMap}>
          <MapIcon size={16} />
        </IconButton>
        <IconButton label={settings.muted ? 'Unmute sound' : 'Mute sound'} onClick={() => updateSettings({ muted: !settings.muted })}>
          {settings.muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </IconButton>
        <IconButton label="Settings" onClick={nav.openSettings}>
          <Settings size={16} />
        </IconButton>
      </div>
    </header>
  );
}
