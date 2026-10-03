/**
 * Minimal state-vector simulator.
 *
 * Every gate this game needs (X, Z, H, CNOT) has real matrix entries, and every
 * message starts as a real superposition cos(φ/2)|0⟩ + sin(φ/2)|1⟩, so real
 * amplitudes are exact here — not an approximation.
 *
 * Qubit q corresponds to bit q of the basis-state index (little-endian).
 */

export interface QState {
  readonly n: number;
  readonly amp: Float64Array;
}

const EPS = 1e-9;
const SQRT1_2 = Math.SQRT1_2;

export function zeroState(n: number): QState {
  const amp = new Float64Array(1 << n);
  amp[0] = 1;
  return { n, amp };
}

export function fromAmplitudes(n: number, entries: Array<[number, number]>): QState {
  const amp = new Float64Array(1 << n);
  for (const [index, value] of entries) amp[index] += value;
  return normalize({ n, amp });
}

export function clone(s: QState): QState {
  return { n: s.n, amp: new Float64Array(s.amp) };
}

export function normalize(s: QState): QState {
  let norm = 0;
  for (let i = 0; i < s.amp.length; i++) norm += s.amp[i] * s.amp[i];
  const k = norm > 0 ? 1 / Math.sqrt(norm) : 0;
  const amp = new Float64Array(s.amp.length);
  for (let i = 0; i < s.amp.length; i++) amp[i] = s.amp[i] * k;
  return { n: s.n, amp };
}

export function applyX(s: QState, q: number): QState {
  const bit = 1 << q;
  const amp = new Float64Array(s.amp.length);
  for (let i = 0; i < amp.length; i++) amp[i ^ bit] = s.amp[i];
  return { n: s.n, amp };
}

export function applyZ(s: QState, q: number): QState {
  const bit = 1 << q;
  const amp = new Float64Array(s.amp);
  for (let i = 0; i < amp.length; i++) if (i & bit) amp[i] = -amp[i];
  return { n: s.n, amp };
}

export function applyH(s: QState, q: number): QState {
  const bit = 1 << q;
  const amp = new Float64Array(s.amp.length);
  for (let i = 0; i < amp.length; i++) {
    if (i & bit) continue;
    const a0 = s.amp[i];
    const a1 = s.amp[i | bit];
    amp[i] = (a0 + a1) * SQRT1_2;
    amp[i | bit] = (a0 - a1) * SQRT1_2;
  }
  return { n: s.n, amp };
}

export function applyCNOT(s: QState, control: number, target: number): QState {
  const c = 1 << control;
  const t = 1 << target;
  const amp = new Float64Array(s.amp.length);
  for (let i = 0; i < amp.length; i++) amp[i & c ? i ^ t : i] = s.amp[i];
  return { n: s.n, amp };
}

/** Probability that measuring qubit q in the 0/1 basis gives 1. */
export function probOne(s: QState, q: number): number {
  const bit = 1 << q;
  let p = 0;
  for (let i = 0; i < s.amp.length; i++) if (i & bit) p += s.amp[i] * s.amp[i];
  return p;
}

export interface MeasureResult {
  state: QState;
  outcome: 0 | 1;
  /** Probability the observed outcome had before measuring. */
  probability: number;
  /**
   * True when the outcome was not certain beforehand — i.e. the measurement had
   * to pick between possibilities and therefore changed the state.
   */
  disturbed: boolean;
}

export function measure(s: QState, q: number, rand: () => number = Math.random): MeasureResult {
  const p1 = probOne(s, q);
  const outcome: 0 | 1 = rand() < p1 ? 1 : 0;
  const probability = outcome ? p1 : 1 - p1;
  const bit = 1 << q;
  const amp = new Float64Array(s.amp.length);
  for (let i = 0; i < amp.length; i++) {
    if (((i & bit) !== 0) === (outcome === 1)) amp[i] = s.amp[i];
  }
  return {
    state: normalize({ n: s.n, amp }),
    outcome,
    probability,
    disturbed: probability < 1 - 1e-6,
  };
}

/** Return qubit q to |0⟩. Only valid when q is not entangled (true after measuring it). */
export function resetQubit(s: QState, q: number): QState {
  return probOne(s, q) > 0.5 ? applyX(s, q) : s;
}

/** Real inner product ⟨a|b⟩. */
export function inner(a: QState, b: QState): number {
  let sum = 0;
  for (let i = 0; i < a.amp.length; i++) sum += a.amp[i] * b.amp[i];
  return sum;
}

/** Reduced single-qubit Bloch vector in the x–z plane (y is always 0 for real states). */
export function blochOf(s: QState, q: number): { x: number; z: number } {
  const bit = 1 << q;
  let z = 0;
  let x = 0;
  for (let i = 0; i < s.amp.length; i++) {
    const a = s.amp[i];
    if (i & bit) {
      z -= a * a;
    } else {
      z += a * a;
      x += 2 * a * s.amp[i | bit];
    }
  }
  return { x, z };
}

export interface Thread {
  index: number;
  amp: number;
  weight: number;
  /** Bits of the listed qubits, in the order requested. */
  bits: Array<0 | 1>;
}

/**
 * The non-zero basis components of the state — the "threads" the game shows in
 * its simulator view. `qubits` picks which qubits' bits to report per thread.
 */
export function threadsOf(s: QState, qubits: number[]): Thread[] {
  const out: Thread[] = [];
  for (let i = 0; i < s.amp.length; i++) {
    const a = s.amp[i];
    if (Math.abs(a) < 1e-6) continue;
    out.push({
      index: i,
      amp: a,
      weight: a * a,
      bits: qubits.map((q) => ((i >> q) & 1) as 0 | 1),
    });
  }
  return out;
}

export function isNear(a: number, b: number, tol = EPS): boolean {
  return Math.abs(a - b) <= tol;
}
