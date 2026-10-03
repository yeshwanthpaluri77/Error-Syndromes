import type { LevelDef, MissionStats } from '../../types/game';

export interface RatingCheck {
  key: string;
  label: string;
  passed: boolean;
  note: string;
}

export interface Rating {
  stars: number;
  checks: RatingCheck[];
}

/**
 * Repair rating: one star for completing the mission plus one per check that
 * applies to it. Hints never cost stars: they are part of learning. Speed never
 * counts.
 */
export function rateMission(level: LevelDef, stats: MissionStats): Rating {
  const all: Record<string, RatingCheck> = {
    diagnosis: {
      key: 'diagnosis',
      label: 'Diagnosis',
      passed: stats.wrongFixes === 0,
      note: stats.wrongFixes === 0 ? 'Every fix matched the syndrome' : `${stats.wrongFixes} misdiagnosed fix${stats.wrongFixes > 1 ? 'es' : ''}`,
    },
    probes: {
      key: 'probes',
      label: 'Probe usage',
      passed: level.probePar === undefined || stats.probeRuns <= level.probePar,
      note:
        level.probePar === undefined
          ? 'Efficient'
          : `${stats.probeRuns} probe run${stats.probeRuns === 1 ? '' : 's'} (par ${level.probePar})`,
    },
    preserved: {
      key: 'preserved',
      label: 'State preserved',
      passed: stats.collapses === 0,
      note: stats.collapses === 0 ? 'Never collapsed the message' : `Collapsed ${stats.collapses}×`,
    },
    clean: {
      key: 'clean',
      label: 'Clean delivery',
      passed: stats.failedTransmits === 0,
      note: stats.failedTransmits === 0 ? 'Every transmission arrived intact' : `${stats.failedTransmits} failed transmission${stats.failedTransmits > 1 ? 's' : ''}`,
    },
  };
  const checks = level.checks.map((k) => all[k]);
  const maxStars = 1 + checks.length;
  const earned = 1 + checks.filter((c) => c.passed).length;
  // Normalise to a 5-star scale so every mission reads the same way.
  const stars = checks.length === 0 ? 5 : Math.max(1, Math.round((earned / maxStars) * 5));
  return { stars, checks };
}
