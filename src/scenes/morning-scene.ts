import Phaser from 'phaser';
import { gameState } from '../state/game-state';
import { drawAdvanceButton, drawHud } from '../ui/hud';

export class MorningScene extends Phaser.Scene {
  constructor() {
    super('morning');
  }

  create(): void {
    drawHud(this, gameState);
    this.add.text(
      24,
      60,
      '아침 — 직원과 시설을 점검하고, 지난 밤 데려온 위험체의 구금 여부를 정합니다.',
      { fontSize: '14px', color: '#c7b8ee', wordWrap: { width: 900 } },
    );

    let y = 110;
    this.add.text(24, y, '직원', { fontSize: '16px', color: '#f2e9ff' });
    y += 26;
    gameState.employees.forEach((employee) => {
      this.add.text(
        24,
        y,
        `${employee.name} · ${employee.role} · 숙련 ${employee.skill} · 피로 ${employee.fatigue}`,
        { fontSize: '13px', color: '#b7a6dd' },
      );
      y += 20;
    });

    y += 16;
    this.add.text(24, y, '시설', { fontSize: '16px', color: '#f2e9ff' });
    y += 26;
    gameState.facilities.forEach((facility) => {
      this.add.text(
        24,
        y,
        `${facility.name} · 수용등급 ${facility.containmentGrade} · ${facility.occupantIds.length}/${facility.capacity} · 안정도 ${facility.stability}`,
        { fontSize: '13px', color: '#b7a6dd' },
      );
      y += 20;
    });

    if (gameState.pendingCapture.length > 0) {
      y += 16;
      this.add.text(24, y, '지난 밤 데려온 위험체 — 구금 여부를 정하세요', {
        fontSize: '16px',
        color: '#f2e9ff',
      });
      y += 26;
      // 배열을 복사해 순회 중 버튼 클릭으로 원본이 바뀌어도 이번 그리기에는 영향이 없게 한다.
      [...gameState.pendingCapture].forEach((entity) => {
        this.add.text(24, y, `${entity.name} (위협도 ${entity.threatTier})`, {
          fontSize: '13px',
          color: '#e8dcff',
        });
        this.add
          .text(360, y, '구금', {
            fontSize: '13px',
            color: '#0a0710',
            backgroundColor: '#7fd4a2',
            padding: { x: 8, y: 3 },
          })
          .setInteractive({ useHandCursor: true })
          .on('pointerup', () => {
            gameState.pendingCapture = gameState.pendingCapture.filter((e) => e.id !== entity.id);
            gameState.confirmCapture(entity);
            this.scene.restart();
          });
        this.add
          .text(420, y, '놓아줌', {
            fontSize: '13px',
            color: '#0a0710',
            backgroundColor: '#e88787',
            padding: { x: 8, y: 3 },
          })
          .setInteractive({ useHandCursor: true })
          .on('pointerup', () => {
            gameState.pendingCapture = gameState.pendingCapture.filter((e) => e.id !== entity.id);
            gameState.releaseEntity(entity);
            this.scene.restart();
          });
        y += 24;
      });
    }

    y += 16;
    this.add.text(24, y, '최근 기록', { fontSize: '16px', color: '#f2e9ff' });
    y += 26;
    gameState.log.slice(-5).forEach((line) => {
      this.add.text(24, y, `· ${line}`, { fontSize: '12px', color: '#9683c4' });
      y += 18;
    });

    drawAdvanceButton(this, '점심으로 →', 1040, 640, () => {
      gameState.goToNoon();
      this.scene.start('noon');
    });
  }
}
