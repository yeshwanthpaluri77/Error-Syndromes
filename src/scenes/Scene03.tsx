import { FlipVertical2, Send, Zap } from 'lucide-react';
import { useState } from 'react';
import { ActionBar } from '../components/HUD/ActionBar';
import { ContinueButton, MissionLayout, PanelTitle } from '../components/MissionPanel/MissionLayout';
import { LabBoard } from '../components/QuantumCircuit/LabBoard';
import { randomOf } from '../game/engine/diagnosis';
import { createLab, labReadout, xFlipPattern, type LabState } from '../game/engine/lab';
import { RING, letterPhi, letterPos } from '../game/quantum/codes';
import { useLab, type LabEvent } from '../hooks/useLab';
import { useMission } from '../hooks/useMission';
import type { LevelDef } from '../types/game';

const Y = letterPos('Y');

export default function Scene03({ level }: { level: LevelDef }) {
  const mission = useMission(level);
  const [tool, setTool] = useState<string | null>(null);
  const [zapped, setZapped] = useState(false);
  const [delivered, setDelivered] = useState(false);
  const lab = useLab(() => createLab({ code: 'bit', phi: letterPhi('Y') }), (ev, s) => handle(ev, s));
  const step = mission.stepId;

  function handle(ev: LabEvent, state: LabState) {
    if (ev.type === 'zap' && step === 'zap') {
      const q = ev.q;
      setZapped(true);
      setTool(null);
      mission.say([
        `Look at the simulator view. In thread A, Q${q + 1} is the odd one out. In thread B… also Q${q + 1}.`,
        "The receiver can't decode this. The threads no longer fit the shield's all-same pattern.",
      ]);
      mission.next();
    }
    if (ev.type === 'fix') {
      const r = labReadout(state);
      if (r.pos === Y) {
        if (step === 'notice') {
          mission.flash('success', 'Pattern restored', 'Both threads read all-same again: 000 and 111.', 2600);
          mission.showConcept('shield');
          mission.later(() => {
            mission.next();
            setTool(null);
            lab.noise('X', randomOf([0, 1, 2]), { delay: 900 });
          }, 1600);
        } else {
          mission.flash('success', 'Pattern restored', 'The shield is whole. Ready to transmit.', 2200);
        }
      } else {
        const pattern = xFlipPattern(state) ?? [];
        if (pattern.includes(ev.q)) {
          mission.flash('warn', `Q${ev.q + 1} was healthy`, `Flip Q${ev.q + 1} back, then find the carrier that is odd in both threads.`, 3400);
        } else {
          mission.flash('warn', 'Not yet', 'Look for the carrier that disagrees with the others in both threads.', 3000);
        }
      }
    }
    if (ev.type === 'transmit') {
      if (ev.readout.pos === Y) {
        setDelivered(true);
        mission.flash('success', 'Delivered: Y', 'The receiver decoded the message intact.', 3000);
        mission.next();
      } else {
        mission.bump('failedTransmits');
        mission.flash('error', 'Unreadable', 'The shield still has damage. Find the odd one out first.', 3200);
      }
    }
  }

  function onQubit(q: number) {
    if (tool === 'zap' && step === 'zap' && !zapped) lab.zap(q, 'X');
    else if (tool === 'flip' && (step === 'notice' || step === 'mystery') && !delivered) lab.fix(q, 'X');
    else mission.flash('info', 'Pick a tool first', 'Choose a tool from the bar, then click a carrier.', 2000);
  }

  const live = labReadout(lab.state);
  const board = (
    <LabBoard
      api={lab}
      view={{
        threads: true,
        dial: {
          mode: 'live',
          ghostPos: Y,
          highlightPos: live.pos,
          tone: live.pos === Y ? 'ok' : 'noise',
          caption: live.pos === null ? 'LIVE DECODE · DAMAGED' : `LIVE DECODE · ${RING[live.pos]}`,
          captionTone: live.pos === Y ? 'ok' : 'noise',
        },
        qubitVerb: tool === 'zap' ? 'ZAP' : tool === 'flip' ? 'FLIP' : null,
      }}
      onQubit={onQubit}
    />
  );

  const readout = (
    <div>
      <PanelTitle>Reading the simulator view</PanelTitle>
      <ul className="space-y-1.5 text-sm text-slate-300">
        <li>Each column is a thread. Together they are the message.</li>
        <li>
          A healthy shield reads <span className="font-mono text-signal">000</span> in one thread and <span className="font-mono text-signal">111</span> in the other.
        </li>
        <li>
          <span className="rounded border border-noise px-1 font-mono text-noise">amber</span> marks a carrier that disagrees with its thread.
        </li>
      </ul>
    </div>
  );

  const actions = (
    <div>
      <PanelTitle>Tools</PanelTitle>
      <ActionBar
        selected={tool}
        onSelect={setTool}
        onQubitKey={onQubit}
        qubitKeys={3}
        actions={[
          { id: 'zap', label: 'Zap', icon: Zap, hotkey: 'N', tone: 'noise', kind: 'tool', disabled: step !== 'zap' || zapped || lab.busy, pulse: step === 'zap' && !tool },
          { id: 'flip', label: 'Flip (X)', icon: FlipVertical2, hotkey: 'X', tone: 'fix', kind: 'tool', disabled: !(step === 'notice' || step === 'mystery') || delivered || lab.busy, pulse: step === 'notice' && !tool },
          { id: 'send', label: 'Transmit', icon: Send, hotkey: 'T', tone: 'primary', disabled: step !== 'mystery' || lab.busy, onClick: lab.transmit },
        ]}
      />
      <p className="mt-3 text-sm text-mute">{tool ? `Click a carrier (or press 1–3) to ${tool === 'zap' ? 'zap' : 'flip'} it.` : 'Select a tool, then click a carrier.'}</p>
    </div>
  );

  return (
    <MissionLayout
      mission={mission}
      board={board}
      readout={readout}
      actions={actions}
      objectiveExtra={step === 'teaser' ? <ContinueButton onClick={mission.complete} label="Finish mission" /> : null}
    />
  );
}
