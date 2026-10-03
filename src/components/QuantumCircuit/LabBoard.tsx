import { AnimatePresence, motion } from 'framer-motion';
import { Eye, Lock } from 'lucide-react';
import { useMemo, type KeyboardEvent } from 'react';
import { liveReadout, threads as getThreads, type Lens, type ProbeState } from '../../game/engine/lab';
import type { Fx, LabApi } from '../../hooks/useLab';
import { DialGroup, type DialTone } from '../Dial/MessageDial';

export interface DialView {
  mode: 'live' | 'sealed' | 'fixed' | 'off';
  ghostPos?: number | null;
  fixedPhi?: number | null;
  fixedUnreadable?: boolean;
  tone?: DialTone;
  caption?: string;
  captionTone?: DialTone;
  highlightPos?: number | null;
}

export interface BoardView {
  labels?: string[];
  /** Simulator ("x-ray") view of the threads. */
  threads?: boolean;
  lens?: Lens;
  sealed?: boolean;
  /** Show plain 0/1 values inside the orbs (test bench only). */
  values?: boolean;
  /** Show the helper's per-thread value row (two-step probes). */
  helperRow?: boolean;
  lensMarks?: boolean[];
  dial?: DialView;
  highlightQubits?: number[];
  highlightPorts?: Record<string, number[]>;
  highlightProbes?: string[];
  /** Verb shown on hover/focus for qubits, e.g. "FLIP". */
  qubitVerb?: string | null;
}

interface LabBoardProps {
  api: LabApi;
  view: BoardView;
  onQubit?: (q: number) => void;
  onPort?: (probeId: string, q: number) => void;
  onProbe?: (probeId: string) => void;
}

const W = 880;
const H = 414;
const ORB_X = 62;
const THREAD_X0 = 136;
const THREAD_DX = 46;
const CHANNEL_X = 330;
const RAIL_END = 640;
const HELPER_Y = 338;
const DIAL = { cx: 772, cy: 172, r: 68 };

function railYs(n: number): number[] {
  if (n === 1) return [172];
  if (n === 2) return [122, 222];
  return [92, 172, 252];
}

function probeXs(k: number): number[] {
  if (k <= 1) return [500];
  if (k === 2) return [430, 570];
  return [420, 510, 600];
}

const THREAD_NAMES = ['A', 'B', 'C', 'D'];

function onActivate(fn?: () => void) {
  return (e: KeyboardEvent) => {
    if (!fn) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fn();
    }
  };
}

