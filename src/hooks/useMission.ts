import { useCallback, useEffect, useRef, useState } from 'react';
import type { ConceptId, FailureInfo, Feedback, FeedbackTone, LevelDef, MissionStats } from '../types/game';
import { rateMission, type Rating } from '../game/scoring/score';
import { sfx } from '../utils/audio';
import { useGame } from './useGame';

export type LogTone = 'sys' | 'good' | 'warn' | 'bad' | 'note';

export interface LogLine {
  id: number;
  text: string;
  tone: LogTone;
  stepIndex: number;
}

export interface MissionApi {
  level: LevelDef;
  stepIndex: number;
  stepId: string;
  objective: string;
  hints: string[];
  hintLevel: number;
  log: LogLine[];
  feedback: Feedback | null;
  concept: ConceptId | null;
  failure: FailureInfo | null;
  rating: Rating | null;
  stats: MissionStats;
  next: () => void;
  goTo: (id: string) => void;
  say: (lines: string | string[], tone?: LogTone) => void;
  setObjective: (text: string | null) => void;
  nextHint: () => void;
  flash: (tone: FeedbackTone, title: string, body?: string, ms?: number) => void;
  clearFlash: () => void;
  showConcept: (id: ConceptId) => void;
  dismissConcept: () => void;
  fail: (info: FailureInfo) => void;
  clearFailure: () => void;
  bump: (key: keyof MissionStats, by?: number) => void;
  complete: () => void;
  later: (fn: () => void, ms: number) => void;
}

let lineSeq = 1;
let feedbackSeq = 1;

export function useMission(level: LevelDef): MissionApi {
  const { discover, reducedMotion } = useGame();
  const [stepIndex, setStepIndex] = useState(0);
  const [log, setLog] = useState<LogLine[]>(() =>
    level.steps[0].say.map((text) => ({ id: lineSeq++, text, tone: 'sys' as LogTone, stepIndex: 0 })),
  );
  const [objectiveOverride, setObjectiveOverride] = useState<string | null>(null);
  const [hintLevel, setHintLevel] = useState(0);
  const hintRef = useRef(0);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [conceptQueue, setConceptQueue] = useState<ConceptId[]>([]);
  const [failure, setFailure] = useState<FailureInfo | null>(null);
  const [rating, setRating] = useState<Rating | null>(null);
  const [stats, setStats] = useState<MissionStats>({ hints: 0, collapses: 0, wrongFixes: 0, failedTransmits: 0, probeRuns: 0 });
  const statsRef = useRef(stats);
  statsRef.current = stats;
  const stepRef = useRef(stepIndex);
  stepRef.current = stepIndex;
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const set = timers.current;
    return () => {
      set.forEach(clearTimeout);
      set.clear();
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    };
  }, []);

  const later = useCallback(
    (fn: () => void, ms: number) => {
      const t = setTimeout(() => {
        timers.current.delete(t);
        fn();
      }, reducedMotion ? Math.min(ms, 400) : ms);
      timers.current.add(t);
    },
    [reducedMotion],
  );

  const enterStep = useCallback(
    (index: number) => {
      if (index < 0 || index >= level.steps.length) return;
      stepRef.current = index;
      setStepIndex(index);
      hintRef.current = 0;
      setHintLevel(0);
      setObjectiveOverride(null);
      const lines = level.steps[index].say;
      if (lines.length) setLog((l) => [...l, ...lines.map((text) => ({ id: lineSeq++, text, tone: 'sys' as LogTone, stepIndex: index }))]);
    },
    [level.steps],
  );

  const next = useCallback(() => enterStep(stepRef.current + 1), [enterStep]);

  const goTo = useCallback(
    (id: string) => {
      const i = level.steps.findIndex((s) => s.id === id);
      if (i >= 0) enterStep(i);
    },
    [enterStep, level.steps],
  );

  const say = useCallback((lines: string | string[], tone: LogTone = 'sys') => {
    const arr = Array.isArray(lines) ? lines : [lines];
    setLog((l) => [...l, ...arr.map((text) => ({ id: lineSeq++, text, tone, stepIndex: stepRef.current }))]);
  }, []);

  const flash = useCallback((tone: FeedbackTone, title: string, body?: string, ms = 4200) => {
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    setFeedback({ id: feedbackSeq++, tone, title, body });
    feedbackTimer.current = setTimeout(() => setFeedback(null), ms);
  }, []);

  const clearFlash = useCallback(() => setFeedback(null), []);

  const showConcept = useCallback(
    (id: ConceptId) => {
      discover(id);
      sfx.concept();
      setConceptQueue((q) => (q.includes(id) ? q : [...q, id]));
    },
    [discover],
  );

  const dismissConcept = useCallback(() => setConceptQueue((q) => q.slice(1)), []);

  const bump = useCallback((key: keyof MissionStats, by = 1) => {
    setStats((s) => ({ ...s, [key]: s[key] + by }));
  }, []);

  const nextHint = useCallback(() => {
    const hints = level.steps[stepRef.current].hints;
    if (!hints || hintRef.current >= hints.length) return;
    if (hintRef.current === 0) setStats((s) => ({ ...s, hints: s.hints + 1 }));
    hintRef.current += 1;
    setHintLevel(hintRef.current);
    sfx.select();
  }, [level.steps]);

  const fail = useCallback((info: FailureInfo) => {
    sfx.fail();
    setFailure(info);
  }, []);

  const clearFailure = useCallback(() => setFailure(null), []);

  const complete = useCallback(() => {
    later(() => {
      sfx.success();
      setRating(rateMission(level, statsRef.current));
    }, 600);
  }, [later, level]);

  const step = level.steps[stepIndex];

  return {
    level,
    stepIndex,
    stepId: step.id,
    objective: objectiveOverride ?? step.objective,
    hints: step.hints ?? [],
    hintLevel,
    log,
    feedback,
    concept: conceptQueue[0] ?? null,
    failure,
    rating,
    stats,
    next,
    goTo,
    say,
    setObjective: setObjectiveOverride,
    nextHint,
    flash,
    clearFlash,
    showConcept,
    dismissConcept,
    fail,
    clearFailure,
    bump,
    complete,
    later,
  };
}
