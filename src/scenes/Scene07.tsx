import { FlipVertical2, Play, Send } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { ActionBar } from '../components/HUD/ActionBar';
import { MissionLayout, PanelTitle } from '../components/MissionPanel/MissionLayout';
import { LabBoard } from '../components/QuantumCircuit/LabBoard';
import { FingerprintBoard, SyndromeReadout } from '../components/SyndromePanel/SyndromePanel';
import { FULL_FINGERPRINTS, freshReadings, matchFingerprint } from '../game/engine/diagnosis';
import { randomLetter, randomOf } from '../game/engine/diagnosis';
import { useMission } from '../hooks/useMission';
import { STANDARD_PROBES } from '../data/probes';
import type { LevelDef } from '../types/game';
import { useRepairRounds, type RoundSpec } from './shared/useRepairRounds';

export default function Scene07({ level }: { level: LevelDef }) {
  const mission = useMission(level);
  const [tool, setTool] = useState<string | null>(null);
  const rounds = useMemo<RoundSpec[]>(() => {
    const first = randomOf([0, 1, 2]);
    const third = randomOf([0, 1, 2].filter((q) => q !== first));
    return [
      { hit: first, letter: randomLetter(['E']) },
      { hit: null, letter: randomLetter(['E']) },
      { hit: third, letter: 'E' },
    ];
  }, []);

  const r = useRepairRounds({
    mission,
    code: 'bit',
    probes: STANDARD_PROBES,
    kind: 'X',
    rounds,
    onRoundDelivered: (i, spec) => {
      setTool(null);
      if (i === 0) mission.showConcept('correction');
      if (spec.hit === null) mission.say('Syndrome 0 0, nothing touched, delivered intact. Doing nothing was the right repair.', 'good');
      if (i < rounds.length - 1) mission.say(`Signal ${i + 2} incoming…`, 'note');
    },
    onAllDone: () => mission.complete(),
  });

  useEffect(() => {
    r.start(0, 1400);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lab = r.lab;
  const probes = lab.state.probes;
  const [s1, s2] = freshReadings(probes);
  const stale = probes.some((p) => p.stale);
  const match = matchFingerprint(s1, s2);

  function onQubit(q: number) {
    if (tool === 'flip' && !r.delivered) r.fix(q);
    else mission.flash('info', 'Carriers are sealed', 'Use RUN PROBES to learn about them, and FLIP to repair.', 2200);
  }

  const busy = lab.busy || r.delivered;
  const board = <LabBoard api={lab} view={{ sealed: true, dial: r.dial, qubitVerb: tool === 'flip' ? 'FLIP' : null }} onQubit={onQubit} />;

  const readout = (
    <div className="grid gap-4 @[19rem]:grid-cols-2">
      <SyndromeReadout
        probes={probes}
        status={
          stale
            ? { text: 'FIX APPLIED · TRANSMIT OR RE-PROBE', tone: 'ok' }
            : match === null
            ? { text: 'UNKNOWN', tone: 'mute' }
            : match === 'none'
              ? { text: 'NO BIT-FLIP DETECTED', tone: 'ok' }
              : { text: `FINGERPRINT POINTS AT Q${Number(match) + 1}`, tone: 'warn' }
        }
      />
      <FingerprintBoard rows={FULL_FINGERPRINTS} highlight={match} title="Your fingerprint board" />
    </div>
  );

  const actions = (
    <div>
      <PanelTitle right={<span className="font-mono text-[0.68rem] text-mute">signal {r.round + 1}/3 · fixes {r.fixes.length}</span>}>Repair tools</PanelTitle>
      <ActionBar
        selected={tool}
        onSelect={setTool}
        onQubitKey={onQubit}
        qubitKeys={3}
        actions={[
          { id: 'run', label: 'Run probes', icon: Play, hotkey: 'P', tone: 'probe', disabled: busy, pulse: !r.probed && !busy, onClick: () => lab.runProbes(['s1', 's2']) },
          { id: 'flip', label: 'Flip (X)', icon: FlipVertical2, hotkey: 'X', tone: 'fix', kind: 'tool', disabled: busy },
          { id: 'send', label: 'Transmit', icon: Send, hotkey: 'T', tone: 'primary', disabled: busy, pulse: r.probed && !busy, onClick: r.transmit },
        ]}
      />
      <p className="mt-3 text-sm text-mute">Probe, read the fingerprint, fix (or don't), transmit.</p>
    </div>
  );

  return <MissionLayout mission={mission} board={board} readout={readout} actions={actions} onRetry={r.retry} />;
}
