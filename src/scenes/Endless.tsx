import { FlipVertical2, Play, Send, SkipForward, Waves } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { ActionBar } from '../components/HUD/ActionBar';
import { MissionLayout, PanelTitle } from '../components/MissionPanel/MissionLayout';
import { LabBoard, type DialView } from '../components/QuantumCircuit/LabBoard';
import { ShorBoard } from '../components/QuantumCircuit/ShorBoard';
import { PHASE_PROBES, SHOR_PROBES, STANDARD_PROBES } from '../data/probes';
import { FingerprintBoard, SyndromeReadout } from '../components/SyndromePanel/SyndromePanel';
import { FULL_FINGERPRINTS, freshReadings, matchFingerprint } from '../game/engine/diagnosis';
import { explainRepair, randomLetter, randomOf } from '../game/engine/diagnosis';
import { createLab, type ErrorKind, type LabState } from '../game/engine/lab';
import { RING, letterPhi, letterPos } from '../game/quantum/codes';
import { useGame } from '../hooks/useGame';
import { useLab, type LabEvent } from '../hooks/useLab';
import { useMission } from '../hooks/useMission';
import type { LevelDef } from '../types/game';
import { CHARGES, describeHit, shorFailureLines, wrongShorFix } from '../game/engine/shor';
import { ShorSyndrome } from '../components/SyndromePanel/ShorSyndrome';

type Shield = 'bit' | 'phase' | 'nine';
type Mode = Shield | 'mixed';

interface Signal {
  shield: Shield;
  q: number | null;
  kinds: ErrorKind[];
  letter: string;
}

const ENDLESS: LevelDef = {
  id: 99,
  code: '∞',
  title: 'Endless Repair',
  teaser: '',
  idea: 'Apply everything',
  letter: '',
  checks: [],
  learned: [],
  steps: [
    {
      id: 'play',
      say: ['NEW SIGNAL DETECTED. Unknown damage. Sealed carriers.', 'Diagnose and repair. Each signal is new: no fixed answers to memorise.'],
      objective: 'Diagnose, repair, deliver. Build a streak.',
      hints: [
        'Probe first. Never guess.',
        'Bit shield: FLIP the carrier the fingerprint points at. Phase shield: PHASE FIX it. Nine-qubit: bit probes find a carrier, phase probes find a block.',
        'A fingerprint of all zeros means: touch nothing, just transmit.',
      ],
    },
  ],
};


function labFor(s: Signal): LabState {
  if (s.shield === 'nine') return createLab({ code: 'shor', phi: letterPhi(s.letter), probes: SHOR_PROBES, sharedAncilla: true });
  return createLab({ code: s.shield, phi: letterPhi(s.letter), probes: s.shield === 'bit' ? STANDARD_PROBES : PHASE_PROBES });
}

function rollSignal(shield: Shield): Signal {
  const letter = randomLetter();
  if (shield === 'nine') {
    return { shield, q: randomOf([0, 1, 2, 3, 4, 5, 6, 7, 8]), kinds: randomOf<ErrorKind[]>([['X'], ['Z'], ['X', 'Z']]), letter };
  }
  const q = Math.random() < 0.15 ? null : randomOf([0, 1, 2]);
  return { shield, q, kinds: [shield === 'bit' ? 'X' : 'Z'], letter };
}

