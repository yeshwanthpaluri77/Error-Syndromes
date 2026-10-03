import { motion } from 'framer-motion';
import { FlipVertical2, Pause, Play, Send } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { ActionBar } from '../components/HUD/ActionBar';
import { ContinueButton, MissionLayout, PanelTitle } from '../components/MissionPanel/MissionLayout';
import { LabBoard, type DialView } from '../components/QuantumCircuit/LabBoard';
import { SyndromeReadout } from '../components/SyndromePanel/SyndromePanel';
import { freshReadings, matchFingerprint } from '../game/engine/diagnosis';
import { randomOf } from '../game/engine/diagnosis';
import { createLab, xFlipPattern, type LabState } from '../game/engine/lab';
import { RING, letterPhi, letterPos } from '../game/quantum/codes';
import { useGame } from '../hooks/useGame';
import { useLab, type LabEvent } from '../hooks/useLab';
import { useMission } from '../hooks/useMission';
import { STANDARD_PROBES } from '../data/probes';
import type { LevelDef } from '../types/game';
import { sfx } from '../utils/audio';

const T = letterPos('T');
const PULSES = 10;
const fresh = () => createLab({ code: 'bit', phi: letterPhi('T'), probes: STANDARD_PROBES });

interface StormView {
  integrity: number;
  pulses: number;
  nextIn: number;
  paused: boolean;
  running: boolean;
  fooled: number;
}

