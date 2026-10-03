import { CircleSlash, Play, Tag, Zap } from 'lucide-react';
import { useState } from 'react';
import { ActionBar } from '../components/HUD/ActionBar';
import { MissionLayout, PanelTitle } from '../components/MissionPanel/MissionLayout';
import { LabBoard } from '../components/QuantumCircuit/LabBoard';
import { FingerprintBoard, SyndromeReadout } from '../components/SyndromePanel/SyndromePanel';
import { type FingerprintRow } from '../game/engine/diagnosis';
import { randomOf } from '../game/engine/diagnosis';
import { createLab, type LabState } from '../game/engine/lab';
import { letterPhi } from '../game/quantum/codes';
import { useLab, type LabEvent } from '../hooks/useLab';
import { useMission } from '../hooks/useMission';
import { STANDARD_PROBES } from '../data/probes';
import type { LevelDef } from '../types/game';


const ROW_LABELS: Record<string, string> = { none: 'No hit', '0': 'Q1', '1': 'Q2', '2': 'Q3' };
const fresh = () => createLab({ code: 'bit', phi: letterPhi('H'), probes: STANDARD_PROBES });

export default function Scene06({ level }: { level: LevelDef }) {
  const mission = useMission(level);
  const [tool, setTool] = useState<string | null>(null);
  const [rows, setRows] = useState<Record<string, [0 | 1, 0 | 1]>>({});
  const [pendingHit, setPendingHit] = useState<number | null>(null);
  const [mystery, setMystery] = useState<{ round: number; truth: number | null; probed: boolean }>({ round: 0, truth: null, probed: false });
  const lab = useLab(fresh, (ev, s) => handle(ev, s));
  const step = mission.stepId;

  function startMystery(round: number, previous: number | null | undefined) {
    const options: Array<number | null> = round === 0 ? [0, 1, 2] : [null, 0, 1, 2].filter((x) => x !== previous);
    const truth = randomOf(options);
    lab.replace(fresh(), { heal: true });
    setMystery({ round, truth, probed: false });
    lab.noise('X', truth, { delay: 900 });
  }

  function handle(ev: LabEvent, _state: LabState) {
    if (ev.type === 'zap') {
      setPendingHit(ev.q);
      setTool(null);
    }
    if (ev.type === 'probes-done') {
      const s1 = ev.results.s1;
      const s2 = ev.results.s2;
      if (step === 'clean' || step === 'map') {
        const key = pendingHit === null ? 'none' : String(pendingHit);
        const next = { ...rows, [key]: [s1, s2] as [0 | 1, 0 | 1] };
        setRows(next);
        mission.flash('info', `Recorded: ${ROW_LABELS[key]} → ${s1} ${s2}`, undefined, 2200);
        if (step === 'clean') {
          mission.later(() => mission.next(), 1200);
        } else {
          if (pendingHit !== null) {
            mission.later(() => {
              lab.replace(fresh(), { heal: true });
              setPendingHit(null);
              mission.say('Test shield reset.', 'note');
            }, 1300);
          }
          if (['none', '0', '1', '2'].every((k) => next[k])) {
            mission.later(() => {
              mission.showConcept('syndrome');
              mission.next();
              startMystery(0, undefined);
            }, 2200);
          }
        }
      }
      if (step === 'mystery') setMystery((m) => ({ ...m, probed: true }));
    }
  }

  function guess(q: number | null) {
    if (!mystery.probed) {
      mission.flash('info', 'Probe first', 'A tag needs evidence: run the probes.', 2200);
      return;
    }
    setTool(null);
    if (q === mystery.truth) {
      mission.flash('success', q === null ? 'Correct: no hit' : `Correct: Q${q + 1} was hit`, 'The fingerprint pointed straight at it.', 2600);
      if (mystery.round === 1) {
        mission.later(() => mission.complete(), 1200);
      } else {
        mission.later(() => startMystery(1, mystery.truth), 1800);
      }
    } else {
      mission.bump('wrongFixes');
      const s1 = lab.state.probes[0].result;
      const s2 = lab.state.probes[1].result;
      mission.flash('error', 'Not that one', `S1 S2 read ${s1} ${s2}. Find the row of your board with the same pair.`, 3600);
    }
  }

  function onQubit(q: number) {
    if (step === 'map' && tool === 'zap') {
      if (pendingHit !== null) {
        mission.flash('info', 'One hit at a time', 'Probe this hit first. The shield resets afterwards.', 2400);
        return;
      }
      lab.zap(q, 'X');
    } else if (step === 'mystery' && tool === 'tag') {
      guess(q);
    } else {
      mission.flash('info', 'Pick a tool first', undefined, 1600);
    }
  }

  const fpRows: FingerprintRow[] = ['none', '0', '1', '2'].map((k) => ({ key: k, label: ROW_LABELS[k], s1: rows[k]?.[0] ?? null, s2: rows[k]?.[1] ?? null }));
  const probes = lab.state.probes;
  const current = probes.every((p) => p.status === 'measured') ? fpRows.find((r) => r.s1 === probes[0].result && r.s2 === probes[1].result)?.key : null;

  const board = (
    <LabBoard
      api={lab}
      view={{
        threads: step !== 'mystery',
        sealed: step === 'mystery',
        dial: { mode: 'off' },
        qubitVerb: tool === 'zap' ? 'ZAP' : tool === 'tag' ? 'TAG' : null,
      }}
      onQubit={onQubit}
    />
  );

  const readout = (
    <div className="grid gap-4 @[19rem]:grid-cols-2">
      <SyndromeReadout probes={probes} />
      <FingerprintBoard rows={fpRows} highlight={step === 'mystery' ? current : null} />
    </div>
  );

  const canRun = (step === 'clean' || step === 'map' || (step === 'mystery' && !mystery.probed)) && !lab.busy;
  const actions = (
    <div>
      <PanelTitle right={step === 'mystery' ? <span className="font-mono text-[0.68rem] text-mute">mystery {mystery.round + 1}/2</span> : undefined}>Tools</PanelTitle>
      <ActionBar
        selected={tool}
        onSelect={setTool}
        onQubitKey={onQubit}
        qubitKeys={3}
        actions={[
          { id: 'zap', label: 'Zap', icon: Zap, hotkey: 'N', tone: 'noise', kind: 'tool', disabled: step !== 'map' || pendingHit !== null || lab.busy, pulse: step === 'map' && pendingHit === null && !tool },
          { id: 'run', label: 'Run probes', icon: Play, hotkey: 'P', tone: 'probe', disabled: !canRun, pulse: canRun && (step !== 'map' || pendingHit !== null), onClick: () => lab.runProbes(['s1', 's2']) },
          { id: 'tag', label: 'Tag suspect', icon: Tag, hotkey: 'G', tone: 'fix', kind: 'tool', disabled: step !== 'mystery' || !mystery.probed || lab.busy, pulse: step === 'mystery' && mystery.probed && !tool },
          { id: 'nohit', label: 'No hit', icon: CircleSlash, hotkey: 'O', tone: 'neutral', disabled: step !== 'mystery' || !mystery.probed, onClick: () => guess(null) },
        ]}
      />
    </div>
  );

  return <MissionLayout mission={mission} board={board} readout={readout} actions={actions} />;
}
