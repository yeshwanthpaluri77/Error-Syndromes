import type { ComponentType } from 'react';
import type { LevelDef } from '../types/game';
import Scene00 from './Scene00';
import Scene01 from './Scene01';
import Scene02 from './Scene02';
import Scene03 from './Scene03';
import Scene04 from './Scene04';
import Scene05 from './Scene05';
import Scene06 from './Scene06';
import Scene07 from './Scene07';
import Scene08 from './Scene08';
import Scene09 from './Scene09';
import Scene10 from './Scene10';
import Scene11 from './Scene11';

/** One scene per mission, indexed by level id. */
export const SCENES: Array<ComponentType<{ level: LevelDef }>> = [
  Scene00,
  Scene01,
  Scene02,
  Scene03,
  Scene04,
  Scene05,
  Scene06,
  Scene07,
  Scene08,
  Scene09,
  Scene10,
  Scene11,
];