export default function Scene11({ level }: { level: LevelDef }) {
  const mission = useMission(level);
  const { settings } = useGame();
  const [tool, setTool] = useState<string | null>(null);
  const [simOn, setSimOn] = useState(false);
  const [result, setResult] = useState<number | null | undefined>(undefined);
  const [finalWindow, setFinalWindow] = useState(false);
  const [view, setView] = useState<StormView>({ integrity: 100, pulses: 0, nextIn: 0, paused: false, running: false, fooled: 0 });
  const briefingFixed = useRef(false);
  const storm = useRef({ running: false, paused: false, pulses: 0, nextAt: 0, integrity: 100, last: 0, fooled: 0, pausedAt: 0 });
  const lab = useLab(fresh, (ev, s) => handle(ev, s));
  const labRef = useRef(lab);
  labRef.current = lab;
  const step = mission.stepId;

  // Briefing: two hits land before anyone can repair.
  useEffect(() => {
    lab.noise('X', 0, { delay: 1400 });
    lab.noise('X', 1, { delay: 2700 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function interval(k: number) {
    const base = 11000 - (4000 * k) / (PULSES - 1);
    return base * (settings.relaxed ? 1.6 : 1);
  }

  function sync() {
    const s = storm.current;
    setView({
      integrity: s.integrity,
      pulses: s.pulses,
      nextIn: Math.max(0, s.nextAt - performance.now()),
      paused: s.paused,
      running: s.running,
      fooled: s.fooled,
    });
  }

  function startStorm() {
    lab.replace(fresh(), { heal: true });
    setSimOn(false);
    setResult(undefined);
    setFinalWindow(false);
    mission.setObjective(null);
    storm.current = { running: true, paused: false, pulses: 0, nextAt: performance.now() + 4500, integrity: 100, last: performance.now(), fooled: 0, pausedAt: 0 };
    sync();
  }

  function shieldFooled(reason: string) {
    const s = storm.current;
    s.integrity = Math.max(0, s.integrity - 25);
    s.fooled += 1;
    mission.bump('collapses');
    sfx.collapse();
    mission.flash('error', 'Shield fooled', `${reason} The source re-sends the message: integrity −25%.`, 4200);
    lab.replace(fresh(), { heal: true });
    sync();
  }

  const tickRef = useRef<() => void>(() => {});
  tickRef.current = () => {
    const s = storm.current;
    const now = performance.now();
    const dt = (now - s.last) / 1000;
    s.last = now;
    if (!s.running || s.paused) return;
    const pattern = xFlipPattern(labRef.current.state) ?? [];
    if (pattern.length > 0 && pattern.length < 3) s.integrity = Math.max(0, s.integrity - 1.6 * dt);
    if (s.pulses < PULSES && now >= s.nextAt && !labRef.current.busy) {
      const k = s.pulses;
      s.pulses += 1;
      s.nextAt = now + interval(s.pulses);
      const p = 0.6 + (0.35 * k) / (PULSES - 1);
      labRef.current.noise('X', Math.random() < p ? randomOf([0, 1, 2]) : null);
    }
    if (s.integrity <= 0) {
      s.running = false;
      mission.bump('failedTransmits');
      mission.fail({
        title: 'The message collapsed',
        lines: [
          'Integrity reached zero.',
          s.fooled > 0
            ? `The shield was fooled ${s.fooled}× by two flips piling up before a repair.`
            : 'Damage sat unrepaired for too long while the storm kept hitting.',
          'Probe after every pulse, even ones that might have missed. Repair right away. 0 0 means leave it alone.',
        ],
        action: 'Restart the storm',
      });
    }
    sync();
  };

  useEffect(() => {
    const id = setInterval(() => tickRef.current(), 200);
    return () => clearInterval(id);
  }, []);

  function handle(ev: LabEvent, state: LabState) {
    const pattern = xFlipPattern(state) ?? [];
    if (step === 'briefing') {
      if (ev.type === 'fix' && !briefingFixed.current) {
        briefingFixed.current = true;
        setTool(null);
        mission.later(() => lab.transmit(), 500);
      }
      if (ev.type === 'transmit') {
        setResult(ev.readout.pos);
        setSimOn(true);
        const got = ev.readout.pos === null ? 'an unreadable signal' : `the letter ${RING[ev.readout.pos]}`;
        const lines =
          pattern.length === 3
            ? [
                `Received ${got}. Sent T.`,
                'The noise flipped Q1 AND Q2. The fingerprint 0 1 looked exactly like a single hit on Q3.',
                'Your fix completed the pattern: all three flipped. The threads still read 000 and 111, so the shield looks healthy, but their weights have swapped. That is a different message.',
              ]
            : [
                `Received ${got}. Sent T.`,
                'The noise flipped Q1 AND Q2. A fingerprint can only ever point at one carrier, so one repair could not catch both.',
              ];
        mission.say(lines, 'warn');
        mission.showConcept('threshold');
        mission.next();
      }
      return;
    }
    if (step !== 'storm') return;
    if (ev.type === 'fix') {
      if (pattern.length === 3) {
        shieldFooled('Two flips had piled up, and the fingerprint blamed the innocent carrier.');
      } else if (pattern.includes(ev.q)) {
        mission.bump('wrongFixes');
        mission.flash('warn', `Q${ev.q + 1} was healthy`, 'That flip added damage. Re-probe and follow the fingerprint.', 3000);
      } else if (pattern.length === 0) {
        mission.flash('success', 'Repaired', 'Shield clean.', 1600);
      }
    }
    if (ev.type === 'noise') {
      if (pattern.length === 3) shieldFooled('Three flips stacked up: the shield now holds the wrong message.');
      if (storm.current.pulses >= PULSES && !finalWindow) {
        setFinalWindow(true);
        mission.setObjective('Storm passed. Repair any damage, then TRANSMIT.');
        mission.say('Last pulse. Repair whatever is left, then deliver.', 'note');
      }
    }
    if (ev.type === 'transmit') {
      if (ev.readout.pos === T) {
        storm.current.running = false;
        setResult(T);
        sync();
        mission.flash('success', 'Transmission restored', `Delivered T at ${Math.round(storm.current.integrity)}% integrity.`, 4000);
        mission.complete();
      } else {
        mission.bump('failedTransmits');
        mission.flash('error', 'Damage remains', 'The receiver could not decode it. Probe again.', 3000);
      }
    }
  }

  function onQubit(q: number) {
    if (lab.busy || view.paused) return;
    if (tool === 'flip' && (step === 'briefing' ? !briefingFixed.current : step === 'storm')) lab.fix(q, 'X');
    else mission.flash('info', 'Pick a tool first', undefined, 1500);
  }

  function togglePause() {
    const s = storm.current;
    if (!s.running) return;
    if (s.paused) {
      s.nextAt += performance.now() - s.pausedAt;
      s.paused = false;
    } else {
      s.paused = true;
      s.pausedAt = performance.now();
    }
    s.last = performance.now();
    sync();
  }

  const probes = lab.state.probes;
  const [s1, s2] = freshReadings(probes);
  const stale = probes.some((p) => p.stale);
  const match = matchFingerprint(s1, s2);

  const dial: DialView =
    result !== undefined
      ? {
          mode: 'fixed',
          fixedPhi: result === null ? null : (result * Math.PI) / 12,
          fixedUnreadable: result === null,
          ghostPos: T,
          tone: result === T ? 'ok' : 'bad',
          highlightPos: result,
          caption: result === T ? 'DELIVERED · T ✓' : `RECEIVED ${result === null ? '?' : RING[result]} · SENT T`,
          captionTone: result === T ? 'ok' : 'bad',
        }
      : { mode: 'sealed', caption: step === 'storm' ? 'STORM IN PROGRESS' : 'SIGNAL T' };

  const board = (
    <LabBoard
      api={lab}
      view={{ threads: simOn, sealed: !simOn, dial, qubitVerb: tool === 'flip' ? 'FLIP' : null }}
      onQubit={onQubit}
    />
  );

  const hud = view.paused ? (
    <div className="absolute inset-0 z-10 grid place-items-center rounded-2xl bg-ink-950/70 backdrop-blur-sm">
      <div className="text-center">
        <p className="font-mono text-sm tracking-[0.3em] text-white uppercase">Paused</p>
        <button type="button" onClick={togglePause} className="mt-3 rounded-xl bg-signal px-4 py-2 font-mono text-xs font-bold tracking-widest text-ink-950 uppercase">
          Resume
        </button>
      </div>
    </div>
  ) : null;

  const noiseLevel = step === 'storm' ? Math.min(1, 0.25 + view.pulses / PULSES) : 0;
  const readout = (
    <div className="grid gap-4 @[19rem]:grid-cols-2">
      <div>
        <PanelTitle right={step === 'storm' ? <span className="font-mono text-[0.68rem] text-mute">pulse {view.pulses}/{PULSES}</span> : undefined}>Storm</PanelTitle>
        <Meter label="Noise level" value={noiseLevel} tone="noise" text={step === 'storm' ? `${Math.round(noiseLevel * 100)}%` : 'calm'} />
        <Meter label="Message integrity" value={view.integrity / 100} tone={view.integrity > 50 ? 'ok' : view.integrity > 25 ? 'noise' : 'bad'} text={`${Math.round(view.integrity)}%`} />
        <p className="mt-2 font-mono text-[0.7rem] text-mute">
          {step !== 'storm'
            ? 'Starts after the briefing.'
            : finalWindow
              ? 'No more pulses. Deliver when clean.'
              : view.paused
                ? 'Paused.'
                : `Next pulse in ${Math.ceil(view.nextIn / 1000)}s${view.fooled ? ` · fooled ${view.fooled}×` : ''}`}
        </p>
      </div>
      <SyndromeReadout
        probes={probes}
        status={stale ? { text: 'FIX APPLIED', tone: 'ok' } : match === null ? { text: 'UNKNOWN', tone: 'mute' } : match === 'none' ? { text: 'CLEAN: LEAVE IT', tone: 'ok' } : { text: `POINTS AT Q${Number(match) + 1}`, tone: 'warn' }}
      />
    </div>
  );

  const stormLive = step === 'storm' && view.running;
  const actions = (
    <div>
      <PanelTitle>Repair tools</PanelTitle>
      <ActionBar
        selected={tool}
        onSelect={setTool}
        onQubitKey={onQubit}
        qubitKeys={3}
        actions={[
          {
            id: 'run',
            label: 'Run probes',
            icon: Play,
            hotkey: 'P',
            tone: 'probe',
            disabled: lab.busy || view.paused || !(stormLive || (step === 'briefing' && !briefingFixed.current)),
            onClick: () => lab.runProbes(['s1', 's2']),
          },
          { id: 'flip', label: 'Flip (X)', icon: FlipVertical2, hotkey: 'X', tone: 'fix', kind: 'tool', disabled: view.paused || !(stormLive || (step === 'briefing' && !briefingFixed.current)) },
          { id: 'send', label: 'Transmit', icon: Send, hotkey: 'T', tone: 'primary', disabled: !finalWindow || lab.busy || !view.running, pulse: finalWindow, onClick: lab.transmit },
          { id: 'pause', label: view.paused ? 'Resume' : 'Pause', icon: Pause, hotkey: 'Space', tone: 'neutral', disabled: !stormLive, onClick: togglePause },
        ]}
      />
    </div>
  );

  return (
    <MissionLayout
      mission={mission}
      board={board}
      boardHud={hud}
      readout={readout}
      actions={actions}
      onRetry={startStorm}
      objectiveExtra={step === 'fooled' ? <ContinueButton
            onClick={() => {
              mission.next();
              startStorm();
            }}
            label="Enter the storm"
          /> : null}
    />
  );
}

function Meter({ label, value, tone, text }: { label: string; value: number; tone: 'ok' | 'noise' | 'bad'; text: string }) {
  const color = { ok: 'bg-ok', noise: 'bg-noise', bad: 'bg-bad' }[tone];
  const segments = 10;
  const lit = Math.round(value * segments);
  return (
    <div className="mb-2">
      <div className="mb-1 flex justify-between font-mono text-[0.64rem] tracking-[0.16em] text-mute uppercase">
        <span>{label}</span>
        <span className="text-slate-200">{text}</span>
      </div>
      <div className="flex gap-1" role="meter" aria-label={label} aria-valuenow={Math.round(value * 100)} aria-valuemin={0} aria-valuemax={100}>
        {Array.from({ length: segments }).map((_, i) => (
          <motion.span key={i} className={`h-2.5 flex-1 rounded-sm ${i < lit ? color : 'bg-white/[0.07]'}`} animate={{ opacity: i < lit ? 1 : 0.6 }} />
        ))}
      </div>
    </div>
  );
}
