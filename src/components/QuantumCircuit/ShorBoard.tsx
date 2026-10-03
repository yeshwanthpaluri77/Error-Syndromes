import { AnimatePresence, motion } from 'framer-motion';
import { Lock } from 'lucide-react';
import type { KeyboardEvent } from 'react';
import type { ProbeState } from '../../game/engine/lab';
import type { LabApi } from '../../hooks/useLab';
import { DialGroup } from '../Dial/MessageDial';
import type { DialView } from './LabBoard';

const W = 880;
const H = 420;
const BLOCK_X = [130, 320, 510];
const ROW_Y = [96, 176, 256];
const ORB_DX = -34;
const BIT_DX = 30;
const PHASE_Y = 360;
const DIAL = { cx: 760, cy: 180, r: 66 };
const BLOCK_NAMES = ['A', 'B', 'C'];


function orbPos(q: number) {
  return { x: BLOCK_X[Math.floor(q / 3)] + ORB_DX, y: ROW_Y[q % 3] };
}

function probePos(p: ProbeState) {
  if (p.basis === 'X') {
    const left = p.targets[0] / 3;
    return { x: (BLOCK_X[left] + BLOCK_X[left + 1]) / 2, y: PHASE_Y };
  }
  const block = Math.floor(p.targets[0] / 3);
  const row = p.targets[0] % 3;
  return { x: BLOCK_X[block] + BIT_DX, y: (ROW_Y[row] + ROW_Y[row + 1]) / 2 };
}

function onActivate(fn?: () => void) {
  return (e: KeyboardEvent) => {
    if (fn && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      fn();
    }
  };
}

interface ShorBoardProps {
  api: LabApi;
  sealed?: boolean;
  dial: DialView;
  qubitVerb?: string | null;
  onQubit?: (q: number) => void;
  onProbe?: (id: string) => void;
  disabledProbes?: boolean;
}

