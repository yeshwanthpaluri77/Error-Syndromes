import { LETTER_POSITIONS, RING, letterPos } from '../quantum/codes';
import type { ProbeState } from './lab';

export function randomOf<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

/** A random message letter (never one of the 0/1/+/− markers). */
export function randomLetter(exclude: string[] = []): string {
  const pool = LETTER_POSITIONS.map((p) => RING[p]).filter((l) => !exclude.includes(l));
  return randomOf(pool);
}

export function letterAt(pos: number | null): string {
  return pos === null ? '—' : RING[pos];
}

export { letterPos };

/** Single-hit location the standard fingerprint points to (S1 = Q1↔Q2, S2 = Q2↔Q3). */
export function suspectFrom(s1: 0 | 1, s2: 0 | 1): number | null {
  if (s1 && !s2) return 0;
  if (s1 && s2) return 1;
  if (!s1 && s2) return 2;
  return null;
}

function names(qs: number[]): string {
  const n = qs.map((q) => `Q${q + 1}`);
  if (n.length <= 1) return n.join('');
  return `${n.slice(0, -1).join(', ')} and ${n[n.length - 1]}`;
}

/** Odd-count qubits after combining noise hits and the player's flips. */
export function netFlips(hits: number[], fixes: number[]): number[] {
  const count = new Map<number, number>();
  for (const q of [...hits, ...fixes]) count.set(q, (count.get(q) ?? 0) + 1);
  return [...count.entries()].filter(([, c]) => c % 2 === 1).map(([q]) => q).sort();
}

/** Debrief lines for a failed three-qubit repair. */
export function explainRepair(hits: number[], fixes: number[], kind: 'bit' | 'phase'): string[] {
  const flipWord = kind === 'bit' ? 'bit-flipped' : 'phase-flipped';
  const lines: string[] = [];
  lines.push(hits.length === 0 ? 'This signal arrived clean. The noise pulse missed every carrier.' : `The noise ${flipWord} ${names(hits)}.`);
  lines.push(fixes.length === 0 ? 'You applied no fix, so the damage was still there on delivery.' : `Your fixes hit ${names(fixes)}.`);
  const left = netFlips(hits, fixes);
  if (left.length === 3) {
    lines.push('Now all three carriers are flipped. That looks like a healthy shield holding the wrong message.');
  } else if (left.length > 0) {
    lines.push(`So ${names(left)} ${left.length === 1 ? 'was' : 'were'} still ${flipWord}. The receiver can't decode a broken pattern.`);
  }
  lines.push('Match S1 S2 against the fingerprint board and fix only that carrier. For 0 0, fix nothing.');
  return lines;
}

export interface FingerprintRow {
  key: string;
  label: string;
  s1: 0 | 1 | null;
  s2: 0 | 1 | null;
}

export const FULL_FINGERPRINTS: FingerprintRow[] = [
  { key: 'none', label: 'No hit', s1: 0, s2: 0 },
  { key: '0', label: 'Q1', s1: 1, s2: 0 },
  { key: '1', label: 'Q2', s1: 1, s2: 1 },
  { key: '2', label: 'Q3', s1: 0, s2: 1 },
];

/** Readings for a standard two-probe board, ignoring any taken before a fix. */
export function freshReadings(probes: ProbeState[]): [0 | 1 | null, 0 | 1 | null] {
  const r = (i: number) => (probes[i] && probes[i].status === 'measured' && !probes[i].stale ? probes[i].result : null);
  return [r(0), r(1)];
}

export function matchFingerprint(s1: 0 | 1 | null, s2: 0 | 1 | null): string | null {
  if (s1 === null || s2 === null) return null;
  return FULL_FINGERPRINTS.find((r) => r.s1 === s1 && r.s2 === s2)?.key ?? null;
}
