import { useRef, useState } from 'react';
import type { DialView } from '../../components/QuantumCircuit/LabBoard';
import { explainRepair } from '../../game/engine/diagnosis';
import { createLab, type ErrorKind, type LabState, type ProbeDef } from '../../game/engine/lab';
import { RING, letterPhi, letterPos } from '../../game/quantum/codes';
import { useLab, type LabApi, type LabEvent } from '../../hooks/useLab';
import type { MissionApi } from '../../hooks/useMission';

export interface RoundSpec {
  hit: number | null;
  letter: string;
}

interface Options {
  mission: MissionApi;
  code: 'bit' | 'phase';
  probes: ProbeDef[];
  kind: ErrorKind;
  rounds: RoundSpec[];
  onRoundDelivered?: (round: number, spec: RoundSpec) => void;
  onAllDone: () => void;
  /** Extra event handling (e.g. scene-specific commentary). */
  onEvent?: (ev: LabEvent, state: LabState) => void;
}

export interface RepairRounds {
  lab: LabApi;
  round: number;
  spec: RoundSpec;
  fixes: number[];
  probed: boolean;
  delivered: boolean;
  dial: DialView;
  start: (round: number, delay?: number) => void;
  fix: (q: number) => void;
  read: (q: number) => void;
  transmit: () => void;
  retry: () => void;
}

function collapseLines(state: LabState, labels: string[]): string[] {
  const bad = state.probes.find((p) => p.status === 'measured' && p.targets.length !== 2);
  if (!bad) return ['A measurement had to choose between threads, and the message collapsed.'];
  const wired = bad.targets.map((t) => labels[t]).join(' + ');
  if (bad.targets.length === 1) {
    return [
      `Helper ${bad.label} was wired to a single carrier (${wired}).`,
      'A helper on one carrier just copies it. Reading that helper is reading the carrier, and the message collapsed.',
      'Wire each helper to exactly two carriers: ask whether they agree, not what they are.',
    ];
  }
  return [
    `Helper ${bad.label} was wired to all three carriers.`,
    'Across all three, the threads disagree: 000 gives 0, 111 gives 1. So that helper asked which thread you are in, and that is the message itself.',
    'Wire each helper to exactly two carriers.',
  ];
}