export function LabBoard({ api, view, onQubit, onPort, onProbe }: LabBoardProps) {
  const lab = api.state;
  const ys = railYs(lab.nData);
  const pxs = probeXs(lab.probes.length);
  const labels = view.labels ?? Array.from({ length: lab.nData }, (_, i) => `Q${i + 1}`);
  const lens = view.lens ?? 'bit';
  const threadList = useMemo(() => getThreads(lab, lens), [lab, lens]);
  const shown = threadList.slice(0, 4);
  const refSign = Math.sign(shown[0]?.amp ?? 1) || 1;
  const dial = view.dial ?? { mode: 'off' };
  const live = dial.mode === 'live' ? liveReadout(lab) : null;

  const plainValue = (q: number): 0 | 1 | null => (threadList.length === 1 ? threadList[0].data[q] : null);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto block h-auto max-h-[62vh] w-full select-none" role="group" aria-label="Quantum repair bench">
      <defs>
        <radialGradient id="orb" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#1f3b45" />
          <stop offset="100%" stopColor="#0b1220" />
        </radialGradient>
        <radialGradient id="orbHot" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#2c5a5f" />
          <stop offset="100%" stopColor="#0d1a24" />
        </radialGradient>
        <linearGradient id="channel" x1="0" x2="1">
          <stop offset="0%" stopColor="rgba(251,191,36,0)" />
          <stop offset="50%" stopColor="rgba(251,191,36,0.06)" />
          <stop offset="100%" stopColor="rgba(251,191,36,0)" />
        </linearGradient>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* channel band where noise strikes */}
      <rect x={CHANNEL_X - 40} y={40} width={80} height={HELPER_Y - 70} fill="url(#channel)" />
      <text x={CHANNEL_X} y={30} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={10} letterSpacing={2} fill="rgba(251,191,36,0.45)">
        CHANNEL
      </text>

      {/* rails */}
      {ys.map((y, q) => (
        <g key={`rail-${q}`}>
          <line x1={ORB_X + 26} y1={y} x2={RAIL_END} y2={y} stroke="rgba(94,234,212,0.22)" strokeWidth={2} />
          <line x1={ORB_X + 26} y1={y} x2={RAIL_END} y2={y} stroke="rgba(94,234,212,0.5)" strokeWidth={2} className="wire-flow" />
          {dial.mode !== 'off' && (
            <path
              d={`M ${RAIL_END} ${y} C ${RAIL_END + 30} ${y}, ${DIAL.cx - DIAL.r - 40} ${DIAL.cy}, ${DIAL.cx - DIAL.r - 26} ${DIAL.cy}`}
              fill="none"
              stroke="rgba(94,234,212,0.18)"
              strokeWidth={2}
            />
          )}
        </g>
      ))}

      {/* lens markers */}
      {view.lensMarks?.map((on, q) =>
        on ? (
          <motion.g key={`lens-${q}`} initial={{ opacity: 0, scale: 0.4 }} animate={{ opacity: 1, scale: 1 }} style={{ transformOrigin: `${250}px ${ys[q]}px` }}>
            <rect x={236} y={ys[q] - 13} width={28} height={26} rx={7} fill="#1c1430" stroke="var(--color-phase)" strokeWidth={1.5} />
            <text x={250} y={ys[q] + 4.5} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={13} fill="var(--color-phase)">
              ◐
            </text>
          </motion.g>
        ) : null,
      )}

      {/* simulator view or sealed box */}
      {view.threads ? (
        <ThreadMatrix ys={ys} threads={shown} extra={threadList.length - shown.length} refSign={refSign} lens={lens} helperRow={view.helperRow} nData={lab.nData} />
      ) : view.sealed ? (
        <g>
          <rect x={THREAD_X0 - 26} y={ys[0] - 34} width={140} height={ys[ys.length - 1] - ys[0] + 68} rx={14} fill="rgba(10,14,24,0.85)" stroke="rgba(255,255,255,0.07)" strokeDasharray="4 6" />
          <g transform={`translate(${THREAD_X0 + 44 - 11}, ${(ys[0] + ys[ys.length - 1]) / 2 - 26})`}>
            <Lock width={22} height={22} color="rgba(138,147,173,0.9)" strokeWidth={1.75} />
          </g>
          <text x={THREAD_X0 + 44} y={(ys[0] + ys[ys.length - 1]) / 2 + 14} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={11} letterSpacing={2} fill="rgba(138,147,173,0.95)">
            SEALED
          </text>
          <text x={THREAD_X0 + 44} y={(ys[0] + ys[ys.length - 1]) / 2 + 30} textAnchor="middle" fontFamily="var(--font-sans)" fontSize={10} fill="rgba(138,147,173,0.7)">
            no direct view
          </text>
        </g>
      ) : null}

      {/* probes */}
      {lab.probes.map((p, i) => (
        <ProbeColumn
          key={p.id}
          probe={p}
          x={pxs[i]}
          ys={ys}
          highlightPorts={view.highlightPorts?.[p.id]}
          highlight={view.highlightProbes?.includes(p.id)}
          onPort={onPort && p.editable && p.status !== 'entangled' ? (q) => onPort(p.id, q) : undefined}
          onProbe={onProbe ? () => onProbe(p.id) : undefined}
          labels={labels}
        />
      ))}

      {/* data orbs */}
      {ys.map((y, q) => {
        const hl = view.highlightQubits?.includes(q);
        const value = view.values ? plainValue(q) : null;
        const clickable = !!onQubit && !api.busy;
        return (
          <g
            key={`orb-${q}`}
            role={onQubit ? 'button' : undefined}
            tabIndex={onQubit ? 0 : undefined}
            aria-label={`${labels[q]}${view.qubitVerb ? `: ${view.qubitVerb}` : ''}${value !== null ? `, value ${value}` : ''}`}
            onClick={clickable ? () => onQubit!(q) : undefined}
            onKeyDown={clickable ? onActivate(() => onQubit!(q)) : undefined}
            className={clickable ? 'group cursor-pointer' : undefined}
          >
            <circle className="focus-ring" cx={ORB_X} cy={y} r={33} fill="none" stroke="var(--color-signal)" strokeWidth={2} />
            {hl && (
              <motion.circle
                cx={ORB_X}
                cy={y}
                r={30}
                fill="none"
                stroke="var(--color-noise)"
                strokeWidth={2}
                animate={{ opacity: [0.2, 0.9, 0.2] }}
                transition={{ duration: 1.6, repeat: Infinity }}
              />
            )}
            <circle
              cx={ORB_X}
              cy={y}
              r={25}
              fill="url(#orb)"
              stroke="var(--color-signal)"
              strokeOpacity={0.7}
              strokeWidth={1.75}
              className={clickable ? 'transition-[stroke-opacity] group-hover:[stroke-opacity:1]' : undefined}
              filter="url(#glow)"
            />
            {value !== null ? (
              <text x={ORB_X} y={y + 7} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={21} fontWeight={700} fill="#e6fffb">
                {value}
              </text>
            ) : (
              <text x={ORB_X} y={y + 5} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={14} fontWeight={600} fill="#d5fbf5">
                {labels[q]}
              </text>
            )}
            {value !== null && (
              <text x={ORB_X} y={y - 33} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={11} fill="rgba(94,234,212,0.8)">
                {labels[q]}
              </text>
            )}
            {view.sealed && (
              <g transform={`translate(${ORB_X + 13}, ${y - 27})`}>
                <circle cx={6} cy={6} r={9} fill="#0b0f1a" stroke="rgba(255,255,255,0.15)" />
                <Lock x={0} y={0} width={12} height={12} color="rgba(138,147,173,1)" strokeWidth={2} />
              </g>
            )}
            {clickable && view.qubitVerb && (
              <text
                x={ORB_X}
                y={y + 42}
                textAnchor="middle"
                fontFamily="var(--font-mono)"
                fontSize={10}
                letterSpacing={1.5}
                fill="var(--color-noise)"
                className="opacity-0 transition-opacity group-hover:opacity-100 group-focus:opacity-100"
              >
                {view.qubitVerb}
              </text>
            )}
          </g>
        );
      })}

      {/* receiver */}
      {dial.mode !== 'off' && (
        <g>
          <text x={DIAL.cx} y={DIAL.cy - DIAL.r - 36} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={10} letterSpacing={2} fill="rgba(138,147,173,0.9)">
            RECEIVER
          </text>
          <DialGroup
            cx={DIAL.cx}
            cy={DIAL.cy}
            r={DIAL.r}
            sealed={dial.mode === 'sealed'}
            unreadable={(dial.mode === 'live' && live !== null && live.pos === null) || (dial.mode === 'fixed' && !!dial.fixedUnreadable)}
            arrow={
              dial.mode === 'live' && live && live.pos !== null
                ? { phi: live.phi, length: live.length, tone: dial.tone }
                : dial.mode === 'fixed' && dial.fixedPhi != null
                  ? { phi: dial.fixedPhi, tone: dial.tone }
                  : null
            }
            ghost={dial.ghostPos != null ? { phi: (dial.ghostPos * Math.PI) / 12 } : null}
            highlightPos={dial.highlightPos ?? null}
            highlightTone={dial.tone ?? 'signal'}
            caption={dial.caption}
            captionTone={dial.captionTone}
          />
        </g>
      )}

      <FxLayer fx={api.fx} ys={ys} pxs={pxs} probes={lab.probes} />
    </svg>
  );
}

