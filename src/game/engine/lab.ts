/**
 * The repair lab: data qubits, helper (ancilla) qubits wired into parity probes,
 * and every operation the player can perform. Pure functions — each returns a
 * new LabState — so React only renders, and the physics lives here.
 */
import {
  applyCNOT,
  applyH,
  applyX,
  applyZ,
  blochOf,
  clone,
  fromAmplitudes,
  measure,
  resetQubit,
  threadsOf,
  type QState,
} from '../quantum/statevector';
import { encodedState, fidelity, readout, type CodeKind, type Readout } from '../quantum/codes';

export type ErrorKind = 'X' | 'Z';
/** Z-basis probes compare 0/1 values; X-basis probes compare phases (+/−). */
export type ProbeBasis = 'Z' | 'X';

export interface ProbeDef {
  id: string;
  label: string;
  targets: number[];
  basis: ProbeBasis;
  editable?: boolean;
}

export interface ProbeState extends ProbeDef {
  ancilla: number;
  status: 'idle' | 'entangled' | 'measured';
  result: 0 | 1 | null;
  /** The carriers were corrected after this reading, so it describes the past. */
  stale?: boolean;
}

export interface LabState {
  code: CodeKind;
  nData: number;
  nAnc: number;
  phi: number;
  sv: QState;
  probes: ProbeState[];
  /** Set once a measurement had to choose between threads — the message was disturbed. */
  collapsed: boolean;
  /** Ground truth of injected noise, for debriefs only (never shown during play). */
  injected: Array<{ q: number; kind: ErrorKind }>;
  probeRuns: number;
}

export interface LabOptions {
  code: CodeKind;
  phi?: number;
  probes?: ProbeDef[];
  /** For the plain bench and copier: start data qubits in these 0/1 values instead of encoding. */
  bits?: Array<0 | 1>;
  /** Start un-encoded: message on Q1 only, other data qubits blank. */
  unencoded?: boolean;
  /** Share a single helper qubit between all probes (used by the nine-qubit board). */
  sharedAncilla?: boolean;
  nData?: number;
}

export function createLab(opts: LabOptions): LabState {
  const code = opts.code;
  const nData = opts.nData ?? (code === 'single' ? 1 : code === 'shor' ? 9 : 3);
  const probeDefs = opts.probes ?? [];
  const nAnc = probeDefs.length === 0 ? 0 : opts.sharedAncilla ? 1 : probeDefs.length;
  const n = nData + nAnc;
  const phi = opts.phi ?? 0;

  let sv: QState;
  if (opts.bits) {
    let index = 0;
    opts.bits.forEach((b, q) => {
      if (b) index |= 1 << q;
    });
    sv = fromAmplitudes(n, [[index, 1]]);
  } else if (opts.unencoded) {
    sv = encodedState('single', phi, n);
  } else {
    sv = encodedState(code === 'plain' ? 'single' : code, phi, n);
  }

  return {
    code,
    nData,
    nAnc,
    phi,
    sv,
    probes: probeDefs.map((p, i) => ({
      ...p,
      targets: [...p.targets],
      ancilla: nData + (opts.sharedAncilla ? 0 : i),
      status: 'idle',
      result: null,
    })),
    collapsed: false,
    injected: [],
    probeRuns: 0,
  };
}

function withState(lab: LabState, sv: QState, patch: Partial<LabState> = {}): LabState {
  return { ...lab, sv, ...patch };
}

function clearProbeResults(lab: LabState): ProbeState[] {
  return lab.probes.map((p) => (p.status === 'measured' ? { ...p, status: 'idle', result: null, stale: false } : p));
}

// ── Noise and corrections ────────────────────────────────────────────────

export function injectError(lab: LabState, q: number, kind: ErrorKind): LabState {
  const sv = kind === 'X' ? applyX(lab.sv, q) : applyZ(lab.sv, q);
  return withState(lab, sv, {
    injected: [...lab.injected, { q, kind }],
    probes: clearProbeResults(lab),
  });
}