export function useRepairRounds({ mission, code, probes, kind, rounds, onRoundDelivered, onAllDone, onEvent }: Options): RepairRounds {
  const [round, setRound] = useState(0);
  const [fixes, setFixes] = useState<number[]>([]);
  const [probed, setProbed] = useState(false);
  const [delivered, setDelivered] = useState(false);
  const [result, setResult] = useState<{ pos: number | null } | null>(null);
  const roundRef = useRef(0);
  const fixesRef = useRef<number[]>([]);
  fixesRef.current = fixes;
  const labels = ['Q1', 'Q2', 'Q3'];

  const lab = useLab(
    () => createLab({ code, phi: letterPhi(rounds[0].letter), probes }),
    (ev, state) => handle(ev, state),
  );

  const spec = rounds[round];

  function start(i: number, delay = 1000) {
    roundRef.current = i;
    setRound(i);
    setFixes([]);
    setProbed(false);
    setDelivered(false);
    setResult(null);
    const wiring = lab.state.probes.map((p) => p.targets);
    const defs = probes.map((p, k) => ({ ...p, targets: p.editable ? (wiring[k] ?? p.targets) : p.targets }));
    lab.replace(createLab({ code, phi: letterPhi(rounds[i].letter), probes: defs }), { heal: i > 0 });
    lab.noise(kind, rounds[i].hit, { delay });
  }

  function handle(ev: LabEvent, state: LabState) {
    onEvent?.(ev, state);
    if (ev.type === 'noise') lab.checkpoint();
    if (ev.type === 'probes-done') {
      mission.bump('probeRuns', Object.keys(ev.results).length);
      setProbed(true);
      if (ev.disturbed) {
        mission.bump('collapses');
        mission.fail({ title: 'The message collapsed', lines: ['What happened?', ...collapseLines(state, labels)] });
        return;
      }
      const measured = state.probes.filter((p) => p.status === 'measured');
      const pairs = measured.map((p) => p.targets.join(','));
      const ones = measured.filter((p) => p.result === 1);
      if (measured.length === 2 && pairs[0] === pairs[1]) {
        mission.flash('warn', 'Not enough information', 'Both helpers asked the same question. Rewire one to a different pair.', 4200);
      } else if (ones.length) {
        const p = ones[0];
        mission.flash('success', 'Syndrome detected', `${p.label}: ${p.targets.map((t) => labels[t]).join(' ↔ ')} · DIFFERENT. Useful information.`, 3200);
      } else {
        mission.flash('info', `Syndrome ${measured.map(() => 0).join(' ')}`, `No ${kind === 'X' ? 'bit' : 'phase'}-flip detected by these probes.`, 3000);
      }
    }
    if (ev.type === 'read' && ev.disturbed) {
      mission.bump('collapses');
      mission.fail({
        title: 'The message collapsed',
        lines: [
          'What happened?',
          `You read Q${ev.q + 1} directly and got ${ev.outcome}.`,
          'That told you something about one carrier, and destroyed the message you were protecting: every thread that disagreed with your answer was erased.',
          'Use a helper probe instead. It asks how carriers compare, never what they hold.',
        ],
      });
    }
    if (ev.type === 'fix') setFixes((f) => [...f, ev.q]);
    if (ev.type === 'transmit') {
      const target = letterPos(rounds[roundRef.current].letter);
      setResult({ pos: ev.readout.pos });
      if (ev.readout.pos === target) {
        setDelivered(true);
        mission.flash('success', 'Signal restored', `✓ Error diagnosed  ✓ Correction applied  ✓ Delivered: ${rounds[roundRef.current].letter}`, 3200);
        onRoundDelivered?.(roundRef.current, rounds[roundRef.current]);
        const nextRound = roundRef.current + 1;
        mission.later(() => (nextRound < rounds.length ? start(nextRound) : onAllDone()), 2200);
      } else {
        const hits = rounds[roundRef.current].hit === null ? [] : [rounds[roundRef.current].hit as number];
        const allFixes = fixesRef.current;
        if (allFixes.some((q) => !hits.includes(q))) mission.bump('wrongFixes');
        mission.bump('failedTransmits');
        const got = ev.readout.pos === null ? 'an unreadable signal' : `the letter ${RING[ev.readout.pos]}`;
        mission.fail({
          title: 'Transmission failed',
          lines: [`The receiver got ${got}.`, ...explainRepair(hits, allFixes, code === 'bit' ? 'bit' : 'phase')],
        });
      }
    }
  }

  function retry() {
    const wiring = lab.state.probes.map((p) => p.targets);
    lab.rewind();
    lab.update((s) => ({
      ...s,
      probes: s.probes.map((p, i) => ({ ...p, targets: p.editable ? wiring[i] : p.targets, status: 'idle', result: null })),
    }));
    setFixes([]);
    setProbed(false);
    setResult(null);
  }

  const target = letterPos(spec.letter);
  const dial: DialView = result
    ? {
        mode: 'fixed',
        fixedPhi: result.pos === null ? null : (result.pos * Math.PI) / 12,
        fixedUnreadable: result.pos === null,
        tone: result.pos === target ? 'ok' : 'bad',
        highlightPos: result.pos,
        caption: result.pos === target ? `DELIVERED · ${spec.letter} ✓` : result.pos === null ? 'UNREADABLE' : `RECEIVED ${RING[result.pos]} ✕`,
        captionTone: result.pos === target ? 'ok' : 'bad',
      }
    : { mode: 'sealed', caption: `SIGNAL ${round + 1}/${rounds.length}` };

  return {
    lab,
    round,
    spec,
    fixes,
    probed,
    delivered,
    dial,
    start,
    fix: (q) => lab.fix(q, kind),
    read: (q) => lab.read(q, code === 'bit' ? 'Z' : 'X'),
    transmit: lab.transmit,
    retry,
  };
}