function ThreadMatrix({
  ys,
  threads,
  extra,
  refSign,
  lens,
  helperRow,
  nData,
}: {
  ys: number[];
  threads: ReturnType<typeof getThreads>;
  extra: number;
  refSign: number;
  lens: Lens;
  helperRow?: boolean;
  nData: number;
}) {
  const top = ys[0] - 64;
  const bottom = helperRow ? HELPER_Y + 26 : ys[ys.length - 1] + 30;
  const width = Math.max(threads.length, 2) * THREAD_DX + 18;
  return (
    <g>
      <rect x={THREAD_X0 - 30} y={top} width={width} height={bottom - top} rx={14} fill="rgba(94,234,212,0.035)" stroke="rgba(94,234,212,0.16)" />
      <g transform={`translate(${THREAD_X0 - 22}, ${top - 22})`}>
        <Eye width={13} height={13} color="rgba(94,234,212,0.8)" strokeWidth={2} />
      </g>
      <text x={THREAD_X0 - 4} y={top - 11} fontFamily="var(--font-mono)" fontSize={9.5} letterSpacing={1.6} fill="rgba(94,234,212,0.8)">
        SIMULATOR VIEW
      </text>
      <AnimatePresence initial={false}>
        {threads.map((t, i) => {
          const x = THREAD_X0 + i * THREAD_DX;
          const sign = Math.sign(t.amp) * refSign >= 0 ? '+' : '−';
          const ones = t.data.reduce<number>((s, v) => s + v, 0);
          const majority = ones * 2 > nData ? 1 : 0;
          return (
            <motion.g key={`${t.key}-${i}`} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.6 }} transition={{ duration: 0.3 }}>
              <text x={x} y={top + 16} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={11} fontWeight={700} fill="rgba(230,233,242,0.85)">
                {THREAD_NAMES[i]}
              </text>
              <rect x={x - 15} y={top + 23} width={30} height={5} rx={2.5} fill="rgba(255,255,255,0.08)" />
              <rect x={x - 15} y={top + 23} width={30 * t.weight} height={5} rx={2.5} fill="var(--color-signal)" />
              <text x={x} y={top + 41} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={10.5} fill="rgba(160,168,192,1)">
                {Math.round(t.weight * 100)}%
                <tspan fill={sign === '−' ? 'var(--color-phase)' : 'rgba(138,147,173,1)'} fontWeight={700}>
                  {' '}
                  {sign}
                </tspan>
              </text>
              {t.data.map((b, q) => {
                const odd = nData >= 3 && b !== majority;
                const text = lens === 'phase' ? (b ? '−' : '+') : String(b);
                return (
                  <g key={q}>
                    <rect
                      x={x - 16}
                      y={ys[q] - 16}
                      width={32}
                      height={32}
                      rx={8}
                      fill={odd ? 'rgba(251,191,36,0.12)' : 'rgba(8,11,20,0.9)'}
                      stroke={odd ? 'var(--color-noise)' : lens === 'phase' ? 'rgba(244,114,182,0.4)' : 'rgba(94,234,212,0.35)'}
                      strokeWidth={odd ? 2 : 1.25}
                    />
                    <text
                      x={x}
                      y={ys[q] + 6}
                      textAnchor="middle"
                      fontFamily="var(--font-mono)"
                      fontSize={17}
                      fontWeight={700}
                      fill={odd ? 'var(--color-noise)' : lens === 'phase' ? '#fbcfe8' : '#d5fbf5'}
                    >
                      {text}
                    </text>
                  </g>
                );
              })}
              {helperRow && t.anc.length > 0 && (
                <g>
                  <rect x={x - 16} y={HELPER_Y - 16} width={32} height={32} rx={8} fill="rgba(167,139,250,0.1)" stroke="var(--color-probe)" strokeWidth={1.25} />
                  <text x={x} y={HELPER_Y + 6} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={17} fontWeight={700} fill="#ddd6fe">
                    {t.anc[0]}
                  </text>
                </g>
              )}
            </motion.g>
          );
        })}
      </AnimatePresence>
      {helperRow && (
        <text x={THREAD_X0 - 22} y={HELPER_Y + 4} textAnchor="end" fontFamily="var(--font-mono)" fontSize={10} fill="rgba(167,139,250,0.8)">
          ◇
        </text>
      )}
      {extra > 0 && (
        <text x={THREAD_X0 + 4 * THREAD_DX - 10} y={top + 16} fontFamily="var(--font-mono)" fontSize={10} fill="rgba(138,147,173,1)">
          +{extra}
        </text>
      )}
    </g>
  );
}

