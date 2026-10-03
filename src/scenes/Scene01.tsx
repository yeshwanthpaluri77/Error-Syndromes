import { Eye, FlipVertical2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ActionBar } from '../components/HUD/ActionBar';
import { ContinueButton, MissionLayout, PanelTitle } from '../components/MissionPanel/MissionLayout';
import { LabBoard, type DialView } from '../components/QuantumCircuit/LabBoard';
import { createLab, labReadout, type LabState } from '../game/engine/lab';
import { RING, letterPhi, letterPos } from '../game/quantum/codes';
import { useLab, type LabEvent } from '../hooks/useLab';
import { useMission } from '../hooks/useMission';
import type { LevelDef } from '../types/game';

const T = letterPos('T');

export default function Scene01({ level }: { level: LevelDef }) {
  const mission = useMission(level);
  const [tool, setTool] = useState<string | null>(null);
  const [target, setTarget] = useState<number | null>(T);
  const [readResult, setReadResult] = useState<0 | 1 | null>(null);

  const lab = useLab(
    () => createLab({ code: 'single', phi: letterPhi('T') }),
    (ev: LabEvent, state: LabState) => handle(ev, state),
  );

  // The first message arrives already damaged.
  useEffect(() => {
    lab.noise('X', 0, { delay: 500 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function sendTest(phi: number, pos: number) {
    lab.replace(createLab({ code: 'single', phi }));
    setTarget(pos);
    lab.noise('X', 0, { delay: 900 });
  }

  function handle(ev: LabEvent, state: LabState) {
    const step = mission.stepId;
    if (ev.type === 'fix') {
      const r = labReadout(state);
      if (r.pos === target) {
        mission.flash('success', 'Signal restored', `Points at ${RING[r.pos!]} again.`, 2400);
        if (step === 'repair') {
          mission.later(() => {
            mission.next();
            sendTest(0, 0);
          }, 1400);
        } else if (step === 'test0') {
          mission.later(() => {
            mission.next();
            sendTest(Math.PI, 12);
          }, 1400);
        } else if (step === 'test1') {
          mission.showConcept('xError');
          mission.later(() => {
            mission.next();
            lab.replace(createLab({ code: 'single', phi: letterPhi('T') }));
            setTarget(null);
            setTool(null);
          }, 1400);
        }
      } else {
        mission.flash('warn', 'Still off', 'Flipping twice undoes the flip. Try once more.', 2600);
      }
    }
    if (ev.type === 'read' && step === 'blind') {
      setReadResult(ev.outcome);
      setTool(null);
      mission.next();
      mission.say([
        `READ result: ${ev.outcome}.`,
        `But the message was T, a direction, not a plain ${ev.outcome}. Reading forced it to pick up or down. The direction is gone for good.`,
        "Noise flips messages. Looking destroys them. So how do you repair something you can't look at?",
      ]);
      mission.showConcept('collapse');
    }
  }

  function onQubit(q: number) {
    if (tool === 'flip') lab.fix(q, 'X');
    else if (tool === 'read') lab.read(q);
    else mission.flash('info', 'Pick a tool first', 'Choose a tool below, then click the carrier.', 2200);
  }

  const step = mission.stepId;
  const repairing = step === 'repair' || step === 'test0' || step === 'test1';

  const dial: DialView =
    step === 'blind'
      ? { mode: 'sealed', caption: 'SENT: UNKNOWN' }
      : step === 'aftermath'
        ? {
            mode: 'fixed',
            fixedPhi: readResult ? Math.PI : 0,
            ghostPos: T,
            tone: 'bad',
            highlightPos: readResult ? 12 : 0,
            caption: `COLLAPSED TO ${readResult} · WAS T`,
            captionTone: 'bad',
          }
        : {
            mode: 'live',
            ghostPos: target,
            tone: labReadout(lab.state).pos === target ? 'ok' : 'noise',
            highlightPos: target,
            caption: target !== null ? `SENT ${RING[target]} · RECEIVED ${RING[labReadout(lab.state).pos ?? 0]}` : undefined,
            captionTone: labReadout(lab.state).pos === target ? 'ok' : 'noise',
          };

  const board = (
    <LabBoard
      api={lab}
      view={{ labels: ['Q'], dial, highlightQubits: tool ? [0] : [], qubitVerb: tool === 'flip' ? 'FLIP' : tool === 'read' ? 'READ' : null }}
      onQubit={onQubit}
    />
  );

  const readout = (
    <div>
      <PanelTitle>Ghost vs received</PanelTitle>
      <ul className="space-y-1.5 text-sm text-slate-300">
        <li>
          <span className="mr-2 inline-block w-10 border-t-2 border-dashed border-white/50 align-middle" /> ghost arrow: what was sent
        </li>
        <li>
          <span className="mr-2 inline-block w-10 border-t-[3px] border-noise align-middle" /> solid arrow: what arrived
        </li>
      </ul>
      <p className="mt-3 font-mono text-xs text-mute">
        {step === 'test0' || step === 'test1'
          ? 'Test signals: 0 points straight up, 1 straight down.'
          : step === 'aftermath'
            ? 'After reading: only a plain 0 or 1 is left.'
            : 'The ring: 0 at the top, 1 at the bottom, letters in between.'}
      </p>
    </div>
  );

  const actions = (
    <div>
      <PanelTitle>Tools</PanelTitle>
      <ActionBar
        selected={tool}
        onSelect={setTool}
        onQubitKey={onQubit}
        qubitKeys={1}
        actions={[
          { id: 'flip', label: 'Flip (X)', icon: FlipVertical2, hotkey: 'X', tone: 'fix', kind: 'tool', disabled: !repairing || lab.busy, pulse: repairing && !tool && !lab.busy },
          { id: 'read', label: 'Read', icon: Eye, hotkey: 'R', tone: 'danger', kind: 'tool', disabled: step !== 'blind' || lab.busy, pulse: step === 'blind' && !tool },
        ]}
      />
      <p className="mt-3 text-sm text-mute">{tool ? 'Now click the carrier Q (or press 1). Esc puts the tool down.' : 'Select a tool, then click the carrier.'}</p>
    </div>
  );

  return (
    <MissionLayout
      mission={mission}
      board={board}
      readout={readout}
      actions={actions}
      objectiveExtra={step === 'aftermath' ? <ContinueButton onClick={mission.complete} label="Finish mission" /> : null}
    />
  );
}
