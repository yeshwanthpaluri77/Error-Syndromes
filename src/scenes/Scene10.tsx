import { FlipVertical2, Send, Waves } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActionBar } from '../components/HUD/ActionBar';
import { MissionLayout, PanelTitle } from '../components/MissionPanel/MissionLayout';
import type { DialView } from '../components/QuantumCircuit/LabBoard';
import { ShorBoard } from '../components/QuantumCircuit/ShorBoard';
import { randomLetter, randomOf } from '../game/engine/diagnosis';
import type { ErrorKind } from '../game/engine/lab';
import { CHARGES, describeHit, freshShor, shorFailureLines, wrongShorFix, type ShorRound } from '../game/engine/shor';
import { ShorSyndrome } from '../components/SyndromePanel/ShorSyndrome';
import { letterPos } from '../game/quantum/codes';
import { useLab, type LabEvent } from '../hooks/useLab';
import { useMission, type MissionApi } from '../hooks/useMission';
import type { LevelDef } from '../types/game';

function useShorRounds(mission: MissionApi, rounds: ShorRound[]) {
  const [round, setRound] = useState(0);
  const [charges, setCharges] = useState(CHARGES);
  const [fixes, setFixes] = useState<Array<{ q: number; kind: ErrorKind }>>([]);
  const [result, setResult] = useState<number | null | undefined>(undefined);
  const roundRef = useRef(0);
  const fixesRef = useRef(fixes);
  fixesRef.current = fixes;
  const lab = useLab(() => freshShor(rounds[0].letter), (ev) => handle(ev));

  function start(i: number, delay = 1100) {
    roundRef.current = i;
    setRound(i);
    setCharges(CHARGES);
    setFixes([]);
    setResult(undefined);
    lab.replace(freshShor(rounds[i].letter), { heal: i > 0 });
    const r = rounds[i];
    lab.noise(r.kinds[0], r.q, { visual: 'unknown', extra: r.kinds.slice(1), delay });
  }

  function handle(ev: LabEvent) {
    if (ev.type === 'noise') lab.checkpoint();
    if (ev.type === 'probes-done') mission.bump('probeRuns', 1);
    if (ev.type === 'fix') setFixes((f) => [...f, { q: ev.q, kind: ev.kind }]);
    if (ev.type === 'transmit') {
      const r = rounds[roundRef.current];
      const pos = ev.readout.pos;
      setResult(pos);
      if (pos === letterPos(r.letter)) {
        mission.flash('success', 'Signal restored', `It was ${describeHit(r)}. Delivered: ${r.letter}.`, 3600);
        if (roundRef.current === 0) mission.showConcept('shor');
        if (r.kinds.includes('Z')) mission.showConcept('blockPhase');
        const nextRound = roundRef.current + 1;
        mission.later(() => (nextRound < rounds.length ? start(nextRound) : mission.complete()), 2600);
      } else {
        mission.bump('failedTransmits');
        if (wrongShorFix(r, fixesRef.current)) mission.bump('wrongFixes');
        mission.fail({ title: 'Transmission failed', lines: shorFailureLines(r, fixesRef.current, pos) });
      }
    }
  }

  function probe(id: string) {
    if (charges <= 0) {
      mission.flash('warn', 'Out of probe charges', 'Make your best call with the evidence you have.', 2600);
      return;
    }
    if (lab.busy || result !== undefined) return;
    setCharges((c) => c - 1);
    lab.runProbes([id]);
  }

  function retry() {
    lab.rewind();
    lab.update((s) => ({ ...s, probes: s.probes.map((p) => ({ ...p, status: 'idle', result: null })) }));
    setFixes([]);
    setResult(undefined);
    setCharges(CHARGES);
  }

  return { lab, round, charges, fixes, result, start, probe, retry, spec: rounds[round] };
}

export default function Scene10({ level }: { level: LevelDef }) {
  const mission = useMission(level);
  const [tool, setTool] = useState<string | null>(null);
  const rounds = useMemo<ShorRound[]>(
    () => [
      { q: randomOf([0, 1, 2, 3, 4, 5, 6, 7, 8]), kinds: ['X'], letter: randomLetter(['N']) },
      { q: randomOf([0, 1, 2, 3, 4, 5, 6, 7, 8]), kinds: ['Z'], letter: randomLetter(['N']) },
      { q: randomOf([0, 1, 2, 3, 4, 5, 6, 7, 8]), kinds: randomOf<ErrorKind[]>([['X'], ['Z'], ['X', 'Z']]), letter: 'N' },
    ],
    [],
  );
  const s = useShorRounds(mission, rounds);

  useEffect(() => {
    s.start(0, 2600);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const done = s.result !== undefined;
  const busy = s.lab.busy || done;
  const target = letterPos(s.spec.letter);

  function onQubit(q: number) {
    if (busy) return;
    if (tool === 'flip') s.lab.fix(q, 'X');
    else if (tool === 'zfix') s.lab.fix(q, 'Z');
    else mission.flash('info', 'Pick a tool first', 'Click a probe ◇ to run it, or pick a repair tool.', 2200);
  }

  const dial: DialView = done
    ? {
        mode: 'fixed',
        fixedPhi: s.result === null ? null : ((s.result as number) * Math.PI) / 12,
        fixedUnreadable: s.result === null,
        tone: s.result === target ? 'ok' : 'bad',
        highlightPos: s.result ?? null,
        caption: s.result === target ? `DELIVERED · ${s.spec.letter} ✓` : 'FAILED',
        captionTone: s.result === target ? 'ok' : 'bad',
      }
    : { mode: 'sealed', caption: `SIGNAL ${s.round + 1}/3` };

  const board = (
    <ShorBoard
      api={s.lab}
      dial={dial}
      qubitVerb={tool === 'flip' ? 'FLIP' : tool === 'zfix' ? 'Z' : null}
      onQubit={onQubit}
      onProbe={s.probe}
      disabledProbes={busy || s.charges <= 0}
    />
  );

  const readout = <ShorSyndrome lab={s.lab.state} charges={s.charges} />;
  const actions = (
    <div>
      <PanelTitle right={<span className="font-mono text-[0.68rem] text-mute">signal {s.round + 1}/3 · fixes {s.fixes.length}</span>}>Repair tools</PanelTitle>
      <ActionBar
        selected={tool}
        onSelect={setTool}
        actions={[
          { id: 'flip', label: 'Flip (X)', icon: FlipVertical2, hotkey: 'X', tone: 'fix', kind: 'tool', disabled: busy },
          { id: 'zfix', label: 'Phase fix (Z)', icon: Waves, hotkey: 'Z', tone: 'phase', kind: 'tool', disabled: busy },
          { id: 'send', label: 'Transmit', icon: Send, hotkey: 'T', tone: 'primary', disabled: busy, onClick: s.lab.transmit },
        ]}
      />
      <p className="mt-3 text-sm text-mute">Click any ◇ on the board to run that probe (1 charge each).</p>
    </div>
  );

  return <MissionLayout mission={mission} board={board} readout={readout} actions={actions} onRetry={s.retry} />;
}

