import { motion } from 'framer-motion';
import { RING, RING_STEP } from '../../game/quantum/codes';

export type DialTone = 'signal' | 'ok' | 'bad' | 'mute' | 'noise';

const TONE: Record<DialTone, string> = {
  signal: 'var(--color-signal)',
  ok: 'var(--color-ok)',
  bad: 'var(--color-bad)',
  mute: 'var(--color-mute)',
  noise: 'var(--color-noise)',
};

export interface DialArrow {
  phi: number;
  length?: number;
  tone?: DialTone;
}

export interface DialGroupProps {
  cx: number;
  cy: number;
  r: number;
  arrow?: DialArrow | null;
  ghost?: DialArrow | null;
  /** Extra faint arrows, e.g. the bit switch's allowed directions. */
  marks?: number[];
  highlightPos?: number | null;
  highlightTone?: DialTone;
  sealed?: boolean;
  unreadable?: boolean;
  showLetters?: boolean;
  caption?: string;
  captionTone?: DialTone;
}

function polar(cx: number, cy: number, r: number, phi: number) {
  return { x: cx + r * Math.sin(phi), y: cy - r * Math.cos(phi) };
}

/** The receiver ring as an SVG group, so boards can embed it next to their wires. */
export function DialGroup({
  cx,
  cy,
  r,
  arrow,
  ghost,
  marks,
  highlightPos = null,
  highlightTone = 'signal',
  sealed,
  unreadable,
  showLetters = true,
  caption,
  captionTone = 'mute',
}: DialGroupProps) {
  const labelR = r + 15;
  const arrowLen = r - 8;
  const tip = arrow ? polar(cx, cy, arrowLen * (arrow.length ?? 1), arrow.phi) : null;
  const ghostTip = ghost ? polar(cx, cy, arrowLen, ghost.phi) : null;
  const color = TONE[arrow?.tone ?? 'signal'];

  return (
    <g>
      <circle cx={cx} cy={cy} r={r + 26} fill="rgba(8,11,20,0.6)" stroke="rgba(255,255,255,0.05)" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={1.5} />
      <line x1={cx} y1={cy - r} x2={cx} y2={cy + r} stroke="rgba(255,255,255,0.06)" />
      <line x1={cx - r} y1={cy} x2={cx + r} y2={cy} stroke="rgba(255,255,255,0.06)" />
      {RING.map((label, i) => {
        const phi = i * RING_STEP;
        const p = polar(cx, cy, labelR, phi);
        const t1 = polar(cx, cy, r - 4, phi);
        const t2 = polar(cx, cy, r + 2, phi);
        const special = i % 6 === 0;
        const hl = highlightPos === i;
        if (!showLetters && !special) {
          return <line key={i} x1={t1.x} y1={t1.y} x2={t2.x} y2={t2.y} stroke="rgba(255,255,255,0.15)" />;
        }
        return (
          <g key={i}>
            <line x1={t1.x} y1={t1.y} x2={t2.x} y2={t2.y} stroke={special ? 'rgba(94,234,212,0.5)' : 'rgba(255,255,255,0.15)'} />
            {hl && <circle cx={p.x} cy={p.y} r={9.5} fill={TONE[highlightTone]} opacity={0.22} />}
            <text
              x={p.x}
              y={p.y}
              textAnchor="middle"
              dominantBaseline="central"
              fontFamily="var(--font-mono)"
              fontSize={special ? 12 : 10.5}
              fontWeight={special || hl ? 700 : 500}
              fill={hl ? TONE[highlightTone] : special ? 'rgba(94,234,212,0.85)' : 'rgba(230,233,242,0.5)'}
            >
              {label}
            </text>
          </g>
        );
      })}

      {marks?.map((phi, i) => {
        const m = polar(cx, cy, arrowLen, phi);
        return <line key={i} x1={cx} y1={cy} x2={m.x} y2={m.y} stroke="rgba(251,191,36,0.35)" strokeWidth={2} strokeDasharray="2 5" />;
      })}

      {ghostTip && (
        <g opacity={0.65}>
          <line x1={cx} y1={cy} x2={ghostTip.x} y2={ghostTip.y} stroke="rgba(230,233,242,0.55)" strokeWidth={2} strokeDasharray="4 5" />
          <circle cx={ghostTip.x} cy={ghostTip.y} r={4} fill="none" stroke="rgba(230,233,242,0.6)" strokeWidth={1.5} />
        </g>
      )}

      {sealed ? (
        <g>
          <circle cx={cx} cy={cy} r={r - 14} fill="rgba(17,22,38,0.85)" stroke="rgba(255,255,255,0.08)" />
          <text x={cx} y={cy - 4} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={22} fill="rgba(230,233,242,0.55)">
            ?
          </text>
          <text x={cx} y={cy + 16} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={8.5} letterSpacing={2} fill="rgba(138,147,173,0.9)">
            AWAITING
          </text>
        </g>
      ) : unreadable ? (
        <g>
          {Array.from({ length: 9 }).map((_, i) => (
            <motion.line
              key={i}
              x1={cx}
              y1={cy}
              stroke="rgba(251,191,36,0.55)"
              strokeWidth={1.5}
              initial={false}
              animate={{
                x2: [cx + (r - 20) * Math.sin(i * 0.7), cx + (r - 30) * Math.sin(i * 1.9 + 1), cx + (r - 20) * Math.sin(i * 0.7)],
                y2: [cy - (r - 20) * Math.cos(i * 0.7), cy - (r - 30) * Math.cos(i * 1.9 + 1), cy - (r - 20) * Math.cos(i * 0.7)],
              }}
              transition={{ duration: 0.6 + i * 0.07, repeat: Infinity, ease: 'linear' }}
            />
          ))}
          <rect x={cx - 44} y={cy - 10} width={88} height={20} rx={4} fill="rgba(4,6,11,0.85)" />
          <text x={cx} y={cy + 4} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={9.5} letterSpacing={1.5} fill="var(--color-noise)">
            UNREADABLE
          </text>
        </g>
      ) : (
        tip && (
          <g>
            <motion.line
              x1={cx}
              y1={cy}
              initial={false}
              animate={{ x2: tip.x, y2: tip.y }}
              transition={{ type: 'spring', stiffness: 140, damping: 18 }}
              stroke={color}
              strokeWidth={3.5}
              strokeLinecap="round"
              style={{ filter: `drop-shadow(0 0 6px ${color})` }}
            />
            <motion.circle initial={false} animate={{ cx: tip.x, cy: tip.y }} transition={{ type: 'spring', stiffness: 140, damping: 18 }} r={5.5} fill={color} />
          </g>
        )
      )}
      <circle cx={cx} cy={cy} r={4} fill="var(--color-probe)" />
      {caption && (
        <text
          x={cx}
          y={cy + r + 44}
          textAnchor="middle"
          fontFamily="var(--font-mono)"
          fontSize={11}
          letterSpacing={1.2}
          fill={TONE[captionTone]}
        >
          {caption}
        </text>
      )}
    </g>
  );
}

/** Standalone dial for HTML layouts. */
export function MessageDial(props: Omit<DialGroupProps, 'cx' | 'cy' | 'r'> & { className?: string; title?: string; size?: number }) {
  const { className, title, ...rest } = props;
  const pad = props.caption ? 56 : 30;
  return (
    <svg viewBox={`0 0 220 ${220 + (pad - 30)}`} className={className} role="img" aria-label={title ?? 'Message dial'}>
      <DialGroup cx={110} cy={110} r={74} {...rest} />
    </svg>
  );
}
