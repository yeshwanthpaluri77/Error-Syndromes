import { motion } from 'framer-motion';
import type { FingerprintRow } from '../../game/engine/diagnosis';
import type { ProbeState } from '../../game/engine/lab';
import { PanelTitle } from '../MissionPanel/MissionLayout';

/** Live probe readings: the syndrome as the player builds it. */
export function SyndromeReadout({ probes, labels, status }: { probes: ProbeState[]; labels?: string[]; status?: { text: string; tone: 'mute' | 'ok' | 'warn' | 'bad' } }) {
  const names = labels ?? ['Q1', 'Q2', 'Q3'];
  const toneCls = { mute: 'text-mute', ok: 'text-ok', warn: 'text-noise', bad: 'text-bad' };
  return (
    <div>
      <PanelTitle>Syndrome</PanelTitle>
      <div className="flex flex-wrap gap-2">
        {probes.map((p) => {
          const r = p.status === 'measured' ? p.result : null;
          return (
            <div key={p.id} className={`min-w-[7.5rem] flex-1 rounded-xl border px-3 py-2 ${p.basis === 'X' ? 'border-phase/25' : 'border-probe/25'} bg-white/[0.02] ${p.stale ? 'opacity-45' : ''}`} title={p.stale ? 'Reading taken before your fix' : undefined}>
              <div className="flex items-center justify-between">
                <span className={`font-mono text-[0.7rem] font-bold tracking-widest ${p.basis === 'X' ? 'text-phase' : 'text-probe'}`}>
                  {p.label}
                  {p.basis === 'X' ? ' ◐' : ''}
                </span>
                <motion.span key={`${p.id}-${r}`} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="font-mono text-2xl leading-none font-bold text-white">
                  {r ?? '?'}
                </motion.span>
              </div>
              <div className="mt-1 font-mono text-[0.65rem] text-mute">
                {p.targets.length ? p.targets.map((t) => names[t]).join(' ↔ ') : 'unwired'}
                {r !== null && <span className={r ? 'text-noise' : 'text-ok'}>{r ? ' · DIFFERENT' : ' · SAME'}</span>}
                {p.stale && <span className="text-mute"> · before fix</span>}
              </div>
            </div>
          );
        })}
      </div>
      {status && <p className={`mt-2.5 font-mono text-[0.72rem] tracking-wide ${toneCls[status.tone]}`}>STATUS: {status.text}</p>}
    </div>
  );
}


/** The fingerprint board the player fills in themselves in mission 06, and keeps as a reference. */
export function FingerprintBoard({ rows, highlight, title = 'Fingerprint board', basis = 'Z' }: { rows: FingerprintRow[]; highlight?: string | null; title?: string; basis?: 'Z' | 'X' }) {
  return (
    <div>
      <PanelTitle>{title}</PanelTitle>
      <table className="w-full border-separate border-spacing-y-1 font-mono text-[0.78rem]">
        <thead>
          <tr className="text-[0.62rem] tracking-widest text-mute uppercase">
            <th className="text-left font-medium">{basis === 'X' ? 'Phase hit on' : 'Hit on'}</th>
            <th className="w-12 font-medium">S1</th>
            <th className="w-12 font-medium">S2</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const hl = highlight === r.key;
            return (
              <tr key={r.key} className={hl ? 'text-noise' : 'text-slate-200'}>
                <td className={`rounded-l-lg px-2 py-1 ${hl ? 'bg-noise/10' : 'bg-white/[0.03]'}`}>{r.label}</td>
                {[r.s1, r.s2].map((v, i) => (
                  <td key={i} className={`py-1 text-center ${i === 1 ? 'rounded-r-lg' : ''} ${hl ? 'bg-noise/10' : 'bg-white/[0.03]'}`}>
                    {v === null ? <span className="text-white/20">–</span> : <motion.span initial={{ scale: 0.4 }} animate={{ scale: 1 }} className="inline-block font-bold">{v}</motion.span>}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

