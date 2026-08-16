import Phaser from 'phaser';
import { gameState } from '../state/game-state';
import { drawAdvanceButton, drawHud } from '../ui/hud';
import { makeButton, makeText } from '../ui/text';

const HIRE_COST = 15;
const UPGRADE_COST = 20;

export class EveningScene extends Phaser.Scene {
  constructor() {
    super('evening');
  }

  create(): void {
    drawHud(this, gameState);
    makeText(this, 24, 60, '저녁 — 낮 동안 모은 자원으로 시설을 강화하거나 직원을 영입합니다.', 'body', {
      fontSize: '14px',
      color: '#c7b8ee',
    });

    makeButton(
      this,
      24,
      110,
      `정비자원 ${UPGRADE_COST} 소모 · 1구역 수용실 안정도 강화`,
      () => {
        const facility = gameState.facilities[0];
        if (facility && gameState.spendResource('정비자원', UPGRADE_COST)) {
          facility.stability = Math.min(100, facility.stability + 10);
          gameState.addLog(`${facility.name}의 안정도를 강화했습니다.`);
        } else {
          gameState.addLog('정비자원이 부족합니다.');
        }
        this.scene.restart();
      },
      { fontSize: '13px', backgroundColor: '#7fd4a2', padding: { x: 10, y: 6 } },
    );

    makeButton(
      this,
      24,
      150,
      `연구자원 ${HIRE_COST} 소모 · 신입 직원 영입`,
      () => {
        if (gameState.spendResource('연구자원', HIRE_COST)) {
          const id = `staff_${gameState.employees.length + 1}`;
          gameState.employees.push({ id, name: `신입 ${id}`, role: '케어', aptitude: '생체', skill: 20, fatigue: 0 });
          gameState.addLog('신입 직원을 영입했습니다.');
        } else {
          gameState.addLog('연구자원이 부족합니다.');
        }
        this.scene.restart();
      },
      { fontSize: '13px', backgroundColor: '#7fd4a2', padding: { x: 10, y: 6 } },
    );

    makeText(this, 24, 200, '오늘 밤 자원 운영을 마쳤다면, 손님을 맞이할 차례입니다.', 'body', {
      fontSize: '13px',
      color: '#9683c4',
    });

    drawAdvanceButton(this, '손님 맞이하기 →', 1000, 640, () => {
      gameState.goToGuestSelection();
      this.scene.start('guests');
    });
  }
}
