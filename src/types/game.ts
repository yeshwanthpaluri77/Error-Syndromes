export type ConceptId =
  | 'qubit'
  | 'xError'
  | 'collapse'
  | 'majority'
  | 'noCloning'
  | 'spread'
  | 'shield'
  | 'ancilla'
  | 'parity'
  | 'syndrome'
  | 'correction'
  | 'nonDestructive'
  | 'zError'
  | 'phaseShield'
  | 'oneShield'
  | 'shor'
  | 'blockPhase'
  | 'threshold';

export interface Concept {
  id: ConceptId;
  title: string;
  /** Two to four short lines. */
  lines: string[];
}

export interface StepDef {
  id: string;
  /** Narrator lines appended to the lab log when the step begins. */
  say: string[];
  objective: string;
  hints?: [string, string, string];
}

export type RankId = 'recruit' | 'technician' | 'operator' | 'analyst' | 'repairer' | 'specialist';

export interface LevelDef {
  id: number;
  /** Short code shown in the HUD, e.g. "04". */
  code: string;
  title: string;
  /** One-line teaser for the mission map. */
  teaser: string;
  /** The idea this mission is built around. */
  idea: string;
  /** Letter of the final transmission recovered by completing this mission. */
  letter: string;
  steps: StepDef[];
  learned: string[];
  rankAfter?: RankId;
  /** Which rating checks apply to this mission. */
  checks: Array<'diagnosis' | 'probes' | 'preserved' | 'clean'>;
  /** Probe runs considered efficient for the whole mission. */
  probePar?: number;
}

export interface MissionStats {
  hints: number;
  collapses: number;
  wrongFixes: number;
  failedTransmits: number;
  probeRuns: number;
}

export type FeedbackTone = 'info' | 'success' | 'warn' | 'error';

export interface Feedback {
  id: number;
  tone: FeedbackTone;
  title: string;
  body?: string;
}

export interface FailureInfo {
  title: string;
  lines: string[];
  action?: string;
}
