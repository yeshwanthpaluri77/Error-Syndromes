import { motion } from 'framer-motion';
import { Play } from 'lucide-react';
import { useState } from 'react';
import { ActionBar } from '../components/HUD/ActionBar';
import { ContinueButton, MissionLayout, PanelTitle } from '../components/MissionPanel/MissionLayout';
import { LabBoard } from '../components/QuantumCircuit/LabBoard';
import { createLab, threads } from '../game/engine/lab';
import { useLab, type LabEvent } from '../hooks/useLab';
import { useMission } from '../hooks/useMission';
import type { LevelDef } from '../types/game';
import { sfx } from '../utils/audio';

const COMBOS = ['00', '01', '10', '11'] as const;

export default function Scene05({ level }: { level: LevelDef }) {
  const mission = useMission(level);
  const lab = useLab(
    () => createLab({ code: 'plain', nData: 2, bits: [0, 0], probes: [{ id: 'h', label: 'HELPER', targets: [0, 1], basis: 'Z' }] }),
    (ev) => handle(ev),
  );
  const [logRows, setLogRows] = useState<Record<string, 0 | 1>>({});
  const [prediction, setPrediction] = useState<0 | 1 | null>(null);
  const [predictStart, setPredictStart] = useState<string | null>(null);
  const step = mission.stepId;

  const bits = threads(lab.state)[0].data.join('');
  const flippedBoth = predictStart !== null && bits === predictStart.split('').map((b) => (b === '1' ? '0' : '1')).join('');

  function handle(ev: LabEvent) {
    if (ev.type !== 'probes-done') return;
    const result = ev.results.h;
    const nextRows = { ...logRows, [bits]: result };
    setLogRows(nextRows);
    if (step === 'light') {
      if (result === 1) {
        mission.flash('success', 'Helper: 1', `With T1 = ${bits[0]} and T2 = ${bits[1]}.`, 2600);
        setPredictStart(bits);
        mission.later(() => mission.next(), 1300);
      } else {
        mission.flash('info', 'Helper: 0', 'Change the carriers and try again.', 2000);
      }
    } else if (step === 'predict') {
      if (prediction === null) return;
      if (prediction === result) mission.flash('success', `Predicted ${prediction}. Correct.`, 'Flipping both carriers changed nothing for the helper.', 3400);
      else mission.flash('warn', `Surprise: still ${result}`, 'Both values changed, but the helper did not care.', 3400);
      mission.later(() => {
        mission.next();
        if (Object.keys(nextRows).length === 4) finishLog();
      }, 1800);
    } else if (step === 'log') {
      if (Object.keys(nextRows).length === 4) finishLog();
    }
  }

  function finishLog() {
    mission.flash('success', 'Log complete', 'Look at which rows read 0 and which read 1.', 3200);
    mission.later(() => {
      mission.showConcept('parity');
      mission.next();
    }, 1600);
  }

  function onQubit(q: number) {
    if (step === 'link') return;
    if (step === 'predict' && prediction !== null) {
      mission.flash('info', 'Prediction locked', 'Run it to check.', 1800);
      return;
    }
    lab.toggle(q);
  }

  const canRun = (step === 'light' || step === 'log' || (step === 'predict' && flippedBoth && prediction !== null)) && !lab.busy;
  const filled = Object.keys(logRows).length === 4;

  const board = (
    <LabBoard
      api={lab}
      view={{ labels: ['T1', 'T2'], values: true, qubitVerb: step === 'link' ? null : 'CHANGE', highlightQubits: step === 'predict' && !flippedBoth ? [0, 1] : [] }}
      onQubit={onQubit}
    />
  );

  const readout = (
    <div>
      <PanelTitle>Experiment log</PanelTitle>
      <table className="w-full border-separate border-spacing-y-1 font-mono text-sm">
        <thead>
          <tr className="text-[0.62rem] tracking-widest text-mute uppercase">
            <th className="text-left font-medium">T1</th>
            <th className="text-left font-medium">T2</th>
            <th className="font-medium">Helper</th>
            {filled && <th className="text-right font-medium">T1 vs T2</th>}
          </tr>
        </thead>
        <tbody>
          {COMBOS.map((c) => {
            const r = logRows[c];
            const current = c === bits;
            return (
              <tr key={c} className={current ? 'text-white' : 'text-slate-300'}>
                <td className={`rounded-l-lg px-2 py-1 ${current ? 'bg-signal/10' : 'bg-white/[0.03]'}`}>{c[0]}</td>
                <td className={`px-2 py-1 ${current ? 'bg-signal/10' : 'bg-white/[0.03]'}`}>{c[1]}</td>
                <td className={`px-2 py-1 text-center ${filled ? '' : 'rounded-r-lg'} ${current ? 'bg-signal/10' : 'bg-white/[0.03]'}`}>
                  {r === undefined ? <span className="text-white/20">–</span> : <motion.span initial={{ scale: 0.4 }} animate={{ scale: 1 }} className={`inline-block font-bold ${r ? 'text-probe' : 'text-white'}`}>{r}</motion.span>}
                </td>
                {filled && (
                  <motion.td initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`rounded-r-lg px-2 py-1 text-right ${current ? 'bg-signal/10' : 'bg-white/[0.03]'} ${c[0] === c[1] ? 'text-ok' : 'text-noise'}`}>
                    {c[0] === c[1] ? 'SAME' : 'DIFFERENT'}
                  </motion.td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  const predictUi =
    step === 'predict' && flippedBoth ? (
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs tracking-widest text-mute uppercase">I predict</span>
        {[0, 1].map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => {
              sfx.select();
              setPrediction(v as 0 | 1);
            }}
            aria-pressed={prediction === v}
            className={`size-10 rounded-lg border font-mono text-lg font-bold transition ${prediction === v ? 'border-probe bg-probe/20 text-white' : 'border-white/15 text-slate-300 hover:bg-white/5'}`}
          >
            {v}
          </button>
        ))}
      </div>
    ) : step === 'link' ? (
      <ContinueButton onClick={mission.complete} label="Finish mission" />
    ) : null;

  const actions = (
    <div>
      <PanelTitle>Bench controls</PanelTitle>
      <ActionBar
        onQubitKey={onQubit}
        qubitKeys={2}
        actions={[{ id: 'run', label: 'Run probe', icon: Play, hotkey: 'P', tone: 'probe', disabled: !canRun, pulse: canRun, onClick: () => lab.runProbes(['h']) }]}
      />
      <p className="mt-3 text-sm text-mute">
        {step === 'predict' && !flippedBoth
          ? 'Click T1 and T2 to flip each one once.'
          : step === 'predict' && prediction === null
            ? 'Pick 0 or 1 in the objective panel, then run.'
            : 'Click a test carrier (or press 1, 2) to change its value. These are plain bits, so you can see them.'}
      </p>
    </div>
  );

  return <MissionLayout mission={mission} board={board} readout={readout} actions={actions} objectiveExtra={predictUi} />;
}
