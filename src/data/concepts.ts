import type { Concept, ConceptId } from '../types/game';

/** Short cards shown right after the player experiences each idea. */
export const CONCEPTS: Record<ConceptId, Concept> = {
  qubit: {
    id: 'qubit',
    title: 'Qubit',
    lines: [
      'A bit points up (0) or down (1). Nothing else.',
      'A qubit can point anywhere in between. That direction is the message.',
      'Up = 0, down = 1. Everything else is a mix of the two.',
      '(Real qubits point anywhere on a sphere. This lab uses one circular slice of it.)',
    ],
  },
  xError: {
    id: 'xError',
    title: 'X error · bit-flip',
    lines: ['0 becomes 1. 1 becomes 0.', 'Any other direction gets mirrored top ↔ bottom.', 'Applying X again undoes it.'],
  },
  collapse: {
    id: 'collapse',
    title: 'Measurement',
    lines: [
      'Reading a qubit always gives a plain 0 or 1.',
      'The qubit is left pointing at the answer. The original direction is gone.',
      'Looking is not free. It changes what you look at.',
    ],
  },
  majority: {
    id: 'majority',
    title: 'Majority vote',
    lines: ['Three copies, one flipped: the other two outvote it.', 'Easy for ordinary bits: copy them, compare them, fix them.'],
  },
  noCloning: {
    id: 'noCloning',
    title: 'No-cloning',
    lines: [
      "No machine can copy an unknown quantum message. Physics doesn't allow it.",
      'The copier works on plain 0 and 1, and fails on everything in between.',
      "This isn't a bad copier. A perfect one can't be built.",
    ],
  },
  spread: {
    id: 'spread',
    title: 'Entanglement',
    lines: [
      'The "failed copy" spread one message across three carriers.',
      'No single carrier holds it. The message is in how they relate.',
      'In every thread, all three agree.',
    ],
  },
  shield: {
    id: 'shield',
    title: 'Three-qubit bit-flip code',
    lines: [
      "One message stored as a pattern: all-0 in one thread, all-1 in the other.",
      'A single bit-flip makes one carrier the odd one out, in every thread.',
      'Flip the odd one back and the pattern is restored.',
    ],
  },
  ancilla: {
    id: 'ancilla',
    title: 'Ancilla · helper qubit',
    lines: [
      'A spare qubit that starts at 0. Each wire is a CNOT gate: if the carrier holds 1, the helper flips.',
      'Wired to one carrier, it just copies it. Reading it is the same as reading the carrier.',
      'Wired to two, every thread gives it the same answer, so reading it is safe.',
    ],
  },
  parity: {
    id: 'parity',
    title: 'Parity',
    lines: [
      'You didn\'t ask "what is T1?"',
      'You asked "do T1 and T2 agree?"',
      'SAME → 0. DIFFERENT → 1. That indirect answer is parity.',
    ],
  },
  syndrome: {
    id: 'syndrome',
    title: 'Syndrome',
    lines: [
      'Two parity probes, two answers. Each single bit-flip gives a different pair.',
      '00 → no hit · 10 → Q1 · 11 → Q2 · 01 → Q3',
      'That fingerprint is the syndrome. It tells you about the error, not the message.',
    ],
  },
  correction: {
    id: 'correction',
    title: 'Correction',
    lines: ['Syndrome → suspect → apply the same flip again.', 'An X error is undone by an X on the same carrier.', 'Syndrome 00? Touch nothing.'],
  },
  nonDestructive: {
    id: 'nonDestructive',
    title: 'Non-destructive measurement',
    lines: [
      'You measured something real: whether pairs of carriers agree.',
      'You never measured the message itself, so it survived.',
      'Measure the error, never the data. That is the core trick of quantum error correction.',
    ],
  },
  zError: {
    id: 'zError',
    title: 'Z error · phase-flip',
    lines: [
      'No 0 turns into 1. Instead the sign between the threads flips (+ → −).',
      'On the dial: X mirrors top ↔ bottom, Z mirrors left ↔ right.',
      'Probes that compare 0s and 1s cannot see it.',
    ],
  },
  phaseShield: {
    id: 'phaseShield',
    title: 'Three-qubit phase-flip code',
    lines: [
      'The lens is a Hadamard gate. It swaps the 0/1 view and the +/− view.',
      'Seen through it, a phase-flip looks exactly like a bit-flip: same shield, same fingerprints.',
      'Phase probes are ordinary probes wrapped in lenses. The fix is a Z on the suspect carrier.',
    ],
  },
  oneShield: {
    id: 'oneShield',
    title: 'One shield, one kind of noise',
    lines: [
      'The bit shield is blind to phase-flips. The phase shield is blind to bit-flips.',
      'A three-qubit code cannot fix every error.',
      'Real quantum memory has to guard against both at once.',
    ],
  },
  shor: {
    id: 'shor',
    title: "Shor's code (1995)",
    lines: [
      'Nine qubits: three bit-flip shields, wired together as one phase-flip shield.',
      'Bit probes inside each block, phase probes between blocks.',
      'The first code that protects against any single-qubit error.',
    ],
  },
  blockPhase: {
    id: 'blockPhase',
    title: 'Shared phase',
    lines: [
      'A phase-flip on any carrier flips the sign of its whole block.',
      'So a Z on any carrier of that block undoes it.',
      'Phase probes tell you which block, and that is all you need.',
    ],
  },
  threshold: {
    id: 'threshold',
    title: 'Faster than the noise',
    lines: [
      'A three-qubit shield fixes ONE flip. Two flips before a repair and the majority is wrong.',
      'The fingerprint then points at the innocent carrier.',
      'Error correction only works if you repair faster than errors arrive.',
    ],
  },
};