/** A correction is physically the same gate as the error — X undoes X, Z undoes Z. */
export function applyCorrection(lab: LabState, q: number, kind: ErrorKind): LabState {
  const sv = kind === 'X' ? applyX(lab.sv, q) : applyZ(lab.sv, q);
  return withState(lab, sv, { probes: lab.probes.map((p) => (p.status === 'measured' ? { ...p, stale: true } : p)) });
}

/** Forget old readings (a noise pulse passed, whether or not it hit anything). */
export function clearReadings(lab: LabState): LabState {
  return { ...lab, probes: clearProbeResults(lab) };
}

/** Flip a plain test bit (classical bench) — same X gate, but a deliberate setting, not noise. */
export function toggleBit(lab: LabState, q: number): LabState {
  return withState(lab, applyX(lab.sv, q), { probes: clearProbeResults(lab) });
}

export function applyLens(lab: LabState, q: number): LabState {
  return withState(lab, applyH(lab.sv, q));
}

export function link(lab: LabState, control: number, target: number): LabState {
  return withState(lab, applyCNOT(lab.sv, control, target));
}

export function setCode(lab: LabState, code: CodeKind): LabState {
  return { ...lab, code };
}

// ── Probes ───────────────────────────────────────────────────────────────

export function setProbeTargets(lab: LabState, probeId: string, targets: number[]): LabState {
  return {
    ...lab,
    probes: lab.probes.map((p) =>
      p.id === probeId ? { ...p, targets: [...targets].sort((a, b) => a - b), status: 'idle', result: null } : p,
    ),
  };
}

export function toggleProbeTarget(lab: LabState, probeId: string, q: number): LabState {
  const probe = lab.probes.find((p) => p.id === probeId);
  if (!probe || probe.status === 'entangled') return lab;
  const targets = probe.targets.includes(q) ? probe.targets.filter((t) => t !== q) : [...probe.targets, q];
  return setProbeTargets(lab, probeId, targets);
}

/**
 * Wire the helper to its targets: for a bit probe, a CNOT from each target into
 * the helper; for a phase probe, the same inside a Hadamard "lens" on the targets.
 * Afterwards the helper holds, in every thread, the parity of the targets.
 */
export function entangleProbe(lab: LabState, probeId: string): LabState {
  const probe = lab.probes.find((p) => p.id === probeId);
  if (!probe || probe.status === 'entangled' || probe.targets.length === 0) return lab;
  let sv = lab.sv;
  if (probe.basis === 'X') for (const t of probe.targets) sv = applyH(sv, t);
  for (const t of probe.targets) sv = applyCNOT(sv, t, probe.ancilla);
  if (probe.basis === 'X') for (const t of probe.targets) sv = applyH(sv, t);
  return withState(lab, sv, {
    probes: lab.probes.map((p) => (p.id === probeId ? { ...p, status: 'entangled', result: null, stale: false } : p)),
  });
}

export interface MeasureOutcome {
  lab: LabState;
  outcome: 0 | 1;
  disturbed: boolean;
}

/** Read the helper, then return it to 0 so the probe can be reused. */
export function measureProbe(lab: LabState, probeId: string, rand?: () => number): MeasureOutcome {
  const probe = lab.probes.find((p) => p.id === probeId);
  if (!probe || probe.status !== 'entangled') return { lab, outcome: 0, disturbed: false };
  const m = measure(lab.sv, probe.ancilla, rand);
  const sv = resetQubit(m.state, probe.ancilla);
  return {
    outcome: m.outcome,
    disturbed: m.disturbed,
    lab: withState(lab, sv, {
      collapsed: lab.collapsed || m.disturbed,
      probeRuns: lab.probeRuns + 1,
      probes: lab.probes.map((p) => (p.id === probeId ? { ...p, status: 'measured', result: m.outcome } : p)),
    }),
  };
}

export function runProbe(lab: LabState, probeId: string, rand?: () => number): MeasureOutcome {
  return measureProbe(entangleProbe(lab, probeId), probeId, rand);
}

/**
 * Direct measurement of a data qubit — "opening the box". Basis Z asks
 * "0 or 1?", basis X asks "+ or −?".
 */
