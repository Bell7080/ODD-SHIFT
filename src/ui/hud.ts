// 모든 씬이 공유하는 상단 HUD와 하단 진행 버튼. 상태 표시만 담당하고 상태를 갖지 않는다.
import type Phaser from 'phaser';
import type { GameState } from '../state/game-state';
import type { DayPhase } from '../data/types';
import { makeButton, makeText } from './text';

const PHASE_LABEL: Record<DayPhase, string> = {
  morning: '아침',
  noon: '점심',
  evening: '저녁',
  guests: '손님맞이',
  night: '밤',
  combat: '전투',
};

export function drawHud(scene: Phaser.Scene, state: GameState): Phaser.GameObjects.Text {
  const resourceText = Object.entries(state.resources)
    .map(([type, amount]) => `${type} ${amount}`)
    .join('  ');
  return makeText(
    scene,
    24,
    18,
    `${state.day}일차 · ${PHASE_LABEL[state.phase]}   |   PORT ${state.ports}   |   사기 ${state.morale}%   |   ${resourceText}`,
    'body',
    { fontSize: '16px', color: '#d8c9ff' },
  );
}

export function drawAdvanceButton(
  scene: Phaser.Scene,
  label: string,
  x: number,
  y: number,
  onClick: () => void,
): Phaser.GameObjects.Text {
  return makeButton(scene, x, y, label, onClick, { fontSize: '18px', padding: { x: 16, y: 10 } });
}
