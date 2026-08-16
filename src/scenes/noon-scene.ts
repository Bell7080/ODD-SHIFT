import Phaser from 'phaser';
import { gameState } from '../state/game-state';
import type { HazardEntity, ResourceType } from '../data/types';
import { drawAdvanceButton, drawHud } from '../ui/hud';
import { makeButton, makeText } from '../ui/text';

const WORK_TO_RESOURCE: Record<'gathering' | 'mining' | 'research' | 'maintenance', ResourceType> = {
  gathering: '채집자원',
  mining: '채광자원',
  research: '연구자원',
  maintenance: '정비자원',
};

export class NoonScene extends Phaser.Scene {
  constructor() {
    super('noon');
  }

  create(): void {
    drawHud(this, gameState);
    makeText(this, 24, 60, '점심 — 구금된 위험체를 케어하며 작업에 배치해 자원을 얻습니다.', 'body', {
      fontSize: '14px',
      color: '#c7b8ee',
    });

    let y = 110;
    gameState.roster.forEach((entity) => {
      this.drawEntityRow(entity, y);
      y += 30;
    });

    drawAdvanceButton(this, '저녁으로 →', 1040, 640, () => {
      gameState.goToEvening();
      this.scene.start('evening');
    });
  }

  private drawEntityRow(entity: HazardEntity, y: number): void {
    makeText(this, 24, y, `${entity.name} (Lv.${entity.level})`, 'body', { fontSize: '13px', color: '#e8dcff' });
    let x = 320;
    (Object.keys(WORK_TO_RESOURCE) as Array<keyof typeof WORK_TO_RESOURCE>).forEach((workKey) => {
      const resourceType = WORK_TO_RESOURCE[workKey];
      const amount = entity.work[workKey];
      makeButton(
        this,
        x,
        y,
        `${resourceType} +${amount}`,
        () => {
          gameState.gainResource(resourceType, amount);
          entity.care.stress = Math.min(100, entity.care.stress + 4);
          gameState.addLog(`${entity.name}을(를) ${resourceType} 작업에 배치했습니다.`);
          this.scene.restart();
        },
        { fontSize: '12px', backgroundColor: '#c9b6ff', padding: { x: 6, y: 3 } },
      );
      x += 150;
    });
  }
}