export function EndlessScene() {
  const { progress, settings, setProgress } = useGame();
  const mission = useMission(ENDLESS);
  const available: Shield[] = settings.unlockAll
    ? ['bit', 'phase', 'nine']
    : (['bit', 'phase', 'nine'] as Shield[]).filter((s) => progress.completed[{ bit: 7, phase: 9, nine: 10 }[s]] !== undefined);
  if (available.length === 0) available.push('bit');

  const [mode, setMode] = useState<Mode>(available.length > 1 ? 'mixed' : 'bit');
  const modeRef = useRef(mode);
  modeRef.current = mode;
  /** Bumped on every new signal so a stale auto-advance can't replace a newer one. */
  const signalSeq = useRef(0);
  const [signal, setSignal] = useState<Signal>(() => rollSignal(available[0]));
  const signalRef = useRef(signal);
  signalRef.current = signal;
  const [tool, setTool] = useState<string | null>(null);
  const [fixes, setFixes] = useState<Array<{ q: number; kind: ErrorKind }>>([]);
  const fixesRef = useRef(fixes);
  fixesRef.current = fixes;
  const [result, setResult] = useState<number | null | undefined>(undefined);
  const [charges, setCharges] = useState(CHARGES);
  const [streak, setStreak] = useState(0);
  const [session, setSession] = useState({ repaired: 0, attempts: 0 });
  const lab = useLab(() => labFor(signal), (ev) => handle(ev));

  function newSignal(m: Mode = modeRef.current, delay = 900) {
    signalSeq.current += 1;
    const shield = m === 'mixed' ? randomOf(available) : m;
    const s = rollSignal(shield);
    setSignal(s);
    setFixes([]);
    setResult(undefined);
    setCharges(CHARGES);
    setTool(null);
    lab.replace(labFor(s), { heal: true });
    if (s.q === null) lab.noise(s.kinds[0], null, { delay, visual: s.shield === 'nine' ? 'unknown' : s.kinds[0] });
    else lab.noise(s.kinds[0], s.q, { visual: s.shield === 'nine' ? 'unknown' : s.kinds[0], extra: s.kinds.slice(1), delay });
  }

  useEffect(() => {
    newSignal(modeRef.current, 1400);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handle(ev: LabEvent) {
    const s = signalRef.current;
    if (ev.type === 'fix') setFixes((f) => [...f, { q: ev.q, kind: ev.kind }]);
    if (ev.type !== 'transmit') return;
    const pos = ev.readout.pos;
    setResult(pos);
    setSession((x) => ({ repaired: x.repaired + (pos === letterPos(s.letter) ? 1 : 0), attempts: x.attempts + 1 }));
    if (pos === letterPos(s.letter)) {
      const nextStreak = streak + 1;
      setStreak(nextStreak);
      setProgress((p) => ({
        ...p,
        endless: { repaired: p.endless.repaired + 1, attempts: p.endless.attempts + 1, bestStreak: Math.max(p.endless.bestStreak, nextStreak) },
      }));
      mission.flash('success', `Delivered ${s.letter} · streak ${nextStreak}`, s.q === null ? 'The pulse missed. Nothing to fix.' : `It was ${describe(s)}.`, 2600);
      const seq = signalSeq.current;
      mission.later(() => seq === signalSeq.current && newSignal(), 2400);
    } else {
      setStreak(0);
      setProgress((p) => ({ ...p, endless: { ...p.endless, attempts: p.endless.attempts + 1 } }));
      const lines =
        s.shield === 'nine'
          ? shorFailureLines({ q: s.q ?? 0, kinds: s.kinds, letter: s.letter }, fixesRef.current, pos)
          : [
              `The receiver got ${pos === null ? 'an unreadable signal' : `the letter ${RING[pos]}`}.`,
              ...explainRepair(s.q === null ? [] : [s.q], fixesRef.current.map((f) => f.q), s.shield === 'bit' ? 'bit' : 'phase'),
            ];
      if (s.shield === 'nine' && wrongShorFix({ q: s.q ?? 0, kinds: s.kinds, letter: s.letter }, fixesRef.current)) mission.say('Misdiagnosed. Check which probes lit up.', 'warn');
      mission.fail({ title: 'Signal lost · streak reset', lines, action: 'Next signal' });
    }
  }

  function describe(s: Signal) {
    if (s.q === null) return 'a clean signal';
    if (s.shield === 'nine') return describeHit({ q: s.q, kinds: s.kinds });
    return `a ${s.shield === 'bit' ? 'bit' : 'phase'}-flip on Q${s.q + 1}`;
  }

  const done = result !== undefined;
  const busy = lab.busy || done;
  const nine = signal.shield === 'nine';

  function onQubit(q: number) {
    if (busy) return;
    if (tool === 'flip') lab.fix(q, 'X');
    else if (tool === 'zfix') lab.fix(q, 'Z');
    else mission.flash('info', 'Pick a tool first', undefined, 1500);
  }

  function probe(id: string) {
    if (busy) return;
    if (charges <= 0) {
      mission.flash('warn', 'Out of probe charges', undefined, 2000);
      return;
    }
    setCharges((c) => c - 1);
    lab.runProbes([id]);
  }

  const target = letterPos(signal.letter);
  const dial: DialView = done
    ? {
        mode: 'fixed',
        fixedPhi: result === null ? null : ((result as number) * Math.PI) / 12,
        fixedUnreadable: result === null,
        tone: result === target ? 'ok' : 'bad',
        highlightPos: result ?? null,
        caption: result === target ? `DELIVERED · ${signal.letter} ✓` : 'LOST',
        captionTone: result === target ? 'ok' : 'bad',
      }
    : { mode: 'sealed', caption: `${signal.shield === 'nine' ? 'NINE-QUBIT' : signal.shield.toUpperCase()} SHIELD` };

  const board = nine ? (
    <ShorBoard api={lab} dial={dial} qubitVerb={tool === 'flip' ? 'FLIP' : tool === 'zfix' ? 'Z' : null} onQubit={onQubit} onProbe={probe} disabledProbes={busy || charges <= 0} />
  ) : (
    <LabBoard
      api={lab}
      view={{ sealed: true, dial, qubitVerb: tool === 'flip' ? 'FLIP' : tool === 'zfix' ? 'PHASE FIX' : null, lensMarks: signal.shield === 'phase' ? [true, true, true] : undefined }}
      onQubit={onQubit}
    />
  );

  const probes = lab.state.probes;
  const [s1, s2] = nine ? [null, null] : freshReadings(probes);

  const readout = nine ? (
    <ShorSyndrome lab={lab.state} charges={charges} />
  ) : (
    <div className="grid gap-4 @[19rem]:grid-cols-2">
      <SyndromeReadout probes={probes} />
      <FingerprintBoard rows={FULL_FINGERPRINTS} basis={signal.shield === 'phase' ? 'X' : 'Z'} highlight={matchFingerprint(s1, s2)} title="Fingerprints" />
    </div>
  );

  const record = (
      <div>
        <PanelTitle>Repair record</PanelTitle>
        <dl className="grid grid-cols-4 gap-1.5 font-mono">
          {[
            ['Streak', streak],
            ['Best', Math.max(progress.endless.bestStreak, streak)],
            ['Session', `${session.repaired}/${session.attempts}`],
            ['All time', progress.endless.repaired],
          ].map(([k, v]) => (
            <div key={k} className="rounded-lg bg-white/[0.03] px-2 py-1.5">
              <dt className="text-[0.55rem] tracking-[0.14em] text-mute uppercase">{k}</dt>
              <dd className="text-lg font-bold text-white">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-3 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Shield type">
          {(['mixed', 'bit', 'phase', 'nine'] as Mode[]).map((m) => {
            const enabled = m === 'mixed' ? available.length > 1 : available.includes(m as Shield);
            return (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={mode === m}
                disabled={!enabled}
                onClick={() => {
                  setMode(m);
                  setStreak(0);
                  newSignal(m);
                }}
                className={`rounded-lg border px-2.5 py-1 font-mono text-[0.66rem] tracking-wider uppercase disabled:opacity-25 ${
                  mode === m ? 'border-probe bg-probe/15 text-probe' : 'border-white/10 text-slate-300 hover:bg-white/5'
                }`}
              >
                {m === 'nine' ? '9-qubit' : m}
              </button>
            );
          })}
        </div>
      </div>
  );

  const actions = (
    <div>
      <PanelTitle>Repair tools</PanelTitle>
      <ActionBar
        selected={tool}
        onSelect={setTool}
        onQubitKey={nine ? undefined : onQubit}
        qubitKeys={nine ? 0 : 3}
        actions={[
          ...(nine
            ? []
            : [{ id: 'run', label: 'Run probes', icon: Play, hotkey: 'P', tone: (signal.shield === 'phase' ? 'phase' : 'probe') as 'phase' | 'probe', disabled: busy, onClick: () => lab.runProbes(['s1', 's2']) }]),
          { id: 'flip', label: 'Flip (X)', icon: FlipVertical2, hotkey: 'X', tone: 'fix', kind: 'tool', disabled: busy || signal.shield === 'phase' },
          { id: 'zfix', label: 'Phase fix (Z)', icon: Waves, hotkey: 'Z', tone: 'phase', kind: 'tool', disabled: busy || signal.shield === 'bit' },
          { id: 'send', label: 'Transmit', icon: Send, hotkey: 'T', tone: 'primary', disabled: busy, onClick: lab.transmit },
          { id: 'skip', label: 'Skip signal', icon: SkipForward, hotkey: 'S', tone: 'neutral', disabled: lab.busy, title: 'Skipping resets your streak', onClick: () => { setStreak(0); newSignal(); } },
        ]}
      />
      <p className="mt-3 text-sm text-mute">{nine ? 'Click any ◇ to run that probe (1 charge each).' : signal.shield === 'phase' ? 'Phase shield: probes compare + and −. Fix with PHASE FIX.' : 'Bit shield: probes compare 0 and 1. Fix with FLIP.'}</p>
    </div>
  );

  return <MissionLayout mission={mission} board={board} readout={readout} actions={actions} objectiveExtra={record} onRetry={() => newSignal()} />;
}
