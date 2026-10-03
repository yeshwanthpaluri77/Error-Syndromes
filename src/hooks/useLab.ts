import { useCallback, useEffect, useRef, useState } from 'react';
import {
  anyEntangled,
  applyCorrection,
  applyLens,
  clearReadings,
  directRead,
  entangleProbe,
  injectError,
  labReadout,
  measureProbe,
  threads,
  toggleBit,
  toggleProbeTarget,
  type ErrorKind,
  type LabState,
  type ProbeBasis,
} from '../game/engine/lab';
import type { Readout } from '../game/quantum/codes';
import { sfx } from '../utils/audio';
import { useGame } from './useGame';

export type Fx =
  | { id: number; kind: 'zap'; q: number; tone: ErrorKind }
  | { id: number; kind: 'noise'; tone: ErrorKind | 'unknown' }
  | { id: number; kind: 'fix'; q: number; gate: ErrorKind }
  | { id: number; kind: 'pulse'; probeId: string; targets: number[]; delay: number }
  | { id: number; kind: 'measure'; probeId: string; outcome: 0 | 1 }
  | { id: number; kind: 'collapse' }
  | { id: number; kind: 'read'; q: number }
  | { id: number; kind: 'transmit' }
  | { id: number; kind: 'lens'; q: number }
  | { id: number; kind: 'heal' };

type FxInput = Fx extends infer F ? (F extends Fx ? Omit<F, 'id'> : never) : never;

export type LabEvent =
  | { type: 'zap'; q: number; kind: ErrorKind }
  | { type: 'noise'; q: number | null; kind: ErrorKind }
  | { type: 'fix'; q: number; kind: ErrorKind }
  | { type: 'entangled'; probeId: string; agree: boolean }
  | { type: 'measured'; probeId: string; outcome: 0 | 1; disturbed: boolean }
  | { type: 'probes-done'; results: Record<string, 0 | 1>; disturbed: boolean; targets: Record<string, number[]> }
  | { type: 'read'; q: number; outcome: 0 | 1; disturbed: boolean }
  | { type: 'toggle'; q: number }
  | { type: 'lens'; q: number }
  | { type: 'wire'; probeId: string; targets: number[] }
  | { type: 'transmit'; readout: Readout };

export interface NoiseOpts {
  /** Strike colour; 'unknown' hides whether it was a bit- or phase-flip. */
  visual?: ErrorKind | 'unknown';
  /** Further errors applied to the same qubit in the same strike. */
  extra?: ErrorKind[];
  /** Milliseconds until the strike lands; the bench is locked meanwhile. */
  delay?: number;
  /** Runs just before a delayed strike lands. */
  before?: () => void;
}

export interface LabApi {
  state: LabState;
  fx: Fx[];
  busy: boolean;
  zap: (q: number, kind?: ErrorKind) => void;
  noise: (kind: ErrorKind, q: number | null, opts?: NoiseOpts) => void;
  fix: (q: number, kind: ErrorKind) => void;
  entangle: (probeId: string) => void;
  measure: (probeId: string) => void;
  runProbes: (ids: string[]) => void;
  read: (q: number, basis?: ProbeBasis) => void;
  toggle: (q: number) => void;
  lens: (q: number) => void;
  wire: (probeId: string, q: number) => void;
  transmit: () => void;
  replace: (next: LabState, opts?: { heal?: boolean }) => void;
  update: (fn: (s: LabState) => LabState) => void;
  checkpoint: () => void;
  rewind: () => boolean;
  fxNow: (f: FxInput, ms?: number) => void;
}

let fxSeq = 1;

