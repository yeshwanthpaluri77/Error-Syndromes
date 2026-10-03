import { Aperture, Play, Send, Waves } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ActionBar } from '../components/HUD/ActionBar';
import { ContinueButton, MissionLayout, PanelTitle } from '../components/MissionPanel/MissionLayout';
import { LabBoard, type DialView } from '../components/QuantumCircuit/LabBoard';
import { FingerprintBoard, SyndromeReadout } from '../components/SyndromePanel/SyndromePanel';
import { FULL_FINGERPRINTS, freshReadings, matchFingerprint } from '../game/engine/diagnosis';
import { explainRepair, randomOf } from '../game/engine/diagnosis';
import { createLab, labReadout, setCode, type LabState } from '../game/engine/lab';
import { RING, letterPhi, letterPos } from '../game/quantum/codes';
import { useLab, type LabEvent } from '../hooks/useLab';
import { useMission } from '../hooks/useMission';
import { PHASE_PROBES, STANDARD_PROBES } from '../data/probes';
import type { LevelDef } from '../types/game';

const E = letterPos('E');

export default function Scene09({ level }: { level: LevelDef }) {
  const mission = useMission(level);
  const [tool, setTool] = useState<string | null>(null);
  const [result, setResult] = useState<number | null | undefined>(undefined);
  const [lensed, setLensed] = useState([false, false, false]);
  const [simOn, setSimOn] = useState(true);
  const [phaseHit, setPhaseHit] = useState<number | null>(null);
  const [fixes, setFixes] = useState<number[]>([]);
  const [probed, setProbed] = useState(false);
  const lab = useLab(() => createLab({ code: 'bit', phi: letterPhi('E'), probes: STANDARD_PROBES }), (ev, s) => handle(ev, s));
  const step = mission.stepId;

  useEffect(() => {
    lab.noise('Z', 1, { delay: 1100 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startPhaseRound() {
    const hit = randomOf([0, 1, 2]);
    setPhaseHit(hit);
    setFixes([]);
    setProbed(false);
    setResult(undefined);
    lab.noise('Z', hit, { delay: 2600, before: () => setSimOn(false) });
  }

  function startBlindspot() {
    lab.replace(createLab({ code: 'phase', phi: letterPhi('E'), probes: PHASE_PROBES }), { heal: true });
    setResult(undefined);
    setProbed(false);
    lab.noise('X', randomOf([0, 1, 2]), { delay: 1000 });
  }

  function handle(ev: LabEvent, state: LabState) {
    if (ev.type === 'noise' && step === 'phase') lab.checkpoint();
    if (ev.type === 'probes-done') {
      setProbed(true);
      mission.bump('probeRuns', 2);
      const r = Object.values(ev.results);
      if (step === 'silent') {
        mission.flash('info', `Syndrome ${r.join(' ')}`, 'No bit-flip detected.', 2600);
        mission.later(() => mission.next(), 1200);
      }
    }
    if (ev.type === 'transmit') {
      const pos = ev.readout.pos;
      setResult(pos);
      if (step === 'fooled') {
        mission.flash('warn', `Wrong letter: ${pos === null ? '?' : RING[pos]}`, 'Sent E. The probes saw nothing, but the message changed.', 4200);
        mission.later(() => {
          mission.showConcept('zError');
          mission.next();
        }, 1600);
      } else if (step === 'phase') {
        if (pos === E) {
          mission.flash('success', 'Signal restored', '✓ Phase-flip diagnosed  ✓ Z correction  ✓ Delivered: E', 3200);
          mission.showConcept('phaseShield');
          mission.later(() => {
            mission.next();
            startBlindspot();
          }, 2400);
        } else {
          mission.bump('failedTransmits');
          if (fixes.some((q) => q !== phaseHit)) mission.bump('wrongFixes');
          mission.fail({
            title: 'Transmission failed',
            lines: [`The receiver got ${pos === null ? 'an unreadable signal' : `the letter ${RING[pos]}`}.`, ...explainRepair(phaseHit === null ? [] : [phaseHit], fixes, 'phase')],
          });
        }
      } else if (step === 'blindspot') {
        mission.flash('warn', `Wrong letter: ${pos === null ? '?' : RING[pos]}`, 'Bit-flip noise slipped straight past the phase probes.', 4200);
        mission.say(
          [
            `Received ${pos === null ? '?' : RING[pos]}. The phase shield missed a plain bit-flip: the mirror image of the bit shield's blind spot.`,
            'One shield, one kind of noise. To guard against both at once you need a shield inside a shield.',
          ],
          'warn',
        );
        mission.showConcept('oneShield');
        mission.next();
      }
    }
    if (ev.type === 'fix') {
      setFixes((f) => [...f, ev.q]);
      if (step === 'sign') {
        if (labReadout(state).pos === E) {
          mission.flash('success', 'Phase restored', 'Thread B is + again, and the receiver reads E.', 3000);
          setResult(undefined);
          mission.later(() => mission.next(), 1500);
        }
      }
    }
    if (ev.type === 'lens') {
      const next = lensed.map((v, i) => (i === ev.q ? !v : v));
      setLensed(next);
      if (next.every(Boolean)) {
        lab.update((s) => ({ ...setCode(s, 'phase'), probes: s.probes.map((p) => ({ ...p, basis: 'X', status: 'idle', result: null })) }));
        setTool(null);
        mission.flash('success', 'Phase shield online', 'Simulator view switched to the phase lens: + and − instead of 0 and 1.', 3200);
        mission.later(() => {
          mission.next();
          startPhaseRound();
        }, 1200);
      }
    }
  }

  function onQubit(q: number) {
    if (lab.busy) return;
    if (tool === 'zfix' && (step === 'sign' || step === 'phase')) lab.fix(q, 'Z');
    else if (tool === 'lens' && step === 'lens') lab.lens(q);
    else mission.flash('info', 'Pick a tool first', undefined, 1600);
  }

  function retry() {
    lab.rewind();
    lab.update((s) => ({ ...s, probes: s.probes.map((p) => ({ ...p, status: 'idle', result: null })) }));
    setFixes([]);
    setResult(undefined);
    setProbed(false);
  }

  const lensCount = lensed.filter(Boolean).length;
  const phaseLens = lensCount === 3;
  const showThreads = simOn && !(lensCount > 0 && lensCount < 3) && step !== 'blindspot';

  const dial: DialView =
    result !== undefined
      ? {
          mode: 'fixed',
          fixedPhi: result === null ? null : (result * Math.PI) / 12,
          fixedUnreadable: result === null,
          ghostPos: step === 'fooled' || step === 'sign' || step === 'blindspot' || step === 'outro' ? E : null,
          tone: result === E ? 'ok' : 'bad',
          highlightPos: result,
          caption: result === E ? 'DELIVERED · E ✓' : `RECEIVED ${result === null ? '?' : RING[result]} · SENT E`,
          captionTone: result === E ? 'ok' : 'bad',
        }
      : step === 'sign' || (step === 'lens' && lensCount === 0)
        ? { mode: 'live', ghostPos: E, highlightPos: labReadout(lab.state).pos, tone: labReadout(lab.state).pos === E ? 'ok' : 'bad', caption: 'LIVE DECODE' }
        : { mode: 'sealed', caption: step === 'lens' ? 'RECONFIGURING' : 'SIGNAL E' };

  const board = (
    <LabBoard
      api={lab}
      view={{
        threads: showThreads,
        sealed: !showThreads,
        lens: phaseLens ? 'phase' : 'bit',
        lensMarks: lensed,
        dial,
        qubitVerb: tool === 'zfix' ? 'PHASE FIX' : tool === 'lens' ? 'LENS' : null,
      }}
      onQubit={onQubit}
    />
  );

  const probes = lab.state.probes;
  const [s1, s2] = freshReadings(probes);

  const readout =
    step === 'phase' || step === 'blindspot' || step === 'outro' ? (
      <div className="grid gap-4 @[19rem]:grid-cols-2">
        <SyndromeReadout probes={probes} />
        <FingerprintBoard rows={FULL_FINGERPRINTS} basis="X" highlight={matchFingerprint(s1, s2)} title="Phase fingerprints" />
      </div>
    ) : (
      <div className="grid gap-4 @[19rem]:grid-cols-2">
        <SyndromeReadout probes={probes} />
        <div>
          <PanelTitle>Two kinds of damage</PanelTitle>
          <ul className="space-y-1.5 text-sm text-slate-300">
            <li>
              <span className="font-mono text-noise">X</span> bit-flip: 0 ↔ 1, dial mirrors top ↕ bottom
            </li>
            <li>
              <span className="font-mono text-phase">Z</span> phase-flip: thread sign + ↔ −, dial mirrors left ↔ right
            </li>
          </ul>
        </div>
      </div>
    );

  const canRun = (step === 'silent' || step === 'phase' || step === 'blindspot') && !lab.busy && !probed;
  const canSend = (step === 'fooled' || step === 'phase' || step === 'blindspot') && !lab.busy && result === undefined;
  const actions = (
    <div>
      <PanelTitle>Tools</PanelTitle>
      <ActionBar
        selected={tool}
        onSelect={setTool}
        onQubitKey={onQubit}
        qubitKeys={3}
        actions={[
          { id: 'run', label: 'Run probes', icon: Play, hotkey: 'P', tone: phaseLens ? 'phase' : 'probe', disabled: !canRun, pulse: canRun, onClick: () => lab.runProbes(['s1', 's2']) },
          { id: 'zfix', label: 'Phase fix (Z)', icon: Waves, hotkey: 'Z', tone: 'phase', kind: 'tool', disabled: !(step === 'sign' || (step === 'phase' && result === undefined)) || lab.busy, pulse: step === 'sign' && !tool },
          { id: 'lens', label: 'Lens', icon: Aperture, hotkey: 'L', tone: 'phase', kind: 'tool', disabled: step !== 'lens' || lab.busy, pulse: step === 'lens' && !tool },
          { id: 'send', label: 'Transmit', icon: Send, hotkey: 'T', tone: 'primary', disabled: !canSend, pulse: canSend && (step === 'fooled' || probed), onClick: lab.transmit },
        ]}
      />
      <p className="mt-3 text-sm text-mute">
        {step === 'lens' ? `Lenses placed: ${lensCount}/3. A second click on the same carrier removes its lens.` : 'Phase noise strikes in pink. Bit noise strikes in amber.'}
      </p>
    </div>
  );

  return (
    <MissionLayout
      mission={mission}
      board={board}
      readout={readout}
      actions={actions}
      onRetry={retry}
      objectiveExtra={step === 'outro' ? <ContinueButton onClick={mission.complete} label="Finish mission" /> : null}
    />
  );
}
