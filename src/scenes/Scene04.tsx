import { Gauge, Play, Zap } from 'lucide-react';
import { useState } from 'react';
import { ActionBar } from '../components/HUD/ActionBar';
import { ContinueButton, MissionLayout, PanelTitle } from '../components/MissionPanel/MissionLayout';
import { LabBoard } from '../components/QuantumCircuit/LabBoard';
import { createLab, liveReadout, threads, type LabState } from '../game/engine/lab';
import { RING, letterPhi, letterPos } from '../game/quantum/codes';
import { useLab, type LabEvent } from '../hooks/useLab';
import { useMission } from '../hooks/useMission';
import type { LevelDef } from '../types/game';

const C = letterPos('C');
const PROBE = [{ id: 'h', label: 'HELPER', targets: [] as number[], basis: 'Z' as const, editable: true }];

function sameTargets(a: number[], b: number[]) {
  return a.length === b.length && a.every((x, i) => x === b[i]);
}

export default function Scene04({ level }: { level: LevelDef }) {
  const mission = useMission(level);
  const [tool, setTool] = useState<string | null>(null);
  const [zapped, setZapped] = useState(false);
  const lab = useLab(() => createLab({ code: 'bit', phi: letterPhi('C'), probes: PROBE }), (ev, s) => handle(ev, s));
  const step = mission.stepId;
  const probe = lab.state.probes[0];

  function handle(ev: LabEvent, state: LabState) {
    if (ev.type === 'entangled') {
      if (step === 'single') mission.next();
      if (step === 'pair') mission.next();
      if (step === 'zapped') mission.say('Helper row: 1 in thread A, 1 in thread B. Same in both threads again.', 'note');
    }
    if (ev.type === 'measured') {
      if (ev.disturbed) {
        // Guided failure: part of the lesson, so it does not count against the rating.
        mission.fail({
          title: 'The message collapsed',
          lines: [
            'What happened?',
            `The helper copied Q1, and the threads disagreed about it: 0 in one, 1 in the other. Reading it gave ${ev.outcome}.`,
            'That forced a choice between threads, exactly like reading Q1 directly. One thread was erased, and the message went with it.',
            'Watch the receiver: it now points at a plain 0 or 1.',
          ],
          action: 'Rewind',
        });
        return;
      }
      if (step === 'measure2') {
        mission.flash('success', `Helper read: ${ev.outcome}. Message intact.`, 'Both threads agreed, so reading the helper forced no choice.', 3600);
        mission.showConcept('ancilla');
        mission.later(() => mission.next(), 1600);
      }
      if (step === 'zapped' && zapped) {
        mission.flash('success', `Helper read: ${ev.outcome}`, 'It changed from 0 to 1 because of the hit, and nothing collapsed.', 3600);
        mission.later(() => mission.next(), 1400);
      }
      void state;
    }
    if (ev.type === 'zap') {
      setZapped(true);
      setTool(null);
    }
  }

  function run() {
    const t = probe.targets;
    if (step === 'single' && !sameTargets(t, [0])) {
      mission.flash('warn', 'Wire Q1 only', 'For this first test the helper should touch Q1 and nothing else.', 3000);
      return;
    }
    if (step === 'pair' && !sameTargets(t, [0, 1])) {
      mission.flash('warn', 'Exactly two: Q1 and Q2', t.length < 2 ? 'Add a second wire.' : 'Remove the extra wire.', 3000);
      return;
    }
    if (step === 'zapped' && !zapped) {
      mission.flash('info', 'Zap Q1 first', 'Hit Q1 with noise, then probe.', 2400);
      return;
    }
    lab.checkpoint();
    lab.entangle('h');
  }

  function onQubit(q: number) {
    if (tool !== 'zap' || step !== 'zapped' || zapped) return;
    if (q !== 0) {
      mission.flash('info', 'Q1 for this test', 'The helper watches Q1 and Q2. Hit Q1.', 2200);
      return;
    }
    lab.zap(0, 'X');
  }

  function onPort(id: string, q: number) {
    if (!(step === 'single' || step === 'pair')) return;
    lab.wire(id, q);
  }

  function retry() {
    lab.rewind();
    lab.update((s) => ({ ...s, probes: s.probes.map((p) => ({ ...p, status: 'idle', result: null })) }));
    mission.goTo('pair');
  }

  const helperValues = threads(lab.state).map((t) => t.anc[0]);
  const agree = new Set(helperValues).size <= 1;
  const live = liveReadout(lab.state);
  const canWire = step === 'single' || step === 'pair';

  const board = (
    <LabBoard
      api={lab}
      view={{
        threads: true,
        helperRow: true,
        dial: {
          mode: 'live',
          ghostPos: C,
          highlightPos: live.pos,
          tone: live.pos === C ? 'ok' : 'bad',
          caption: live.pos === null ? 'LIVE DECODE · DAMAGED' : `LIVE DECODE · ${RING[live.pos]}`,
          captionTone: live.pos === C ? 'ok' : 'bad',
        },
        highlightPorts: step === 'single' ? { h: [0] } : step === 'pair' ? { h: [0, 1] } : undefined,
        highlightQubits: step === 'zapped' && tool === 'zap' ? [0] : [],
        qubitVerb: tool === 'zap' ? 'ZAP' : null,
      }}
      onQubit={onQubit}
      onPort={canWire ? onPort : undefined}
    />
  );

  const readout = (
    <div>
      <PanelTitle>Helper ◇</PanelTitle>
      <div className="flex flex-wrap items-center gap-3">
        <div className="rounded-xl border border-probe/25 px-3 py-2">
          <p className="font-mono text-[0.62rem] tracking-widest text-mute uppercase">Wired to</p>
          <p className="font-mono text-lg font-bold text-probe">{probe.targets.length ? probe.targets.map((t) => `Q${t + 1}`).join(' + ') : '—'}</p>
        </div>
        <div className="rounded-xl border border-probe/25 px-3 py-2">
          <p className="font-mono text-[0.62rem] tracking-widest text-mute uppercase">State</p>
          <p className="font-mono text-lg font-bold text-white">
            {probe.status === 'entangled' ? (agree ? 'same in all threads' : 'threads disagree') : probe.status === 'measured' ? `read ${probe.result}` : 'starts at 0'}
          </p>
        </div>
      </div>
      <p className="mt-2 text-sm text-mute">RUN wires the helper in. MEASURE reads the helper, and only the helper.</p>
    </div>
  );

  const actions = (
    <div>
      <PanelTitle>Probe controls</PanelTitle>
      <ActionBar
        selected={tool}
        onSelect={setTool}
        onQubitKey={onQubit}
        qubitKeys={3}
        actions={[
          { id: 'zap', label: 'Zap', icon: Zap, hotkey: 'N', tone: 'noise', kind: 'tool', disabled: step !== 'zapped' || zapped || lab.busy, pulse: step === 'zapped' && !zapped && !tool },
          {
            id: 'run',
            label: 'Run',
            icon: Play,
            hotkey: 'P',
            tone: 'probe',
            disabled: !(step === 'single' || step === 'pair' || (step === 'zapped' && zapped)) || probe.status === 'entangled' || probe.targets.length === 0 || lab.busy,
            pulse: (step === 'single' || step === 'pair' || step === 'zapped') && probe.targets.length > 0 && probe.status !== 'entangled',
            onClick: run,
          },
          {
            id: 'measure',
            label: 'Measure helper',
            icon: Gauge,
            hotkey: 'M',
            tone: 'probe',
            disabled: probe.status !== 'entangled' || lab.busy,
            pulse: probe.status === 'entangled',
            onClick: () => lab.measure('h'),
          },
        ]}
      />
      <p className="mt-3 text-sm text-mute">{canWire ? 'Click the + sockets on the helper column to wire it to carriers.' : 'Sockets locked for this test.'}</p>
    </div>
  );

  return (
    <MissionLayout
      mission={mission}
      board={board}
      readout={readout}
      actions={actions}
      onRetry={retry}
      objectiveExtra={step === 'wonder' ? <ContinueButton onClick={mission.complete} label="Finish mission" /> : null}
    />
  );
}