export function ShorBoard({ api, sealed = true, dial, qubitVerb, onQubit, onProbe, disabledProbes }: ShorBoardProps) {
  const lab = api.state;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto block h-auto max-h-[62vh] w-full select-none" role="group" aria-label="Nine-qubit shield">
      <defs>
        <radialGradient id="sorb" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#1f3b45" />
          <stop offset="100%" stopColor="#0b1220" />
        </radialGradient>
        <filter id="sglow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {BLOCK_X.map((bx, b) => (
        <g key={b}>
          <rect x={bx - 76} y={44} width={150} height={250} rx={16} fill="rgba(94,234,212,0.025)" stroke="rgba(94,234,212,0.14)" />
          <text x={bx - 62} y={34} fontFamily="var(--font-mono)" fontSize={10} letterSpacing={2} fill="rgba(138,147,173,0.95)">
            BLOCK {BLOCK_NAMES[b]}
          </text>
          {/* bracket down to the phase probes */}
          <line x1={bx} y1={294} x2={bx} y2={318} stroke="rgba(244,114,182,0.35)" strokeWidth={2} />
          <path
            d={`M ${bx + ORB_DX} 96 L ${bx + ORB_DX} 256`}
            stroke="rgba(94,234,212,0.18)"
            strokeWidth={2}
          />
        </g>
      ))}

      {/* phase rail linking blocks */}
      <line x1={BLOCK_X[0]} y1={318} x2={BLOCK_X[2]} y2={318} stroke="rgba(244,114,182,0.25)" strokeWidth={2} strokeDasharray="3 5" />

      {dial.mode !== 'off' && (
        <path d={`M ${BLOCK_X[2] + 74} 170 C 640 170, 650 ${DIAL.cy}, ${DIAL.cx - DIAL.r - 26} ${DIAL.cy}`} fill="none" stroke="rgba(94,234,212,0.2)" strokeWidth={2} />
      )}

      {lab.probes.map((p) => (
        <ProbeNode key={p.id} probe={p} onProbe={onProbe && !disabledProbes ? () => onProbe(p.id) : undefined} />
      ))}

      {Array.from({ length: 9 }, (_, q) => {
        const { x, y } = orbPos(q);
        const clickable = !!onQubit && !api.busy;
        return (
          <g
            key={q}
            role={onQubit ? 'button' : undefined}
            tabIndex={onQubit ? 0 : undefined}
            aria-label={`Q${q + 1}${qubitVerb ? `: ${qubitVerb}` : ''}`}
            onClick={clickable ? () => onQubit!(q) : undefined}
            onKeyDown={clickable ? onActivate(() => onQubit!(q)) : undefined}
            className={clickable ? 'group cursor-pointer' : undefined}
          >
            <circle className="focus-ring" cx={x} cy={y} r={28} fill="none" stroke="var(--color-signal)" strokeWidth={2} />
            <circle cx={x} cy={y} r={21} fill="url(#sorb)" stroke="var(--color-signal)" strokeOpacity={0.7} strokeWidth={1.75} filter="url(#sglow)" className={clickable ? 'group-hover:[stroke-opacity:1]' : undefined} />
            <text x={x} y={y + 4.5} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={12.5} fontWeight={600} fill="#d5fbf5">
              Q{q + 1}
            </text>
            {sealed && (
              <g transform={`translate(${x + 11}, ${y - 24})`}>
                <circle cx={5} cy={5} r={7.5} fill="#0b0f1a" stroke="rgba(255,255,255,0.15)" />
                <Lock x={0} y={0} width={10} height={10} color="rgba(138,147,173,1)" strokeWidth={2} />
              </g>
            )}
            {clickable && qubitVerb && (
              <text x={x - 28} y={y + 4} textAnchor="end" fontFamily="var(--font-mono)" fontSize={9.5} letterSpacing={1} fill="var(--color-noise)" className="opacity-0 transition-opacity group-hover:opacity-100 group-focus:opacity-100">
                {qubitVerb}
              </text>
            )}
          </g>
        );
      })}

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
            unreadable={dial.mode === 'fixed' && !!dial.fixedUnreadable}
            arrow={dial.mode === 'fixed' && dial.fixedPhi != null ? { phi: dial.fixedPhi, tone: dial.tone } : null}
            highlightPos={dial.highlightPos ?? null}
            highlightTone={dial.tone ?? 'signal'}
            caption={dial.caption}
            captionTone={dial.captionTone}
          />
        </g>
      )}

      <g pointerEvents="none">
        <AnimatePresence>
          {api.fx.map((f) => {
            switch (f.kind) {
              case 'noise':
                return (
                  <motion.g key={f.id} initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0.4, 1, 0] }} transition={{ duration: 1 }}>
                    <rect x={40} y={40} width={560} height={260} rx={18} fill={f.tone === 'X' ? 'rgba(251,191,36,0.1)' : f.tone === 'Z' ? 'rgba(244,114,182,0.1)' : 'rgba(226,232,240,0.08)'} />
                    <path d="M 60 70 L 200 120 L 170 160 L 330 210 L 300 240 L 580 280" fill="none" stroke={f.tone === 'X' ? 'var(--color-noise)' : f.tone === 'Z' ? 'var(--color-phase)' : '#e2e8f0'} strokeWidth={2.5} filter="url(#sglow)" />
                  </motion.g>
                );
              case 'zap': {
                const { x, y } = orbPos(f.q);
                return (
                  <motion.circle key={f.id} cx={x} cy={y} fill="none" stroke={f.tone === 'X' ? 'var(--color-noise)' : 'var(--color-phase)'} strokeWidth={3} initial={{ r: 20, opacity: 1 }} animate={{ r: 50, opacity: 0 }} transition={{ duration: 0.8 }} />
                );
              }
              case 'fix': {
                const { x, y } = orbPos(f.q);
                return (
                  <motion.g key={f.id} initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: 0.9 }}>
                    <motion.circle cx={x} cy={y} fill="none" stroke="var(--color-ok)" strokeWidth={3} initial={{ r: 20 }} animate={{ r: 52 }} transition={{ duration: 0.8 }} />
                    <motion.text x={x + 26} textAnchor="middle" fontFamily="var(--font-mono)" fontWeight={700} fontSize={15} fill="var(--color-ok)" initial={{ y: y - 10 }} animate={{ y: y - 36 }} transition={{ duration: 0.8 }}>
                      {f.gate}
                    </motion.text>
                  </motion.g>
                );
              }
              case 'pulse': {
                const probe = lab.probes.find((p) => p.id === f.probeId);
                if (!probe) return null;
                const end = probePos(probe);
                const color = probe.basis === 'X' ? 'var(--color-phase)' : 'var(--color-probe)';
                return (
                  <g key={f.id}>
                    {probe.targets.map((q) => {
                      const s = orbPos(q);
                      return (
                        <motion.circle
                          key={q}
                          r={5}
                          fill={color}
                          filter="url(#sglow)"
                          initial={{ cx: s.x, cy: s.y, opacity: 0 }}
                          animate={{ cx: [s.x, end.x], cy: [s.y, end.y], opacity: [0, 1, 1, 0] }}
                          transition={{ duration: 0.55, delay: f.delay, ease: 'easeIn' }}
                        />
                      );
                    })}
                  </g>
                );
              }
              case 'transmit':
                return (
                  <motion.circle key={f.id} r={6} fill="var(--color-signal)" filter="url(#sglow)" initial={{ cx: 584, cy: 170, opacity: 0 }} animate={{ cx: [584, DIAL.cx - DIAL.r - 20], cy: [170, DIAL.cy], opacity: [0, 1, 0] }} transition={{ duration: 1 }} />
                );
              case 'heal':
                return <motion.rect key={f.id} x={40} y={40} width={560} height={260} rx={18} fill="rgba(52,211,153,0.12)" initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0] }} transition={{ duration: 0.9 }} />;
              default:
                return null;
            }
          })}
        </AnimatePresence>
      </g>
    </svg>
  );
}

