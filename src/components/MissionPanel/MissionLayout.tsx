import { useEffect, useRef, useState, type ReactNode } from 'react';
import { LEVELS, STORM_LEVEL } from '../../data/levels';
import { completeLevel } from '../../game/progression/progress';
import { rankIndex } from '../../game/progression/ranks';
import { useGame } from '../../hooks/useGame';
import type { MissionApi } from '../../hooks/useMission';
import { useNav } from '../../hooks/useNav';
import type { RankId } from '../../types/game';
import { sfx } from '../../utils/audio';
import { FailureCard, FeedbackBanner } from '../ConceptCard/Overlays';
import { LevelComplete } from '../HUD/LevelComplete';
import { TopBar } from '../HUD/TopBar';
import { MissionPanel } from './MissionPanel';

interface MissionLayoutProps {
  mission: MissionApi;
  board: ReactNode;
  /** Left control panel under the board (readouts: syndrome, logs). */
  readout?: ReactNode;
  /** Right control panel under the board (tools and actions). */
  actions?: ReactNode;
  /** Extra content inside the objective card (e.g. a Continue button). */
  objectiveExtra?: ReactNode;
  /** Small HUD pinned over the board (e.g. storm meters). */
  boardHud?: ReactNode;
  onRetry?: () => void;
}

export function MissionTitle({ mission }: { mission: MissionApi }) {
  return (
    <div className="flex min-w-0 items-baseline gap-3">
      <span className="shrink-0 font-mono text-[0.68rem] tracking-[0.2em] text-mute uppercase">Mission {mission.level.code}</span>
      <span className="truncate font-display text-[1.02rem] font-semibold text-white">{mission.level.title}</span>
      <span className="hidden truncate font-mono text-[0.68rem] tracking-[0.12em] text-signal/70 uppercase xl:inline">· {mission.level.idea}</span>
    </div>
  );
}

export function MissionLayout({ mission, board, readout, actions, objectiveExtra, boardHud, onRetry }: MissionLayoutProps) {
  const { progress, setProgress } = useGame();
  const nav = useNav();
  const recorded = useRef(false);
  const level = mission.level;
  // Rank held when the mission started, so the overlay can announce a promotion.
  const [startRank] = useState<RankId>(progress.rank);
  const newRank = level.rankAfter && rankIndex(level.rankAfter) > rankIndex(startRank) ? level.rankAfter : null;

  useEffect(() => {
    if (!mission.rating || recorded.current) return;
    recorded.current = true;
    if (newRank) setTimeout(() => sfx.rank(), 700);
    setProgress((p) => completeLevel(p, level.id, mission.rating!.stars));
  }, [mission.rating, level, newRank, setProgress]);

  const isLast = level.id === STORM_LEVEL;

  return (
    <div className="flex min-h-screen flex-col lg:h-screen lg:min-h-[640px]">
      <TopBar center={<MissionTitle mission={mission} />} />
      <main className="grid min-h-0 flex-1 gap-3 p-3 lg:grid-cols-[minmax(0,1fr)_minmax(300px,348px)] lg:p-4">
        <section className="flex min-h-0 min-w-0 flex-col gap-3">
          <div className="panel lab-grid relative flex min-h-0 flex-1 items-center justify-center overflow-hidden p-2 md:p-3">
            {board}
            {boardHud}
            <FeedbackBanner feedback={mission.feedback} onClose={mission.clearFlash} />
            <FailureCard
              failure={mission.failure}
              onRetry={() => {
                mission.clearFailure();
                onRetry?.();
              }}
            />
          </div>
          {(readout || actions) && (
            <div className="grid shrink-0 gap-3 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
              {readout && <div className="panel @container p-3.5">{readout}</div>}
              {actions && <div className={`panel p-3.5 ${readout ? '' : 'md:col-span-2'}`}>{actions}</div>}
            </div>
          )}
        </section>
        <aside className="min-h-[18rem] lg:min-h-0">
          <MissionPanel mission={mission}>{objectiveExtra}</MissionPanel>
        </aside>
      </main>
      {mission.rating && (
        <LevelComplete
          level={level}
          rating={mission.rating}
          newRank={newRank}
          nextLabel={isLast ? 'Final transmission' : `Mission ${LEVELS[level.id + 1].code}`}
          onNext={() => (isLast ? nav.toFinale() : nav.toLevel(level.id + 1))}
          onReplay={() => nav.toLevel(level.id)}
          onMap={nav.toMap}
        />
      )}
    </div>
  );
}

export function PanelTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-2.5 flex items-center justify-between gap-2">
      <span className="panel-title">{children}</span>
      {right}
    </div>
  );
}

export function ContinueButton({ onClick, label = 'Continue' }: { onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        sfx.click();
        onClick();
      }}
      className="inline-flex items-center gap-2 rounded-xl bg-signal px-4 py-2.5 font-mono text-[0.74rem] font-bold tracking-[0.16em] text-ink-950 uppercase transition hover:brightness-110"
    >
      {label} →
    </button>
  );
}
