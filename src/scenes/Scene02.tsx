import { AnimatePresence, motion } from 'framer-motion';
import { Copy, Eye, Upload } from 'lucide-react';
import { useState } from 'react';
import { DialGroup } from '../components/Dial/MessageDial';
import { ActionBar } from '../components/HUD/ActionBar';
import { ContinueButton, MissionLayout, PanelTitle } from '../components/MissionPanel/MissionLayout';
import { createLab, link, qubitBloch, setCode, threads, type LabState } from '../game/engine/lab';
import { letterPhi } from '../game/quantum/codes';
import { useMission } from '../hooks/useMission';
import type { LevelDef } from '../types/game';
import { sfx } from '../utils/audio';

type Input = 'A' | 0 | 1;

function freshCopier(input: Input): LabState {
  const phi = input === 'A' ? letterPhi('A') : input === 0 ? 0 : Math.PI;
  return createLab({ code: 'bit', phi, unencoded: true });
}

const DIALS = [
  { cx: 150, cy: 200, r: 58, label: 'Q1 · INPUT' },
  { cx: 455, cy: 108, r: 46, label: 'Q2' },
  { cx: 455, cy: 300, r: 46, label: 'Q3' },
];

export default function Scene02({ level }: { level: LevelDef }) {
  const mission = useMission(level);
  const [bits, setBits] = useState<Array<0 | 1>>([1, 0, 1]);
  const [lab, setLab] = useState<LabState>(() => freshCopier('A'));
  const [input, setInput] = useState<Input>('A');
  const [copied, setCopied] = useState(false);
  const [copying, setCopying] = useState(false);
  const [inspected, setInspected] = useState<number[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [tested, setTested] = useState<{ 0: boolean; 1: boolean }>({ 0: false, 1: false });
  const [revealed, setRevealed] = useState(false);
  const step = mission.stepId;

  function clickBit(i: number) {
    if (step !== 'classical') return;
    if (i !== 1) {
      sfx.fail();
      mission.flash('warn', 'Outvoted', 'That bit agrees with another one. The majority says it is right.', 2600);
      return;
    }
    sfx.fix();
    setBits([1, 1, 1]);
    mission.flash('success', 'Majority restored', 'Two votes beat one. Ordinary data is easy to protect.', 2400);
    mission.showConcept('majority');
    mission.later(() => mission.next(), 1500);
  }

  function copy() {
    if (copied || copying) return;
    sfx.probe();
    setCopying(true);
    mission.later(() => {
      sfx.measure(1);
      setLab((l) => setCode(link(link(l, 0, 1), 0, 2), 'bit'));
      setCopied(true);
      setCopying(false);
      if (step === 'copy') {
        mission.flash('warn', 'That is not three A’s', 'Each carrier points somewhere faint, and none of them at A.', 3500);
        mission.later(() => mission.next(), 900);
      }
      if (step === 'basis' && input !== 'A') {
        const nextTested = { ...tested, [input]: true };
        setTested(nextTested);
        mission.flash('success', `Three perfect ${input}s`, 'For plain 0 and 1, the copier works flawlessly.', 2600);
        if (nextTested[0] && nextTested[1]) {
          mission.later(() => {
            mission.showConcept('noCloning');
            mission.say(['The copier works on 0 and 1, but not on A.', 'No machine can copy an unknown quantum message. But look at what this one did make…'], 'note');
            setLab(setCode(link(link(freshCopier('A'), 0, 1), 0, 2), 'bit'));
            setInput('A');
            setCopied(true);
            mission.next();
          }, 1800);
        }
      }
    }, 900);
  }

  function load(v: Input) {
    sfx.click();
    setLab(freshCopier(v));
    setInput(v);
    setCopied(false);
  }

  function inspect(q: number) {
    if (!copied) return;
    sfx.select();
    setSelected(q);
    if (step === 'inspect' && !inspected.includes(q)) {
      const nextList = [...inspected, q];
      setInspected(nextList);
      if (nextList.length === 3) {
        mission.later(() => {
          mission.say('Not one of them is a copy of A. Each is faint, pointing weakly up, never at A.', 'warn');
          mission.next();
          load(0);
        }, 1200);
      }
    }
  }

  function reveal() {
    sfx.concept();
    setRevealed(true);
    mission.showConcept('spread');
    mission.next();
  }

  const target = input === 'A' ? letterPhi('A') : input === 0 ? 0 : Math.PI;
  const threadList = threads(lab);

  const board =
    step === 'classical' ? (
      <div className="flex w-full flex-col items-center gap-6 py-10">
        <div className="text-center">
          <p className="panel-title">Sent</p>
          <div className="mt-2 flex gap-4">
            {[1, 1, 1].map((b, i) => (
              <span key={i} className="grid size-16 place-items-center rounded-2xl border border-white/10 font-mono text-3xl text-white/30">
                {b}
              </span>
            ))}
          </div>
        </div>
        <div className="font-mono text-xs tracking-[0.3em] text-noise/70">⚡ CHANNEL ⚡</div>
        <div className="text-center">
          <p className="panel-title">Received (click to fix)</p>
          <div className="mt-2 flex gap-4">
            {bits.map((b, i) => (
              <motion.button
                key={i}
                type="button"
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => clickBit(i)}
                aria-label={`Bit ${i + 1}: ${b}`}
                className={`grid size-20 place-items-center rounded-2xl border-2 font-mono text-4xl font-bold transition ${
                  b === 0 ? 'border-noise bg-noise/10 text-noise' : 'border-signal/40 bg-signal/[0.06] text-signal'
                }`}
              >
                {b}
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    ) : (
      <svg viewBox="0 0 880 400" className="mx-auto block h-auto max-h-[62vh] w-full select-none" role="group" aria-label="Copier">
        <defs>
          <filter id="g2" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <rect x={250} y={160} width={90} height={80} rx={12} fill="#120f22" stroke="var(--color-probe)" strokeOpacity={0.6} />
        <text x={295} y={196} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={11} letterSpacing={2} fill="var(--color-probe)">
          COPIER
        </text>
        <text x={295} y={214} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={9} fill="rgba(138,147,173,1)">
          {copied ? 'linked' : 'ready'}
        </text>
        {[1, 2].map((q) => (
          <path
            key={q}
            d={`M 340 200 C 370 200, 370 ${DIALS[q].cy}, ${DIALS[q].cx - DIALS[q].r - 22} ${DIALS[q].cy}`}
            fill="none"
            stroke="var(--color-probe)"
            strokeOpacity={copied ? 0.7 : 0.2}
            strokeWidth={2}
            strokeDasharray={copied ? undefined : '3 6'}
          />
        ))}
        <line x1={DIALS[0].cx + DIALS[0].r + 24} y1={200} x2={250} y2={200} stroke="var(--color-probe)" strokeOpacity={0.5} strokeWidth={2} />
        {copying &&
          [1, 2].map((q) => (
            <motion.circle
              key={q}
              r={6}
              fill="var(--color-probe)"
              filter="url(#g2)"
              initial={{ cx: 230, cy: 200, opacity: 0 }}
              animate={{ cx: [230, 340, DIALS[q].cx - DIALS[q].r - 20], cy: [200, 200, DIALS[q].cy], opacity: [0, 1, 1, 0] }}
              transition={{ duration: 0.85 }}
            />
          ))}
        {DIALS.map((d, q) => {
          const b = qubitBloch(lab, q);
          const len = Math.min(1, Math.hypot(b.x, b.z));
          const phi = Math.atan2(b.x, b.z);
          const active = copied && (step === 'inspect' || selected === q);
          return (
            <g
              key={q}
              role={copied ? 'button' : undefined}
              tabIndex={copied ? 0 : undefined}
              aria-label={`${d.label}: arrow strength ${Math.round(len * 100)}%`}
              onClick={() => inspect(q)}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), inspect(q))}
              className={copied ? 'cursor-pointer' : undefined}
            >
              {(selected === q || (step === 'inspect' && !inspected.includes(q))) && copied && (
                <motion.circle
                  cx={d.cx}
                  cy={d.cy}
                  r={d.r + 30}
                  fill="none"
                  stroke={selected === q ? 'var(--color-signal)' : 'var(--color-noise)'}
                  strokeWidth={1.5}
                  animate={{ opacity: selected === q ? 0.8 : [0.2, 0.8, 0.2] }}
                  transition={{ duration: 1.5, repeat: selected === q ? 0 : Infinity }}
                />
              )}
              <text x={d.cx} y={d.cy - d.r - 34} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={10.5} letterSpacing={1.5} fill={active ? 'var(--color-signal)' : 'rgba(138,147,173,0.95)'}>
                {d.label}
              </text>
              <DialGroup
                cx={d.cx}
                cy={d.cy}
                r={d.r}
                showLetters={q === 0}
                arrow={len > 0.02 ? { phi, length: len, tone: q > 0 && copied && len < 0.99 ? 'noise' : 'signal' } : null}
                ghost={q > 0 && copied ? { phi: target } : null}
              />
              {q > 0 && (
                <text x={d.cx + d.r + 34} y={d.cy + 4} fontFamily="var(--font-mono)" fontSize={10} fill={copied && len < 0.99 ? 'var(--color-noise)' : 'rgba(138,147,173,1)'}>
                  {copied ? `${Math.round(len * 100)}%` : 'blank'}
                </text>
              )}
            </g>
          );
        })}

        <g>
          <rect x={608} y={70} width={252} height={260} rx={14} fill={revealed ? 'rgba(94,234,212,0.04)' : 'rgba(10,14,24,0.85)'} stroke={revealed ? 'rgba(94,234,212,0.2)' : 'rgba(255,255,255,0.07)'} strokeDasharray={revealed ? undefined : '4 6'} />
          <text x={624} y={94} fontFamily="var(--font-mono)" fontSize={10} letterSpacing={1.6} fill={revealed ? 'rgba(94,234,212,0.85)' : 'rgba(138,147,173,0.8)'}>
            SIMULATOR VIEW
          </text>
          <AnimatePresence>
            {revealed ? (
              threadList.map((t, i) => (
                <motion.g key={t.key} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.25 }}>
                  <text x={624} y={136 + i * 90} fontFamily="var(--font-mono)" fontSize={12} fontWeight={700} fill="rgba(230,233,242,0.9)">
                    THREAD {String.fromCharCode(65 + i)}
                  </text>
                  <text x={844} y={136 + i * 90} textAnchor="end" fontFamily="var(--font-mono)" fontSize={11} fill="rgba(138,147,173,1)">
                    {Math.round(t.weight * 100)}%
                  </text>
                  <rect x={624} y={144 + i * 90} width={220} height={4} rx={2} fill="rgba(255,255,255,0.08)" />
                  <rect x={624} y={144 + i * 90} width={220 * t.weight} height={4} rx={2} fill="var(--color-signal)" />
                  {t.data.map((b, q) => (
                    <g key={q}>
                      <rect x={624 + q * 76} y={156 + i * 90} width={64} height={34} rx={8} fill="rgba(8,11,20,0.9)" stroke="rgba(94,234,212,0.35)" />
                      <text x={656 + q * 76} y={178 + i * 90} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={14} fontWeight={700} fill="#d5fbf5">
                        Q{q + 1}={b}
                      </text>
                    </g>
                  ))}
                </motion.g>
              ))
            ) : (
              <text x={734} y={210} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={11} letterSpacing={2} fill="rgba(138,147,173,0.7)">
                {step === 'reveal' ? 'PRESS SIMULATOR VIEW' : 'OFFLINE'}
              </text>
            )}
          </AnimatePresence>
        </g>
      </svg>
    );

  const sel = selected ?? null;
  const readout =
    step === 'classical' ? (
      <div>
        <PanelTitle>Classical repair</PanelTitle>
        <p className="text-sm text-slate-300">Three copies of one bit. Noise flipped one. Whatever two of them agree on is the answer.</p>
      </div>
    ) : (
      <div>
        <PanelTitle>Inspector</PanelTitle>
        {sel === null || !copied ? (
          <p className="text-sm text-mute">{copied ? 'Click a carrier to see what it holds on its own.' : `Input loaded: ${input}. Two blank carriers waiting.`}</p>
        ) : (
          (() => {
            const b = qubitBloch(lab, sel);
            const len = Math.hypot(b.x, b.z);
            return (
              <div>
                <p className="font-mono text-sm text-white">
                  Q{sel + 1} alone · strength {Math.round(len * 100)}%
                </p>
                <p className="mt-1 text-sm text-slate-300">
                  {len > 0.99
                    ? `A full, sharp arrow. A perfect copy of ${input}.`
                    : `A faint arrow pointing ${b.z >= 0 ? 'weakly up' : 'weakly down'}. It does not point at A. A real copy would be a full-length arrow at A.`}
                </p>
              </div>
            );
          })()
        )}
        <p className="mt-2 font-mono text-[0.7rem] text-mute">
          Tests: plain 0 {tested[0] ? '✓' : '·'} · plain 1 {tested[1] ? '✓' : '·'}
        </p>
      </div>
    );

  const actions = (
    <div>
      <PanelTitle>Copier controls</PanelTitle>
      <ActionBar
        actions={[
          { id: 'copy', label: 'Copy', icon: Copy, hotkey: 'C', tone: 'probe', disabled: !(step === 'copy' || step === 'basis') || copied || copying, pulse: (step === 'copy' || step === 'basis') && !copied, onClick: copy },
          { id: 'l0', label: 'Load 0', icon: Upload, hotkey: '0', disabled: step !== 'basis' || copying, onClick: () => load(0) },
          { id: 'l1', label: 'Load 1', icon: Upload, hotkey: '1', disabled: step !== 'basis' || copying, onClick: () => load(1) },
          { id: 'sim', label: 'Simulator view', icon: Eye, hotkey: 'V', tone: 'primary', disabled: step !== 'reveal', pulse: step === 'reveal', onClick: reveal },
        ]}
      />
    </div>
  );

  return (
    <MissionLayout
      mission={mission}
      board={board}
      readout={readout}
      actions={step === 'classical' ? undefined : actions}
      objectiveExtra={step === 'spread' ? <ContinueButton onClick={mission.complete} label="Finish mission" /> : null}
    />
  );
}
