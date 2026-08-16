// 선택한 손님의 꿈으로 들어가기 직전, 확정된 전투 조건을 보여주는 씬.
import Phaser from 'phaser';
import { gameState } from '../state/game-state';
import { drawAdvanceButton, drawHud } from '../ui/hud';

export class NightScene extends Phaser.Scene {
  constructor() {
    super('night');
  }

  create(): void {
    drawHud(this, gameState);

    if (!gameState.nightPlan) {
      // 손님을 고르지 않고 이 씬에 들어온 예외 상황을 대비한 안전장치.
      this.add.text(24, 80, '아직 들어갈 꿈이 정해지지 않았습니다.', { fontSize: '15px', color: '#e8dcff' });
      drawAdvanceButton(this, '손님 맞이하기로 돌아가기 →', 24, 130, () => {
        gameState.goToGuestSelection();
        this.scene.start('guests');
      });
      return;
    }
    const plan = gameState.nightPlan;

    this.add.text(24, 80, `${gameState.selectedGuestLabel}의 꿈속으로 들어갑니다…`, {
      fontSize: '16px',
      color: '#f2e9ff',
    });
    this.add.text(24, 130, `침입 개체 수: ${plan.enemyCount}마리${plan.tagTeam ? ' (태그매치)' : ''}`, {
      fontSize: '15px',
      color: '#e8dcff',
    });
    this.add.text(24, 160, `악몽: ${plan.nightmare.name} — ${plan.nightmare.description}`, {
      fontSize: '15px',
      color: '#e8dcff',
    });
    this.add.text(24, 190, `응급 각성 가능 횟수: ${plan.wakeUps}회`, { fontSize: '15px', color: '#e8dcff' });

    this.add.text(24, 240, '오늘 밤 조우할 위험체', { fontSize: '16px', color: '#f2e9ff' });
    let y = 270;
    gameState.encounterQueue.forEach((entity) => {
      this.add.text(24, y, `${entity.name} · 위협도 ${entity.threatTier} · HP ${entity.combat.maxHp}`, {
        fontSize: '13px',
        color: '#b7a6dd',
      });
      y += 20;
    });

    drawAdvanceButton(this, '전투 시작 →', 1000, 640, () => {
      gameState.goToCombat();
      this.scene.start('combat');
    });
  }
}
