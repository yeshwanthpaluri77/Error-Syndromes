import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useReducedMotion } from 'framer-motion';
import { setMuted } from '../utils/audio';
import { discoverConcept, loadProgress, saveProgress, type Progress } from '../game/progression/progress';
import type { ConceptId } from '../types/game';

export interface Settings {
  muted: boolean;
  motion: 'system' | 'reduced' | 'full';
  /** Gives the storm more time between pulses. */
  relaxed: boolean;
  /** Lets judges and returning players open any mission directly. */
  unlockAll: boolean;
}

const SETTINGS_KEY = 'qrl.settings.v1';
const DEFAULT_SETTINGS: Settings = { muted: false, motion: 'system', relaxed: false, unlockAll: false };

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

interface GameContextValue {
  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => void;
  progress: Progress;
  setProgress: (fn: (p: Progress) => Progress) => void;
  discover: (id: ConceptId) => boolean;
  reducedMotion: boolean;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [progress, setProgressState] = useState<Progress>(loadProgress);
  const osReduced = useReducedMotion() ?? false;

  useEffect(() => {
    setMuted(settings.muted);
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      /* ignore */
    }
  }, [settings]);

  useEffect(() => saveProgress(progress), [progress]);

  const updateSettings = useCallback((patch: Partial<Settings>) => setSettings((s) => ({ ...s, ...patch })), []);
  const setProgress = useCallback((fn: (p: Progress) => Progress) => setProgressState(fn), []);

  const discover = useCallback(
    (id: ConceptId) => {
      const isNew = !progress.concepts.includes(id);
      if (isNew) setProgressState((p) => discoverConcept(p, id));
      return isNew;
    },
    [progress.concepts],
  );

  const reducedMotion = settings.motion === 'reduced' || (settings.motion === 'system' && osReduced);

  const value = useMemo(
    () => ({ settings, updateSettings, progress, setProgress, discover, reducedMotion }),
    [settings, updateSettings, progress, setProgress, discover, reducedMotion],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used inside GameProvider');
  return ctx;
}