export function useLab(init: () => LabState, onEvent?: (ev: LabEvent, state: LabState) => void): LabApi {
  const { reducedMotion } = useGame();
  const [state, setState] = useState<LabState>(init);
  const stateRef = useRef(state);
  const [fx, setFx] = useState<Fx[]>([]);
  const [busy, setBusy] = useState(false);
  /** Overlapping animations and pending noise each hold a lock; input is ignored while any is held. */
  const locks = useRef(0);
  /** Delayed strikes not yet landed; replacing the lab cancels them. */
  const pendingNoise = useRef(new Set<ReturnType<typeof setTimeout>>());
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const saved = useRef<LabState | null>(null);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    const set = timers.current;
    const held = locks;
    const pending = pendingNoise.current;
    return () => {
      set.forEach(clearTimeout);
      set.clear();
      pending.clear();
      held.current = 0;
    };
  }, []);

  const later = useCallback((fn: () => void, ms: number) => {
    const t = setTimeout(() => {
      timers.current.delete(t);
      fn();
    }, ms);
    timers.current.add(t);
  }, []);

  const t = useCallback((ms: number) => (reducedMotion ? Math.min(ms, 120) : ms), [reducedMotion]);

  const commit = useCallback((next: LabState) => {
    stateRef.current = next;
    setState(next);
  }, []);

  const addFx = useCallback(
    (f: FxInput, ms = 900) => {
      const id = fxSeq++;
      setFx((list) => [...list, { ...f, id } as Fx]);
      later(() => setFx((list) => list.filter((x) => x.id !== id)), Math.max(ms, 200));
    },
    [later],
  );

  /** Lock input for `ms`, then deliver the event to the scene. */
  const lock = useCallback(() => {
    locks.current += 1;
    setBusy(true);
  }, []);

  const unlock = useCallback(() => {
    locks.current = Math.max(0, locks.current - 1);
    if (locks.current === 0) setBusy(false);
  }, []);

  const emitAfter = useCallback(
    (ev: LabEvent, ms: number) => {
      lock();
      later(() => {
        unlock();
        onEventRef.current?.(ev, stateRef.current);
      }, ms);
    },
    [later, lock, unlock],
  );

  const guard = () => locks.current > 0;

  const zap = useCallback(
    (q: number, kind: ErrorKind = 'X') => {
      if (guard()) return;
      commit(injectError(stateRef.current, q, kind));
      if (kind === 'X') sfx.zap();
      else sfx.phaseZap();
      addFx({ kind: 'zap', q, tone: kind }, 900);
      emitAfter({ type: 'zap', q, kind }, t(650));
    },
    [addFx, commit, emitAfter, t],
  );

  const noiseNow = useCallback(
    (kind: ErrorKind, q: number | null, opts?: NoiseOpts) => {
      if (q !== null) {
        let next = injectError(stateRef.current, q, kind);
        for (const k of opts?.extra ?? []) next = injectError(next, q, k);
        commit(next);
      } else {
        // A miss must look exactly like a hit from the outside.
        commit(clearReadings(stateRef.current));
      }
      const visual = opts?.visual ?? kind;
      if (visual === 'Z') sfx.phaseZap();
      else sfx.zap();
      addFx({ kind: 'noise', tone: visual }, 1100);
      emitAfter({ type: 'noise', q, kind }, t(900));
    },
    [addFx, commit, emitAfter, t],
  );

  const noise = useCallback(
    (kind: ErrorKind, q: number | null, opts?: NoiseOpts) => {
      if (opts?.delay) {
        // Hold the bench until the strike lands, so nobody repairs a message that hasn't been hit yet.
        lock();
        const timer = setTimeout(() => {
          pendingNoise.current.delete(timer);
          timers.current.delete(timer);
          unlock();
          opts.before?.();
          noiseNow(kind, q, opts);
        }, reducedMotion ? Math.min(opts.delay, 400) : opts.delay);
        pendingNoise.current.add(timer);
        timers.current.add(timer);
        return;
      }
      noiseNow(kind, q, opts);
    },
    [lock, unlock, noiseNow, reducedMotion],
  );

  const fix = useCallback(
    (q: number, kind: ErrorKind) => {
      if (guard()) return;
      commit(applyCorrection(stateRef.current, q, kind));
      sfx.fix();
      addFx({ kind: 'fix', q, gate: kind }, 900);
      emitAfter({ type: 'fix', q, kind }, t(500));
    },
    [addFx, commit, emitAfter, t],
  );

  const entangle = useCallback(
    (probeId: string) => {
      if (guard()) return;
      const probe = stateRef.current.probes.find((p) => p.id === probeId);
      if (!probe || probe.targets.length === 0) return;
      const next = entangleProbe(stateRef.current, probeId);
      commit(next);
      sfx.probe();
      addFx({ kind: 'pulse', probeId, targets: probe.targets, delay: 0 }, 900);
      const helper = threads(next).map((th) => th.anc[probe.ancilla - next.nData]);
      emitAfter({ type: 'entangled', probeId, agree: new Set(helper).size <= 1 }, t(800));
    },
    [addFx, commit, emitAfter, t],
  );

  const measure = useCallback(
    (probeId: string) => {
      if (guard()) return;
      const r = measureProbe(stateRef.current, probeId);
      commit(r.lab);
      sfx.measure(r.outcome);
      addFx({ kind: 'measure', probeId, outcome: r.outcome }, 900);
      if (r.disturbed) {
        sfx.collapse();
        addFx({ kind: 'collapse' }, 1400);
      }
      emitAfter({ type: 'measured', probeId, outcome: r.outcome, disturbed: r.disturbed }, t(r.disturbed ? 1100 : 500));
    },
    [addFx, commit, emitAfter, t],
  );

  /** Run several probes back to back: wire pulse, then read, for each. */
  const runProbes = useCallback(
    (ids: string[]) => {
      if (guard()) return;
      let s = stateRef.current;
      const results: Record<string, 0 | 1> = {};
      const targets: Record<string, number[]> = {};
      let disturbed = false;
      const step = t(750);
      const runnable = ids.filter((id) => (s.probes.find((p) => p.id === id)?.targets.length ?? 0) > 0);
      if (runnable.length === 0) return;
      runnable.forEach((id, i) => {
        const probe = s.probes.find((p) => p.id === id)!;
        targets[id] = probe.targets;
        const r = measureProbe(entangleProbe(s, id), id);
        s = r.lab;
        results[id] = r.outcome;
        disturbed ||= r.disturbed;
        addFx({ kind: 'pulse', probeId: id, targets: probe.targets, delay: (i * step) / 1000 }, i * step + 900);
        later(() => {
          sfx.measure(r.outcome);
          addFx({ kind: 'measure', probeId: id, outcome: r.outcome }, 900);
        }, i * step + t(550));
      });
      sfx.probe();
      commit(s);
      if (disturbed) {
        later(() => {
          sfx.collapse();
          addFx({ kind: 'collapse' }, 1400);
        }, runnable.length * step);
      }
      emitAfter({ type: 'probes-done', results, disturbed, targets }, runnable.length * step + t(disturbed ? 700 : 150));
    },
    [addFx, commit, emitAfter, later, t],
  );

  const read = useCallback(
    (q: number, basis: ProbeBasis = 'Z') => {
      if (guard()) return;
      const r = directRead(stateRef.current, q, basis);
      commit(r.lab);
      sfx.measure(r.outcome);
      addFx({ kind: 'read', q }, 900);
      if (r.disturbed) {
        sfx.collapse();
        addFx({ kind: 'collapse' }, 1400);
      }
      emitAfter({ type: 'read', q, outcome: r.outcome, disturbed: r.disturbed }, t(r.disturbed ? 1100 : 500));
    },
    [addFx, commit, emitAfter, t],
  );

  const toggle = useCallback(
    (q: number) => {
      if (guard()) return;
      commit(toggleBit(stateRef.current, q));
      sfx.click();
      onEventRef.current?.({ type: 'toggle', q }, stateRef.current);
    },
    [commit],
  );

  const lens = useCallback(
    (q: number) => {
      if (guard()) return;
      commit(applyLens(stateRef.current, q));
      sfx.lens();
      addFx({ kind: 'lens', q }, 800);
      emitAfter({ type: 'lens', q }, t(350));
    },
    [addFx, commit, emitAfter, t],
  );

  const wire = useCallback(
    (probeId: string, q: number) => {
      if (guard()) return;
      const next = toggleProbeTarget(stateRef.current, probeId, q);
      if (next === stateRef.current) return;
      commit(next);
      sfx.wire();
      const probe = next.probes.find((p) => p.id === probeId)!;
      onEventRef.current?.({ type: 'wire', probeId, targets: probe.targets }, next);
    },
    [commit],
  );

  const transmit = useCallback(() => {
    if (guard()) return;
    if (anyEntangled(stateRef.current)) return;
    sfx.transmit();
    addFx({ kind: 'transmit' }, 1400);
    emitAfter({ type: 'transmit', readout: labReadout(stateRef.current) }, t(1250));
  }, [addFx, emitAfter, t]);

  const replace = useCallback(
    (next: LabState, opts?: { heal?: boolean }) => {
      // A strike aimed at the old message must not land on the new one.
      pendingNoise.current.forEach((timer) => {
        clearTimeout(timer);
        timers.current.delete(timer);
        unlock();
      });
      pendingNoise.current.clear();
      commit(next);
      if (opts?.heal) addFx({ kind: 'heal' }, 900);
    },
    [addFx, commit, unlock],
  );

  const update = useCallback((fn: (s: LabState) => LabState) => commit(fn(stateRef.current)), [commit]);

  const checkpoint = useCallback(() => {
    saved.current = stateRef.current;
  }, []);

  const rewind = useCallback(() => {
    if (!saved.current) return false;
    commit(saved.current);
    addFx({ kind: 'heal' }, 900);
    return true;
  }, [addFx, commit]);

  return {
    state,
    fx,
    busy,
    zap,
    noise,
    fix,
    entangle,
    measure,
    runProbes,
    read,
    toggle,
    lens,
    wire,
    transmit,
    replace,
    update,
    checkpoint,
    rewind,
    fxNow: addFx,
  };
}
