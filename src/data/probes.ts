import type { ProbeDef } from '../game/engine/lab';

/** S1 compares Q1↔Q2, S2 compares Q2↔Q3: the classic three-qubit syndrome. */
export const STANDARD_PROBES: ProbeDef[] = [
  { id: 's1', label: 'S1', targets: [0, 1], basis: 'Z' },
  { id: 's2', label: 'S2', targets: [1, 2], basis: 'Z' },
];

/** The same pairs, compared through the Hadamard lens (phase parity). */
export const PHASE_PROBES: ProbeDef[] = STANDARD_PROBES.map((p) => ({ ...p, basis: 'X' }));

/** Shor's code: two bit probes inside each block, two phase probes across blocks. */
export const SHOR_PROBES: ProbeDef[] = [
  { id: 'a1', label: 'A·1', targets: [0, 1], basis: 'Z' },
  { id: 'a2', label: 'A·2', targets: [1, 2], basis: 'Z' },
  { id: 'b1', label: 'B·1', targets: [3, 4], basis: 'Z' },
  { id: 'b2', label: 'B·2', targets: [4, 5], basis: 'Z' },
  { id: 'c1', label: 'C·1', targets: [6, 7], basis: 'Z' },
  { id: 'c2', label: 'C·2', targets: [7, 8], basis: 'Z' },
  { id: 'p1', label: 'Φ1', targets: [0, 1, 2, 3, 4, 5], basis: 'X' },
  { id: 'p2', label: 'Φ2', targets: [3, 4, 5, 6, 7, 8], basis: 'X' },
];
