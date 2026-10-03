import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { useCallback, useMemo, useState } from 'react';
import { FieldNotesModal, HowToPlayModal, SettingsModal } from './components/HUD/Modals';
import { LEVELS } from './data/levels';
import { GameProvider, useGame } from './hooks/useGame';
import { NavContext, type Nav, type Screen } from './hooks/useNav';
import { SCENES } from './scenes';
import { EndlessScene } from './scenes/Endless';
import { Finale } from './screens/Finale';
import { MissionMap } from './screens/MissionMap';
import { TitleScreen } from './screens/TitleScreen';

function Shell() {
  const { reducedMotion, settings } = useGame();
  const [screen, setScreen] = useState<Screen>({ name: 'title' });
  const [modal, setModal] = useState<'settings' | 'notes' | 'help' | null>(null);
  const [run, setRun] = useState(0);

  const toLevel = useCallback((id: number) => {
    setRun((r) => r + 1);
    setScreen({ name: 'level', id, run: Date.now() });
    window.scrollTo(0, 0);
  }, []);

  const nav = useMemo<Nav>(
    () => ({
      screen,
      toTitle: () => setScreen({ name: 'title' }),
      toMap: () => setScreen({ name: 'map' }),
      toLevel,
      toEndless: () => {
        setRun((r) => r + 1);
        setScreen({ name: 'endless' });
      },
      toFinale: () => setScreen({ name: 'finale' }),
      openSettings: () => setModal('settings'),
      openNotes: () => setModal('notes'),
      openHelp: () => setModal('help'),
    }),
    [screen, toLevel],
  );

  let content;
  let key: string;
  switch (screen.name) {
    case 'level': {
      const Scene = SCENES[screen.id];
      key = `level-${screen.id}-${run}`;
      content = <Scene level={LEVELS[screen.id]} />;
      break;
    }
    case 'map':
      key = 'map';
      content = <MissionMap />;
      break;
    case 'endless':
      key = `endless-${run}`;
      content = <EndlessScene />;
      break;
    case 'finale':
      key = 'finale';
      content = <Finale />;
      break;
    default:
      key = 'title';
      content = <TitleScreen />;
  }

  const motionClass = settings.motion === 'reduced' ? 'reduce-motion' : settings.motion === 'system' ? 'motion-auto' : '';

  return (
    <NavContext.Provider value={nav}>
      <MotionConfig reducedMotion={reducedMotion ? 'always' : 'never'}>
        <div className={motionClass}>
          <AnimatePresence mode="wait">
            <motion.div key={key} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
              {content}
            </motion.div>
          </AnimatePresence>
          <SettingsModal open={modal === 'settings'} onClose={() => setModal(null)} />
          <FieldNotesModal open={modal === 'notes'} onClose={() => setModal(null)} />
          <HowToPlayModal open={modal === 'help'} onClose={() => setModal(null)} />
        </div>
      </MotionConfig>
    </NavContext.Provider>
  );
}

export default function App() {
  return (
    <GameProvider>
      <Shell />
    </GameProvider>
  );
}