function ProbeColumn({
  probe,
  x,
  ys,
  labels,
  highlightPorts,
  highlight,
  onPort,
  onProbe,
}: {
  probe: ProbeState;
  x: number;
  ys: number[];
  labels: string[];
  highlightPorts?: number[];
  highlight?: boolean;
  onPort?: (q: number) => void;
  onProbe?: () => void;
}) {
  const connected = probe.targets;
  const topY = connected.length ? Math.min(...connected.map((q) => ys[q])) : ys[0];
  const phase = probe.basis === 'X';
  const color = phase ? 'var(--color-phase)' : 'var(--color-probe)';
  const result = probe.status === 'measured' ? probe.result : null;
  const resultWord =
    result === null ? (probe.status === 'entangled' ? 'WIRED · UNREAD' : connected.length ? 'READY' : 'UNWIRED') : `${result ? 'DIFFERENT' : 'SAME'}${probe.stale ? ' (before fix)' : ''}`;
  const pair = connected.map((q) => labels[q]).join(' ↔ ');

  return (
    <g>
      <line
        x1={x}
        y1={connected.length ? topY : ys[0] - 20}
        x2={x}
        y2={HELPER_Y - 18}
        stroke={color}
        strokeOpacity={connected.length ? 0.75 : 0.18}
        strokeWidth={2}
        strokeDasharray={connected.length ? undefined : '3 6'}
      />
      {ys.map((y, q) => {
        const on = connected.includes(q);
        const hl = highlightPorts?.includes(q);
        const interactive = !!onPort;
        return (
          <g
            key={q}
            role={interactive ? 'button' : undefined}
            tabIndex={interactive ? 0 : undefined}
            aria-pressed={interactive ? on : undefined}
            aria-label={interactive ? `${probe.label}: ${on ? 'disconnect from' : 'connect to'} ${labels[q]}` : undefined}
            onClick={interactive ? () => onPort!(q) : undefined}
            onKeyDown={interactive ? onActivate(() => onPort!(q)) : undefined}
            className={interactive ? 'group cursor-pointer' : undefined}
          >
            {interactive && <circle cx={x} cy={y} r={16} fill="transparent" />}
            <circle className="focus-ring" cx={x} cy={y} r={15} fill="none" stroke="var(--color-signal)" strokeWidth={2} />
            {hl && !on && (
              <motion.circle cx={x} cy={y} r={14} fill="none" stroke="var(--color-noise)" strokeWidth={2} animate={{ opacity: [0.25, 1, 0.25] }} transition={{ duration: 1.4, repeat: Infinity }} />
            )}
            {on ? (
              <circle cx={x} cy={y} r={7.5} fill={color} filter="url(#glow)" />
            ) : interactive ? (
              <g>
                <circle cx={x} cy={y} r={9} fill="#0b0f1a" stroke={color} strokeOpacity={0.55} strokeDasharray="2 3" className="transition-[stroke-opacity] group-hover:[stroke-opacity:1]" />
                <text x={x} y={y + 4} textAnchor="middle" fontSize={12} fill={color} fillOpacity={0.6} fontFamily="var(--font-mono)">
                  +
                </text>
              </g>
            ) : null}
          </g>
        );
      })}

      <g
        opacity={probe.stale ? 0.45 : 1}
        role={onProbe ? 'button' : 'img'}
        tabIndex={onProbe ? 0 : undefined}
        aria-label={`${probe.label} helper: ${resultWord}`}
        onClick={onProbe}
        onKeyDown={onActivate(onProbe)}
        className={onProbe ? 'cursor-pointer' : undefined}
      >
        <circle className="focus-ring" cx={x} cy={HELPER_Y} r={26} fill="none" stroke="var(--color-signal)" strokeWidth={2} />
        {highlight && (
          <motion.rect
            x={x - 22}
            y={HELPER_Y - 22}
            width={44}
            height={44}
            rx={6}
            transform={`rotate(45 ${x} ${HELPER_Y})`}
            fill="none"
            stroke="var(--color-noise)"
            strokeWidth={2}
            animate={{ opacity: [0.2, 1, 0.2] }}
            transition={{ duration: 1.4, repeat: Infinity }}
          />
        )}
        <rect
          x={x - 17}
          y={HELPER_Y - 17}
          width={34}
          height={34}
          rx={5}
          transform={`rotate(45 ${x} ${HELPER_Y})`}
          fill={result === 1 ? 'rgba(167,139,250,0.28)' : '#120f22'}
          stroke={color}
          strokeWidth={1.75}
          filter={result !== null ? 'url(#glow)' : undefined}
        />
        <text x={x} y={HELPER_Y + 7} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={19} fontWeight={700} fill={result === null ? 'rgba(221,214,254,0.6)' : '#f5f3ff'}>
          {result === null ? (probe.status === 'entangled' ? '≈' : '◇') : result}
        </text>
      </g>
      <text x={x} y={HELPER_Y + 42} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={12.5} fontWeight={700} letterSpacing={1.2} fill={color}>
        {probe.label}
        {phase ? ' ◐' : ''}
      </text>
      <text x={x} y={HELPER_Y + 57} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={11} fill="rgba(160,168,192,1)">
        {pair || resultWord}
      </text>
      {result !== null && (
        <text x={x} y={HELPER_Y + 71} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={10.5} fontWeight={700} fill={result ? 'var(--color-noise)' : 'var(--color-ok)'}>
          {resultWord}
        </text>
      )}
    </g>
  );
}

