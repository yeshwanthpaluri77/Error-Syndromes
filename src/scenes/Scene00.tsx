import { AnimatePresence, motion } from 'framer-motion';
import { Send, ToggleLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
import { DialGroup, MessageDial } from '../components/Dial/MessageDial';
import { ActionBar } from '../components/HUD/ActionBar';
import { MissionLayout, PanelTitle } from '../components/MissionPanel/MissionLayout';
import { createLab, injectError, labReadout } from '../game/engine/lab';
import { RING, letterPhi, letterPos } from '../game/quantum/codes';
import { useMission } from '../hooks/useMission';
import type { LevelDef } from '../types/game';
import { sfx } from '../utils/audio';

type Phase = 'incoming' | 'docked' | 'sending' | 'arrived';

export default function Scene00({ level }: { level: LevelDef }) {
  const mission = useMission(level);
  const S = letterPos('S');
  const [phase, setPhase] = useState<Phase>('incoming');
  const [bit, setBit] = useState<0 | 1>(0);
  const [flips, setFlips] = useState(0);
  const [strike, setStrike] = useState(false);
  const [received, setReceived] = useState<number | null>(null);

  useEffect(() => {
    mission.later(() => {
      sfx.measure(1);
      setPhase('docked');
      mission.next();
    }, 3000);
    // first-minute script runs once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function flipBit() {
    if (mission.stepId !== 'bit') return;
    setBit((b) => (b ? 0 : 1));
    const n = flips + 1;
    setFlips(n);
    if (n === 3) {
      mission.flash('info', 'Two settings, no more', 'Up = 0, down = 1. S is in neither place.');
      mission.later(() => {
        mission.showConcept('qubit');
        mission.next();
      }, 900);
    }
  }

  function transmit() {
    if (mission.stepId !== 'send') return;
    sfx.transmit();
    setPhase('sending');
    mission.later(() => {
      setStrike(true);
      sfx.zap();
      mission.later(() => setStrike(false), 700);
    }, 800);
    mission.later(() => {
      // Same physics as every later mission: an X gate on the carrier.
      const lab = injectError(createLab({ code: 'single', phi: letterPhi('S') }), 0, 'X');
      const pos = labReadout(lab).pos;
      setReceived(pos);
      setPhase('arrived');
      sfx.fail();
      mission.next();
      mission.flash('warn', '⚡ Signal disturbed', `Sent S. Received ${pos === null ? '?' : RING[pos]}. Something changed in transit.`, 6000);
      mission.later(() => mission.complete(), 2600);
    }, 1700);
  }

  const board = (
    <svg viewBox="0 0 880 400" className="mx-auto block h-auto max-h-[62vh] w-full" role="img" aria-label="Incoming quantum message">
      <defs>
        <filter id="g0" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <text x={40} y={150} fontFamily="var(--font-mono)" fontSize={10} letterSpacing={2} fill="rgba(138,147,173,0.9)">
        SENDER
      </text>
      <line x1={20} y1={190} x2={150} y2={190} stroke="rgba(94,234,212,0.3)" strokeWidth={2} className="wire-flow" />
      <line x1={350} y1={190} x2={606} y2={190} stroke="rgba(94,234,212,0.22)" strokeWidth={2} />
      <rect x={440} y={110} width={80} height={160} fill={strike ? 'rgba(251,191,36,0.14)' : 'rgba(251,191,36,0.04)'} />
      <text x={480} y={100} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={10} letterSpacing={2} fill="rgba(251,191,36,0.5)">
        CHANNEL
      </text>
      <text x={250} y={86} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={10} letterSpacing={2} fill="rgba(138,147,173,0.9)">
        CARRIER · QUBIT
      </text>
      <DialGroup
        cx={250}
        cy={190}
        r={70}
        arrow={phase === 'docked' ? { phi: letterPhi('S') } : null}
        highlightPos={phase === 'docked' ? S : null}
        caption={phase === 'incoming' ? 'RECEIVING…' : phase === 'docked' ? 'MESSAGE: S' : 'SENT'}
        captionTone={phase === 'docked' ? 'signal' : 'mute'}
      />
      <text x={700} y={86} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={10} letterSpacing={2} fill="rgba(138,147,173,0.9)">
        RECEIVER
      </text>
      <DialGroup
        cx={700}
        cy={190}
        r={70}
        sealed={phase !== 'arrived'}
        arrow={phase === 'arrived' && received !== null ? { phi: (received * Math.PI) / 12, tone: 'noise' } : null}
        ghost={phase === 'arrived' ? { phi: letterPhi('S') } : null}
        highlightPos={phase === 'arrived' ? received : null}
        highlightTone="noise"
        caption={phase === 'arrived' && received !== null ? `RECEIVED ${RING[received]} · SENT S` : 'AWAITING'}
        captionTone={phase === 'arrived' ? 'noise' : 'mute'}
      />
      <AnimatePresence>
        {phase === 'incoming' && (
          <motion.circle
            key="in"
            r={7}
            cy={190}
            fill="var(--color-signal)"
            filter="url(#g0)"
            initial={{ cx: 0, opacity: 0 }}
            animate={{ cx: [0, 180, 250], opacity: [0, 1, 1, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2.6, ease: 'easeInOut' }}
          />
        )}
        {phase === 'sending' && (
          <motion.circle
            key="out"
            r={7}
            cy={190}
            filter="url(#g0)"
            initial={{ cx: 330, fill: '#5eead4' }}
            animate={{ cx: [330, 480, 630], fill: ['#5eead4', '#fbbf24', '#fbbf24'] }}
            transition={{ duration: 1.6, ease: 'easeInOut' }}
          />
        )}
        {strike && (
          <motion.path
            key="bolt"
            d="M 480 110 L 468 150 L 490 170 L 472 210 L 494 240 L 480 270"
            fill="none"
            stroke="var(--color-noise)"
            strokeWidth={3}
            filter="url(#g0)"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0.4, 1, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7 }}
          />
        )}
      </AnimatePresence>
      {phase === 'incoming' && (
        <text x={440} y={350} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={14} letterSpacing={4} fill="var(--color-signal)" className="pulse-soft">
          INCOMING QUANTUM MESSAGE…
        </text>
      )}
    </svg>
  );

  const readout = (
    <div className="flex items-center gap-4">
      <MessageDial
        className="w-32 shrink-0"
        arrow={{ phi: bit ? Math.PI : 0, tone: 'noise' }}
        ghost={mission.stepId === 'bit' ? { phi: letterPhi('S') } : null}
        marks={flips > 0 ? [0, Math.PI] : undefined}
        title={`Ordinary bit pointing ${bit ? 'down (1)' : 'up (0)'}`}
      />
      <div>
        <PanelTitle>Ordinary bit</PanelTitle>
        <p className="font-mono text-3xl font-bold text-noise">{bit}</p>
        <p className="mt-1 text-sm text-mute">{flips === 0 ? 'Your console’s classical bit.' : `Flipped ${flips}×. It only ever points at 0 or 1.`}</p>
      </div>
    </div>
  );

  const actions = (
    <div>
      <PanelTitle>Console</PanelTitle>
      <ActionBar
        actions={[
          { id: 'flip', label: 'Flip bit', icon: ToggleLeft, hotkey: 'B', tone: 'noise', disabled: mission.stepId !== 'bit', pulse: mission.stepId === 'bit' && flips === 0, onClick: flipBit },
          { id: 'send', label: 'Transmit', icon: Send, hotkey: 'T', tone: 'primary', disabled: mission.stepId !== 'send', pulse: mission.stepId === 'send', onClick: transmit },
        ]}
      />
      <p className="mt-3 text-sm text-mute">
        {phase === 'arrived' && received !== null ? `The receiver got ${RING[received]}: the sent arrow, mirrored top ↔ bottom.` : 'Tip: every control has a keyboard shortcut.'}
      </p>
    </div>
  );

  return <MissionLayout mission={mission} board={board} readout={readout} actions={actions} />;
}