export function directRead(lab: LabState, q: number, basis: ProbeBasis = 'Z', rand?: () => number): MeasureOutcome {
  let sv = lab.sv;
  if (basis === 'X') sv = applyH(sv, q);
  const m = measure(sv, q, rand);
  sv = m.state;
  if (basis === 'X') sv = applyH(sv, q);
  return {
    outcome: m.outcome,
    disturbed: m.disturbed,
    lab: withState(lab, sv, { collapsed: lab.collapsed || m.disturbed }),
  };
}

// ── Views ────────────────────────────────────────────────────────────────

export type Lens = 'bit' | 'phase';

export interface ThreadView {
  key: string;
  amp: number;
  weight: number;
  data: Array<0 | 1>;
  anc: Array<0 | 1>;
}

/**
 * The simulator ("x-ray") view: the basis components of the state. In the
 * phase lens, data qubits are shown in the +/− basis instead of 0/1.
 * Threads are ordered by how many data qubits read 1 (or −), so the thread
 * that started as all-0 stays first after a single error.
 */
export function threads(lab: LabState, lens: Lens = 'bit'): ThreadView[] {
  let sv = lab.sv;
  if (lens === 'phase') for (let q = 0; q < lab.nData; q++) sv = applyH(sv, q);
  const dataQ = Array.from({ length: lab.nData }, (_, i) => i);
  const ancQ = Array.from({ length: lab.nAnc }, (_, i) => lab.nData + i);
  return threadsOf(sv, [...dataQ, ...ancQ])
    .map((t) => ({
      key: String(t.index),
      amp: t.amp,
      weight: t.weight,
      data: t.bits.slice(0, lab.nData),
      anc: t.bits.slice(lab.nData),
    }))
    .sort((a, b) => {
      const wa = a.data.reduce<number>((s, v) => s + v, 0);
      const wb = b.data.reduce<number>((s, v) => s + v, 0);
      return wa - wb || Number(a.key) - Number(b.key);
    });
}

export function qubitBloch(lab: LabState, q: number) {
  return blochOf(lab.sv, q);
}

export function labReadout(lab: LabState): Readout {
  return readout(lab.sv, lab.code);
}

export function labFidelity(lab: LabState): number {
  return fidelity(lab.sv, lab.code, lab.phi);
}

export function anyEntangled(lab: LabState): boolean {
  return lab.probes.some((p) => p.status === 'entangled');
}

/**
 * Which data qubits currently carry an X flip relative to the ideal message
 * (lowest-weight explanation). Used for the storm's bookkeeping and debriefs.
 */
export function xFlipPattern(lab: LabState): number[] | null {
  const ideal = encodedState(lab.code, lab.phi, lab.sv.n);
  const n = lab.nData;
  let best: number[] | null = null;
  for (let mask = 0; mask < 1 << n; mask++) {
    let s = clone(lab.sv);
    const flipped: number[] = [];
    for (let q = 0; q < n; q++) {
      if (mask & (1 << q)) {
        s = applyX(s, q);
        flipped.push(q);
      }
    }
    let o = 0;
    for (let i = 0; i < s.amp.length; i++) o += s.amp[i] * ideal.amp[i];
    if (o * o > 0.999 && (!best || flipped.length < best.length)) best = flipped;
  }
  return best;
}

/** What a probe wired to `targets` would read if the only error were `error`. */
export function predictedParity(targets: number[], error: { q: number } | null): 0 | 1 {
  if (!error) return 0;
  return targets.includes(error.q) ? 1 : 0;
}

/**
 * The message as it would read if every wired-but-unread probe were run in
 * reverse (CNOT and the Hadamard lens are their own inverses). Lets the live
 * dial stay meaningful while a helper is entangled, without measuring anything.
 */
export function liveReadout(lab: LabState): Readout {
  let sv = lab.sv;
  for (const p of lab.probes) {
    if (p.status !== 'entangled') continue;
    if (p.basis === 'X') for (const t of p.targets) sv = applyH(sv, t);
    for (const t of p.targets) sv = applyCNOT(sv, t, p.ancilla);
    if (p.basis === 'X') for (const t of p.targets) sv = applyH(sv, t);
  }
  return readout(sv, lab.code);
}
