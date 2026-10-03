import { RING, letterPhi } from '../quantum/codes';
import { createLab, type ErrorKind, type LabState } from './lab';
import { SHOR_PROBES } from '../../data/probes';

export interface ShorRound {
  q: number;
  kinds: ErrorKind[];
  letter: string;
}

export const CHARGES = 8;
export const BLOCKS = ['A', 'B', 'C'];

export function freshShor(letter: string): LabState {
  return createLab({ code: 'shor', phi: letterPhi(letter), probes: SHOR_PROBES, sharedAncilla: true });
}

export function describeHit(r: { q: number; kinds: ErrorKind[] }) {
  const kind = r.kinds.length === 2 ? 'a bit-flip AND a phase-flip' : r.kinds[0] === 'X' ? 'a bit-flip' : 'a phase-flip';
  return `${kind} on Q${r.q + 1} (block ${BLOCKS[Math.floor(r.q / 3)]})`;
}

export function shorFailureLines(round: ShorRound, fixes: Array<{ q: number; kind: ErrorKind }>, pos: number | null): string[] {
  const fixText = fixes.length ? fixes.map((f) => `${f.kind === 'X' ? 'FLIP' : 'PHASE FIX'} on Q${f.q + 1}`).join(', ') : 'none';
  return [
    `The receiver got ${pos === null ? 'an unreadable signal' : `the letter ${RING[pos]}`}.`,
    `The hit was ${describeHit(round)}.`,
    `Your fixes: ${fixText}.`,
    'Bit probes inside a block point at the carrier: FLIP it. Phase probes point at the block: PHASE FIX any carrier in it. A double hit needs both.',
  ];
}

export function wrongShorFix(round: ShorRound, fixes: Array<{ q: number; kind: ErrorKind }>) {
  return fixes.some((f) => (f.kind === 'X' ? !(round.kinds.includes('X') && f.q === round.q) : !(round.kinds.includes('Z') && Math.floor(f.q / 3) === Math.floor(round.q / 3))));
}

