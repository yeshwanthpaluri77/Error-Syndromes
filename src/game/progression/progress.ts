import { LEVELS } from '../../data/levels';
import type { ConceptId, RankId } from '../../types/game';
import { RANKS, rankIndex } from './ranks';

export interface EndlessStats {
  repaired: number;
  attempts: number;
  bestStreak: number;
}

export interface Progress {
  /** Best rating (1–5) per completed mission. */
  completed: Record<number, number>;
  concepts: ConceptId[];
  rank: RankId;
  endless: EndlessStats;
  finaleSeen: boolean;
}

const KEY = 'qrl.progress.v1';

export const EMPTY_PROGRESS: Progress = {
  completed: {},
  concepts: [],
  rank: 'recruit',
  endless: { repaired: 0, attempts: 0, bestStreak: 0 },
  finaleSeen: false,
};

export function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return EMPTY_PROGRESS;
    return { ...EMPTY_PROGRESS, ...(JSON.parse(raw) as Partial<Progress>) };
  } catch {
    return EMPTY_PROGRESS;
  }
}

export function saveProgress(p: Progress) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* storage unavailable: progress lives for this session only */
  }
}

export function completeLevel(p: Progress, levelId: number, stars: number): Progress {
  const level = LEVELS[levelId];
  const best = Math.max(p.completed[levelId] ?? 0, stars);
  let rank = p.rank;
  if (level.rankAfter && rankIndex(level.rankAfter) > rankIndex(rank)) rank = level.rankAfter;
  return { ...p, completed: { ...p.completed, [levelId]: best }, rank };
}

export function discoverConcept(p: Progress, id: ConceptId): Progress {
  if (p.concepts.includes(id)) return p;
  return { ...p, concepts: [...p.concepts, id] };
}

export function isUnlocked(p: Progress, levelId: number, unlockAll: boolean): boolean {
  if (unlockAll || levelId === 0) return true;
  return p.completed[levelId - 1] !== undefined || p.completed[levelId] !== undefined;
}

export function endlessUnlocked(completed: Record<number, number>, unlockAll: boolean) {
  return unlockAll || completed[7] !== undefined;
}

export function nextLevelId(p: Progress): number {
  for (const l of LEVELS) if (p.completed[l.id] === undefined) return l.id;
  return LEVELS.length - 1;
}

/** The final phrase with recovered letters filled in. */
export function recoveredLetters(p: Progress): Array<string | null> {
  return LEVELS.map((l) => (p.completed[l.id] !== undefined ? l.letter : null));
}

export function campaignComplete(p: Progress): boolean {
  return LEVELS.every((l) => p.completed[l.id] !== undefined);
}

export { RANKS };
