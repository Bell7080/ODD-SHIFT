// 선택한 손님의 꿈으로 들어가기 직전, 확정된 전투 조건을 보여주는 씬.
import Phaser from 'phaser';
import { gameState } from '../state/game-state';
import { drawAdvanceButton, drawHud } from '../ui/hud';
import { makeText } from '../ui/text';

export class NightScene extends Phaser.Scene {
  constructor() {
    super('night');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#07050b');
    drawHud(this, gameState);

    if (!gameState.nightPlan) {
      // 손님을 고르지 않고 이 씬에 들어온 예외 상황을 대비한 안전장치.
      makeText(this, 24, 80, '아직 들어갈 꿈이 정해지지 않았습니다.', 'body', { fontSize: '15px', color: '#e8dcff' });
      drawAdvanceButton(this, '손님 맞이하기로 돌아가기 →', 24, 130, () => {
        gameState.goToGuestSelection();
        this.scene.start('guests');
      });
      return;
    }
    const plan = gameState.nightPlan;

    // 잘린 모서리의 슬롯 머신 프레임은 굵은 선과 넓은 색면으로 게임의 거친 페이퍼컷 톤을 따른다.
    this.add.polygon(640, 370, [-570, -270, 530, -270, 570, -230, 570, 260, -540, 260, -570, 230], 0x100c18, 1)
      .setStrokeStyle(6, 0x8d68c7, 0.85);
    this.add.rectangle(640, 128, 1060, 66, 0x2b1938, 1).setStrokeStyle(4, 0x050308);
    makeText(this, 640, 112, 'NIGHTMARE BRIEFING  //  SLOT LOCKED', 'accent', { fontSize: '12px', color: '#43d7cf' }).setOrigin(0.5);
    makeText(this, 640, 137, `${gameState.selectedGuestLabel}의 전투 신호`, 'heading', {
      fontSize: '24px',
      color: '#f2e9ff',
    }).setOrigin(0.5);

    makeText(this, 116, 195, `ENEMY SIGNALS  ${plan.enemyCount}  ${plan.tagTeam ? '/ 2 VS 2' : '/ SINGLE'}`, 'accent', { fontSize: '12px', color: '#43d7cf' });
    gameState.encounterQueue.slice(0, 3).forEach((entity, index) => {
      const x = 116 + index * 250;
      this.add.polygon(x + 100, 350, [-100, -140, 86, -140, 104, -118, 96, 135, -92, 135, -106, 110], 0x181220, 1)
        .setStrokeStyle(4, index === 0 ? 0x43d7cf : 0x654776, 0.9);
      // 정식 미리보기 퍼펫 전에도 적의 움직임과 체력 정보를 읽을 수 있는 코드 실루엣이다.
      const silhouette = this.add.polygon(x + 100, 328, [-30, 40, -46, 2, -26, -58, 0, -76, 30, -54, 47, 4, 28, 40], entity.placeholderColor, 0.9);
      this.tweens.add({ targets: silhouette, y: silhouette.y - 7, angle: index % 2 ? 2 : -2, duration: 950 + index * 120, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      makeText(this, x + 18, 230, `SIGNAL 0${index + 1}`, 'accent', { fontSize: '9px', color: '#b999e5' });
      makeText(this, x + 100, 440, entity.name, 'heading', { fontSize: '13px', color: '#f2e9ff', wordWrap: { width: 180 }, align: 'center' }).setOrigin(0.5);
      this.add.rectangle(x + 22, 475, 156, 11, 0x281e30, 1).setOrigin(0, 0);
      this.add.rectangle(x + 22, 475, 156, 11, 0xb64c76, 1).setOrigin(0, 0);
      makeText(this, x + 100, 493, `HP ${entity.combat.maxHp}  /  위험 ${entity.threatTier}`, 'body', { fontSize: '10px', color: '#a99ab8' }).setOrigin(0.5);
    });

    this.add.polygon(1010, 348, [-145, -140, 130, -140, 150, -118, 150, 135, -130, 135, -150, 112], 0x24152e, 1).setStrokeStyle(5, 0xd35885, 0.85);
    makeText(this, 1010, 235, 'EMERGENCY WAKE', 'accent', { fontSize: '11px', color: '#d885a8' }).setOrigin(0.5);
    makeText(this, 1010, 320, `${plan.wakeUps}`, 'heading', { fontSize: '92px', color: '#fff0f7' }).setOrigin(0.5);
    makeText(this, 1010, 405, '긴급 기상 가능 횟수', 'body', { fontSize: '14px', color: '#d9b8ca' }).setOrigin(0.5);
    makeText(this, 640, 536, `${plan.nightmare.name}  //  ${plan.nightmare.description}`, 'body', { fontSize: '13px', color: '#b7a6dd' }).setOrigin(0.5);

    this.drawPartySelection(plan.tagTeam);

    drawAdvanceButton(this, '전투 개시  →', 1030, 642, () => {
      gameState.goToCombat();
      this.scene.start('combat');
    });
  }

  /** 로스터 카드를 눌러 최대 3/6체 출전 순서를 구성하고 태그 선두를 즉시 확인한다. */
  private drawPartySelection(tagTeam: boolean): void {
    const limit = (gameState.facilities[0]?.capacity ?? 0) >= 6 ? 6 : 3;
    makeText(this, 82, 562, `DEPLOY  ${gameState.selectedPartyIds.length}/${limit}  ${tagTeam ? '· 선두 2체 태그 출전' : '· 선두 출전'}`, 'accent', {
      fontSize: '10px', color: '#43d7cf',
    });
    const selectedSlots: Array<{ entityId: string; selectedIndex: number; x: number }> = [];
    gameState.roster.slice(0, 6).forEach((entity, index) => {
      const selectedIndex = gameState.selectedPartyIds.indexOf(entity.id);
      const x = 82 + index * 145;
      const selected = selectedIndex >= 0;
      const frame = this.add.polygon(0, 0, [-64, -30, 58, -30, 66, -22, 62, 29, -62, 29, -67, 22], selected ? 0x25373d : 0x15101c, 1)
        .setStrokeStyle(3, selectedIndex < (tagTeam ? 2 : 1) && selected ? 0x43d7cf : 0x76569c, 0.9);
      const title = makeText(this, -58, -23, selected ? `${selectedIndex + 1}. ${entity.name}` : entity.name, 'heading', {
        fontSize: '9px', color: selected ? '#efffff' : '#8e829a', wordWrap: { width: 112 },
      });
      const stats = makeText(this, -58, 9, `HP ${entity.combat.hp} · ${entity.attribute}`, 'body', { fontSize: '8px', color: '#8fa4aa' });
      const card = this.add.container(x + 66, 606, [frame, title, stats]).setSize(132, 60).setInteractive({ useHandCursor: true });
      let dragged = false;
      if (selected) {
        selectedSlots.push({ entityId: entity.id, selectedIndex, x: x + 66 });
        this.input.setDraggable(card);
        card.on('dragstart', () => { dragged = false; card.setDepth(30); });
        card.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number) => { dragged = true; card.x = dragX; });
        card.on('dragend', () => {
          card.setDepth(0);
          const target = selectedSlots.reduce((nearest, slot) => Math.abs(slot.x - card.x) < Math.abs(nearest.x - card.x) ? slot : nearest);
          if (gameState.reorderPartyMember(entity.id, target.selectedIndex)) this.scene.restart();
          else card.x = x + 66;
        });
      }
      // 드래그하지 않은 짧은 클릭은 기존 선택/해제 조작을 유지한다.
      card.on('pointerup', () => { if (!dragged) { gameState.togglePartyMember(entity.id); this.scene.restart(); } });
    });
  }
}