function ProbeNode({ probe, onProbe }: { probe: ProbeState; onProbe?: () => void }) {
  const { x, y } = probePos(probe);
  const phase = probe.basis === 'X';
  const color = phase ? 'var(--color-phase)' : 'var(--color-probe)';
  const result = probe.status === 'measured' ? probe.result : null;
  const size = phase ? 17 : 13;
  const links = phase
    ? [probe.targets[0] / 3, probe.targets[0] / 3 + 1].map((b) => ({ x: BLOCK_X[b], y: 318 }))
    : probe.targets.map((q) => {
        const p = orbPos(q);
        return { x: p.x + 21, y: p.y };
      });
  const sub = phase
    ? `${BLOCK_NAMES[probe.targets[0] / 3]}↔${BLOCK_NAMES[probe.targets[0] / 3 + 1]}`
    : `Q${probe.targets[0] + 1}↔Q${probe.targets[1] + 1}`;
  return (
    <g>
      {links.map((l, i) => (
        <path
          key={i}
          d={phase ? `M ${l.x} ${l.y} L ${l.x} ${y - 6} L ${x} ${y}` : `M ${l.x} ${l.y} L ${x - 8} ${l.y} L ${x} ${y}`}
          fill="none"
          stroke={color}
          strokeOpacity={0.55}
          strokeWidth={1.75}
        />
      ))}
      <g
        opacity={probe.stale ? 0.45 : 1}
        role={onProbe ? 'button' : 'img'}
        tabIndex={onProbe ? 0 : undefined}
        aria-label={`Probe ${probe.label} (${sub})${result !== null ? `: ${result ? 'different' : 'same'}` : ''}`}
        onClick={onProbe}
        onKeyDown={onActivate(onProbe)}
        className={onProbe ? 'group cursor-pointer' : undefined}
      >
        <circle className="focus-ring" cx={x} cy={y} r={size + 10} fill="none" stroke="var(--color-signal)" strokeWidth={2} />
        <rect
          x={x - size}
          y={y - size}
          width={size * 2}
          height={size * 2}
          rx={4}
          transform={`rotate(45 ${x} ${y})`}
          fill={result === 1 ? 'rgba(167,139,250,0.3)' : '#120f22'}
          stroke={color}
          strokeWidth={1.75}
          className={onProbe ? 'transition-[fill] group-hover:fill-[#221a3d]' : undefined}
        />
        <text x={x} y={y + 5} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={phase ? 16 : 13} fontWeight={700} fill={result === null ? 'rgba(221,214,254,0.55)' : '#f5f3ff'}>
          {result === null ? '◇' : result}
        </text>
      </g>
      <text x={phase ? x : x + 22} y={phase ? y + 36 : y + 4} textAnchor={phase ? 'middle' : 'start'} fontFamily="var(--font-mono)" fontSize={11} fill={color}>
        {phase ? `${probe.label} · ${sub}` : probe.label}
      </text>
      {phase && result !== null && (
        <text x={x} y={y + 50} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={9} fill="rgba(138,147,173,1)">
          {result ? 'PHASE DIFFERS' : 'PHASE SAME'}
        </text>
      )}
      {!phase && result !== null && (
        <text x={x + 22} y={y + 16} fontFamily="var(--font-mono)" fontSize={8.5} fill="rgba(138,147,173,1)">
          {result ? 'DIFF' : 'SAME'}
        </text>
      )}
    </g>
  );
}
