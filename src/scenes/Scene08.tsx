import { Eye, FlipVertical2, Play, Send } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { ActionBar } from '../components/HUD/ActionBar';
import { MissionLayout, PanelTitle } from '../components/MissionPanel/MissionLayout';
import { LabBoard } from '../components/QuantumCircuit/LabBoard';
import { SyndromeReadout } from '../components/SyndromePanel/SyndromePanel';
import { randomLetter, randomOf } from '../game/engine/diagnosis';
import { useMission } from '../hooks/useMission';
import type { LevelDef } from '../types/game';
import { useRepairRounds, type RoundSpec } from './shared/useRepairRounds';

const OPEN_PROBES = [
  { id: 'h1', label: 'H1', targets: [] as number[], basis: 'Z' as const, editable: true },
  { id: 'h2', label: 'H2', targets: [] as number[], basis: 'Z' as const, editable: true },
];

/** For any wiring, what each single bit-flip would read: lets the panel reason with the player's own probes. */
function predictedTable(targets: number[][]) {
  const rows = [null, 0, 1, 2].map((hit) => ({
    hit,
    reading: targets.map((t) => (hit === null ? 0 : t.filter((q) => q === hit).length % 2)),
  }));
  return rows;
}

export default function Scene08({ level }: { level: LevelDef }) {
  const mission = useMission(level);
  const [tool, setTool] = useState<string | null>(null);
  const rounds = useMemo<RoundSpec[]>(() => {
    const a = randomOf([0, 1, 2]);
    return [
      { hit: a, letter: randomLetter(['R']) },
      { hit: randomOf([0, 1, 2].filter((q) => q !== a)), letter: 'R' },
    ];
  }, []);

  const r = useRepairRounds({
    mission,
    code: 'bit',
    probes: OPEN_PROBES,
    kind: 'X',
    rounds,
    onRoundDelivered: (i) => {
      setTool(null);
      if (i === 0) {
        mission.showConcept('nonDestructive');
        mission.say('Repaired without a single look at the message. Your wiring stays for the next signal.', 'good');
      }
    },
    onAllDone: () => mission.complete(),
  });

  useEffect(() => {
    r.start(0, 1400);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lab = r.lab;
  const probes = lab.state.probes;
  const wiredOk = probes.every((p) => p.targets.length > 0);
  const busy = lab.busy || r.delivered;
  const anyMeasured = probes.some((p) => p.status === 'measured');
  const reading = probes.map((p) => (p.status === 'measured' ? p.result : null));
  const table = predictedTable(probes.map((p) => p.targets));
  const pairsOk = probes.every((p) => p.targets.length === 2) && probes[0].targets.join() !== probes[1].targets.join();

  function onQubit(q: number) {
    if (busy) return;
    if (tool === 'flip') r.fix(q);
    else if (tool === 'read') r.read(q);
    else mission.flash('info', 'Pick a tool first', undefined, 1600);
  }

  const board = (
    <LabBoard
      api={lab}
      view={{ sealed: true, dial: r.dial, qubitVerb: tool === 'flip' ? 'FLIP' : tool === 'read' ? 'READ' : null }}
      onQubit={onQubit}
      onPort={busy ? undefined : (id, q) => lab.wire(id, q)}
    />
  );

  const readout = (
    <div className="grid gap-4 @[19rem]:grid-cols-2">
      <SyndromeReadout probes={probes} />
      <div>
        <PanelTitle>Your wiring predicts</PanelTitle>
        {pairsOk && mission.hintLevel >= 2 ? (
          <table className="w-full border-separate border-spacing-y-1 font-mono text-[0.78rem]">
            <tbody>
              {table.map((row) => {
                const hl = anyMeasured && row.reading.every((v, i) => reading[i] === v);
                return (
                  <tr key={String(row.hit)} className={hl ? 'text-noise' : 'text-slate-200'}>
                    <td className={`rounded-l-lg px-2 py-1 ${hl ? 'bg-noise/10' : 'bg-white/[0.03]'}`}>{row.hit === null ? 'No hit' : `Q${row.hit + 1}`}</td>
                    <td className={`rounded-r-lg px-2 py-1 text-right ${hl ? 'bg-noise/10' : 'bg-white/[0.03]'}`}>{row.reading.join(' ')}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-mute">
            {pairsOk ? 'Work out what each possible hit would do to your two helpers. (Hint 2 unlocks a table.)' : 'Wire both helpers first. Each needs carriers to compare.'}
          </p>
        )}
      </div>
    </div>
  );

  const actions = (
    <div>
      <PanelTitle right={<span className="font-mono text-[0.68rem] text-mute">signal {r.round + 1}/2</span>}>Repair tools</PanelTitle>
      <ActionBar
        selected={tool}
        onSelect={setTool}
        onQubitKey={onQubit}
        qubitKeys={3}
        actions={[
          { id: 'run', label: 'Run probes', icon: Play, hotkey: 'P', tone: 'probe', disabled: busy || !probes.some((p) => p.targets.length), pulse: wiredOk && !r.probed && !busy, onClick: () => lab.runProbes(['h1', 'h2']) },
          { id: 'flip', label: 'Flip (X)', icon: FlipVertical2, hotkey: 'X', tone: 'fix', kind: 'tool', disabled: busy },
          { id: 'read', label: 'Read (fast)', icon: Eye, hotkey: 'R', tone: 'danger', kind: 'tool', disabled: busy, title: 'Directly measure a carrier' },
          { id: 'send', label: 'Transmit', icon: Send, hotkey: 'T', tone: 'primary', disabled: busy, pulse: r.probed && !busy, onClick: r.transmit },
        ]}
      />
      <p className="mt-3 text-sm text-mute">Click the + sockets on H1 and H2 to wire them. Each helper can touch any carriers you choose.</p>
    </div>
  );

  return <MissionLayout mission={mission} board={board} readout={readout} actions={actions} onRetry={r.retry} />;
}