function FxLayer({ fx, ys, pxs, probes }: { fx: Fx[]; ys: number[]; pxs: number[]; probes: ProbeState[] }) {
  return (
    <g pointerEvents="none">
      <AnimatePresence>
        {fx.map((f) => {
          switch (f.kind) {
            case 'zap':
              return <Bolt key={f.id} x={CHANNEL_X} y={ys[f.q]} tone={f.tone} />;
            case 'noise':
              return <ChannelStrike key={f.id} ys={ys} tone={f.tone} />;
            case 'fix':
              return (
                <motion.g key={f.id} initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: 0.9 }}>
                  <motion.circle cx={ORB_X} cy={ys[f.q]} fill="none" stroke="var(--color-ok)" strokeWidth={3} initial={{ r: 24 }} animate={{ r: 60 }} transition={{ duration: 0.8 }} />
                  <motion.text
                    x={ORB_X + 30}
                    textAnchor="middle"
                    fontFamily="var(--font-mono)"
                    fontWeight={700}
                    fontSize={16}
                    fill="var(--color-ok)"
                    initial={{ y: ys[f.q] - 12 }}
                    animate={{ y: ys[f.q] - 40 }}
                    transition={{ duration: 0.8 }}
                  >
                    {f.gate}
                  </motion.text>
                </motion.g>
              );
            case 'read':
              return (
                <motion.circle key={f.id} cx={ORB_X} cy={ys[f.q]} fill="rgba(251,113,133,0.25)" stroke="var(--color-bad)" strokeWidth={2.5} initial={{ r: 20, opacity: 1 }} animate={{ r: 48, opacity: 0 }} transition={{ duration: 0.8 }} />
              );
            case 'collapse':
              return (
                <motion.g key={f.id} initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0] }} transition={{ duration: 1.3 }}>
                  <rect x={0} y={0} width={W} height={H} fill="rgba(251,113,133,0.08)" />
                  {ys.map((y, q) => (
                    <motion.circle key={q} cx={ORB_X} cy={y} fill="none" stroke="var(--color-bad)" strokeWidth={2} initial={{ r: 26 }} animate={{ r: 90 }} transition={{ duration: 1.1 }} />
                  ))}
                </motion.g>
              );
            case 'pulse': {
              const idx = probes.findIndex((p) => p.id === f.probeId);
              const x = pxs[idx];
              const probe = probes[idx];
              const color = probe?.basis === 'X' ? 'var(--color-phase)' : 'var(--color-probe)';
              return (
                <g key={f.id}>
                  {f.targets.map((q) => (
                    <motion.circle
                      key={q}
                      cx={x}
                      r={6}
                      fill={color}
                      filter="url(#glow)"
                      initial={{ cy: ys[q], opacity: 0 }}
                      animate={{ cy: [ys[q], HELPER_Y], opacity: [0, 1, 1, 0] }}
                      transition={{ duration: 0.55, delay: f.delay, ease: 'easeIn' }}
                    />
                  ))}
                  {f.targets.map((q) => (
                    <motion.circle
                      key={`ring-${q}`}
                      cx={x}
                      cy={ys[q]}
                      fill="none"
                      stroke={color}
                      strokeWidth={2}
                      initial={{ r: 8, opacity: 0 }}
                      animate={{ r: [8, 20], opacity: [0.9, 0] }}
                      transition={{ duration: 0.5, delay: f.delay }}
                    />
                  ))}
                </g>
              );
            }
            case 'measure': {
              const idx = probes.findIndex((p) => p.id === f.probeId);
              return (
                <motion.rect
                  key={f.id}
                  x={pxs[idx] - 20}
                  y={HELPER_Y - 20}
                  width={40}
                  height={40}
                  rx={6}
                  transform={`rotate(45 ${pxs[idx]} ${HELPER_Y})`}
                  fill="none"
                  stroke="#f5f3ff"
                  strokeWidth={2}
                  initial={{ opacity: 1, scale: 1 }}
                  animate={{ opacity: 0, scale: 1.6 }}
                  style={{ transformOrigin: `${pxs[idx]}px ${HELPER_Y}px` }}
                  transition={{ duration: 0.6 }}
                />
              );
            }
            case 'transmit':
              return (
                <g key={f.id}>
                  {ys.map((y, q) => (
                    <motion.circle
                      key={q}
                      r={5}
                      fill="var(--color-signal)"
                      filter="url(#glow)"
                      initial={{ cx: ORB_X + 30, cy: y, opacity: 0 }}
                      animate={{ cx: [ORB_X + 30, RAIL_END, DIAL.cx - DIAL.r - 20], cy: [y, y, DIAL.cy], opacity: [0, 1, 1, 0] }}
                      transition={{ duration: 1.1, delay: q * 0.08, ease: 'easeInOut' }}
                    />
                  ))}
                </g>
              );
            case 'lens':
              return (
                <motion.circle key={f.id} cx={250} cy={ys[f.q]} fill="none" stroke="var(--color-phase)" strokeWidth={2} initial={{ r: 10, opacity: 1 }} animate={{ r: 34, opacity: 0 }} transition={{ duration: 0.7 }} />
              );
            case 'heal':
              return (
                <motion.g key={f.id} initial={{ opacity: 0 }} animate={{ opacity: [0, 0.8, 0] }} transition={{ duration: 0.9 }}>
                  {ys.map((y, q) => (
                    <line key={q} x1={ORB_X + 26} y1={y} x2={RAIL_END} y2={y} stroke="var(--color-ok)" strokeWidth={3} />
                  ))}
                </motion.g>
              );
            default:
              return null;
          }
        })}
      </AnimatePresence>
    </g>
  );
}

