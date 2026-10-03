import type { LabState } from '../../game/engine/lab';
import { BLOCKS, CHARGES } from '../../game/engine/shor';
import { PanelTitle } from '../MissionPanel/MissionLayout';

/** Nine-qubit syndrome readout: bit probes per block, phase probes across blocks. */
export function ShorSyndrome({ lab, charges }: { lab: LabState; charges?: number }) {
  const probe = (id: string) => lab.probes.find((x) => x.id === id)!;
  const res = (id: string) => (probe(id).status === 'measured' ? probe(id).result : null);
  const cell = (id: string) => {
    const v = res(id);
    return (
      <span className={`inline-block w-5 text-center font-bold ${v === 1 ? 'text-noise' : v === 0 ? 'text-white' : 'text-white/20'} ${probe(id).stale ? 'opacity-40' : ''}`}>{v ?? '–'}</span>
    );
  };
  return (
    <div>
      <PanelTitle right={charges !== undefined ? <span className={`font-mono text-[0.7rem] ${charges === 0 ? 'text-bad' : 'text-probe'}`}>charges {charges}/{CHARGES}</span> : undefined}>
        Syndrome
      </PanelTitle>
      <div className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 font-mono text-[0.8rem]">
        {['a', 'b', 'c'].map((b, i) => (
          <div key={b} className="contents">
            <span className="text-probe">Block {BLOCKS[i]} · bit</span>
            <span>
              {cell(`${b}1`)}
              {cell(`${b}2`)}
            </span>
          </div>
        ))}
        <span className="text-phase">Blocks · phase ◐</span>
        <span>
          {cell('p1')}
          {cell('p2')}
        </span>
      </div>
      <p className="mt-2 font-mono text-[0.66rem] leading-relaxed text-mute">
        bit: 10 → 1st · 11 → 2nd · 01 → 3rd carrier of the block
        <br />
        phase: 10 → A · 11 → B · 01 → C
        {lab.probes.some((p) => p.stale) && <><br />dimmed = read before your last fix</>}
      </p>
    </div>
  );
}

