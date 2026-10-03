import { createContext, useContext } from 'react';

export type Screen =
  | { name: 'title' }
  | { name: 'map' }
  | { name: 'level'; id: number; run: number }
  | { name: 'endless' }
  | { name: 'finale' };

export interface Nav {
  screen: Screen;
  toTitle: () => void;
  toMap: () => void;
  toLevel: (id: number) => void;
  toEndless: () => void;
  toFinale: () => void;
  openSettings: () => void;
  openNotes: () => void;
  openHelp: () => void;
}

export const NavContext = createContext<Nav | null>(null);

export function useNav(): Nav {
  const nav = useContext(NavContext);
  if (!nav) throw new Error('useNav must be used inside NavContext');
  return nav;
}