function boltPath(x: number, y1: number, y2: number, seed: number) {
  const pts: string[] = [`M ${x} ${y1}`];
  const steps = 6;
  for (let i = 1; i <= steps; i++) {
    const y = y1 + ((y2 - y1) * i) / steps;
    const dx = i === steps ? 0 : Math.sin(seed * 7.1 + i * 2.3) * 14;
    pts.push(`L ${x + dx} ${y}`);
  }
  return pts.join(' ');
}

function Bolt({ x, y, tone }: { x: number; y: number; tone: 'X' | 'Z' }) {
  const color = tone === 'X' ? 'var(--color-noise)' : 'var(--color-phase)';
  return (
    <motion.g initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0.6, 1, 0] }} transition={{ duration: 0.8 }}>
      {tone === 'X' ? (
        <path d={boltPath(x, y - 56, y, 3)} fill="none" stroke={color} strokeWidth={3} strokeLinejoin="round" filter="url(#glow)" />
      ) : (
        <path d={`M ${x - 40} ${y} q 10 -18 20 0 t 20 0 t 20 0 t 20 0`} fill="none" stroke={color} strokeWidth={3} filter="url(#glow)" />
      )}
      <circle cx={x} cy={y} r={10} fill={color} opacity={0.5} />
      <line x1={ORB_X + 26} y1={y} x2={RAIL_END} y2={y} stroke={color} strokeWidth={2.5} opacity={0.6} />
    </motion.g>
  );
}

