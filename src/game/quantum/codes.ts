/**
 * Encodings ("shields") used in the game, plus the cipher-ring readout that
 * turns a logical qubit state into a letter on the receiver dial.
 */
import {
  applyCNOT,
  applyH,
  fromAmplitudes,
  inner,
  type QState,
} from './statevector';

/**
 * single — one bare qubit, no protection
 * bit    — three-qubit bit-flip code: α|000⟩ + β|111⟩
 * phase  — three-qubit phase-flip code: α|+++⟩ + β|−−−⟩
 * shor   — Shor's nine-qubit code (three bit-flip blocks inside a phase-flip code)
 * plain  — classical test bench: data qubits hold plain 0/1 values
 */
export type CodeKind = 'single' | 'bit' | 'phase' | 'shor' | 'plain';

/**
 * The receiver dial. A message is a direction in the x–z plane of the Bloch
 * sphere; the ring divides it into 24 positions, 15° apart.
 * Top = 0, bottom = 1, right = +, left = −. Letters sit everywhere else, so
 * both kinds of error (top↔bottom mirror for X, left↔right mirror for Z) turn
 * a letter into a different letter.
 */
export const RING = [
  '0', 'S', 'K', 'T', 'E', 'A', '+', 'Y', 'D', 'C', 'F', 'O',
  '1', 'H', 'G', 'B', 'I', 'R', '−', 'L', 'N', 'M', 'P', 'U',
] as const;

export const RING_STEP = Math.PI / 12;

export const LETTER_POSITIONS = RING.map((_, i) => i).filter((i) => i % 6 !== 0);

export function letterPos(letter: string): number {
  const i = RING.indexOf(letter as (typeof RING)[number]);
  if (i < 0) throw new Error(`Letter ${letter} is not on the ring`);
  return i;
}

export function posToPhi(pos: number): number {
  return pos * RING_STEP;
}

export function letterPhi(letter: string): number {
  return posToPhi(letterPos(letter));
}

export function phiToPos(phi: number): number {
  const p = Math.round(phi / RING_STEP);
  return ((p % 24) + 24) % 24;
}

/** Amplitudes (α, β) of a message pointing at angle φ (0 = up, clockwise). */
export function messageAmps(phi: number): [number, number] {
  return [Math.cos(phi / 2), Math.sin(phi / 2)];
}

export function dataCount(code: CodeKind): number {
  switch (code) {
    case 'single':
      return 1;
    case 'shor':
      return 9;
    default:
      return 3;
  }
}

/** Put the message on qubit 0 and run the encoder for `code`. Other qubits start at 0. */
export function encodedState(code: CodeKind, phi: number, nTotal: number): QState {
  const [a, b] = messageAmps(phi);
  let s = fromAmplitudes(nTotal, [
    [0, a],
    [1, b],
  ]);
  if (code === 'bit' || code === 'phase') {
    s = applyCNOT(s, 0, 1);
    s = applyCNOT(s, 0, 2);
    if (code === 'phase') {
      s = applyH(s, 0);
      s = applyH(s, 1);
      s = applyH(s, 2);
    }
  } else if (code === 'shor') {
    s = applyCNOT(s, 0, 3);
    s = applyCNOT(s, 0, 6);
    for (const q of [0, 3, 6]) s = applyH(s, q);
    for (const head of [0, 3, 6]) {
      s = applyCNOT(s, head, head + 1);
      s = applyCNOT(s, head, head + 2);
    }
  }
  return s;
}

const codewordCache = new Map<string, [QState, QState]>();

export function codewords(code: CodeKind, nTotal: number): [QState, QState] {
  const key = `${code}:${nTotal}`;
  let cw = codewordCache.get(key);
  if (!cw) {
    cw = [encodedState(code, 0, nTotal), encodedState(code, Math.PI, nTotal)];
    codewordCache.set(key, cw);
  }
  return cw;
}

export interface Readout {
  /** How much of the state lies inside the protected code space (1 = fully). */
  inCode: number;
  /** Direction of the decoded message, if readable. */
  phi: number;
  /** Ring position the arrow points to, or null when unreadable. */
  pos: number | null;
  /** Arrow length 0..1 (shrinks when the state leaks out of the code space). */
  length: number;
}

/**
 * Decode the logical message: project onto the two codewords and turn the
 * resulting (a, b) into a direction. A state with an uncorrected error sits
 * outside the code space and is reported as unreadable.
 * Assumes ancillas are back in |0⟩.
 */
export function readout(s: QState, code: CodeKind): Readout {
  const [c0, c1] = codewords(code === 'plain' ? 'bit' : code, s.n);
  const a = inner(c0, s);
  const b = inner(c1, s);
  const inCode = a * a + b * b;
  if (inCode < 0.5) return { inCode, phi: 0, pos: null, length: 0 };
  const x = (2 * a * b) / inCode;
  const z = (a * a - b * b) / inCode;
  const phi = Math.atan2(x, z);
  return { inCode, phi, pos: phiToPos(phi), length: inCode };
}

/** Fidelity with the ideal encoded message (1 = perfectly preserved). */
export function fidelity(s: QState, code: CodeKind, phi: number): number {
  const ideal = encodedState(code, phi, s.n);
  const o = inner(ideal, s);
  return o * o;
}

export function mirrorX(pos: number): number {
  return (((12 - pos) % 24) + 24) % 24;
}

export function mirrorZ(pos: number): number {
  return (24 - pos) % 24;
}
