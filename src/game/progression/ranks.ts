import type { RankId } from '../../types/game';

export interface Rank {
  id: RankId;
  title: string;
  /** What the player proved to earn it. */
  mastered: string;
}

export const RANKS: Rank[] = [
  { id: 'recruit', title: 'Recruit', mastered: 'Reported for duty.' },
  { id: 'technician', title: 'Signal Technician', mastered: "Knows noise flips qubits, looking destroys them, and copying them can't be done." },
  { id: 'operator', title: 'Probe Operator', mastered: 'Can use a helper qubit to measure parity without collapsing the message.' },
  { id: 'analyst', title: 'Syndrome Analyst', mastered: 'Reads a two-probe fingerprint and repairs the right carrier.' },
  { id: 'repairer', title: 'Quantum Repairer', mastered: 'Repairs messages without ever looking at them.' },
  { id: 'specialist', title: 'Error Correction Specialist', mastered: 'Handles bit and phase noise, and keeps up with a storm.' },
];

export function rankIndex(id: RankId): number {
  return RANKS.findIndex((r) => r.id === id);
}

export function rankOf(id: RankId): Rank {
  return RANKS[rankIndex(id)];
}