function ChannelStrike({ ys, tone }: { ys: number[]; tone: 'X' | 'Z' | 'unknown' }) {
  const color = tone === 'X' ? 'var(--color-noise)' : tone === 'Z' ? 'var(--color-phase)' : '#e2e8f0';
  const top = ys[0] - 50;
  const bottom = ys[ys.length - 1] + 30;
  return (
    <motion.g initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0.4, 1, 0] }} transition={{ duration: 1 }}>
      <rect x={CHANNEL_X - 40} y={top} width={80} height={bottom - top} fill={color} opacity={0.08} />
      {tone !== 'Z' ? (
        <>
          <path d={boltPath(CHANNEL_X, top, bottom, 1)} fill="none" stroke={color} strokeWidth={3} filter="url(#glow)" />
          <path d={boltPath(CHANNEL_X + 10, top + 20, bottom - 30, 5)} fill="none" stroke={color} strokeWidth={1.5} opacity={0.6} />
        </>
      ) : (
        ys.map((y, q) => (
          <path key={q} d={`M ${CHANNEL_X - 40} ${y} q 10 -16 20 0 t 20 0 t 20 0 t 20 0`} fill="none" stroke={color} strokeWidth={2.5} filter="url(#glow)" />
        ))
      )}
    </motion.g>
  );
}
