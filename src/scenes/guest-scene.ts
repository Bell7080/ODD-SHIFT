// 저녁마다 찾아오는 세 손님 중 한 명을 골라, 그 손님의 꿈으로 들어갈 준비를 하는 씬.
// 손님의 정체·사연은 세계관 미정이라 지어내지 않고, 접수 번호와 암시 대사만 보여준다.
import Phaser from 'phaser';
import { gameState } from '../state/game-state';
import { drawHud } from '../ui/hud';

export class GuestScene extends Phaser.Scene {
  constructor() {
    super('guests');
  }

  create(): void {
    drawHud(this, gameState);
    this.add.text(
      24,
      60,
      '오늘 밤, 악몽에 시달리는 손님 셋이 찾아왔습니다. 한 명을 골라 그 꿈으로 들어갑니다.',
      { fontSize: '14px', color: '#c7b8ee', wordWrap: { width: 900 } },
    );

    let y = 120;
    gameState.dreamOptions.forEach((option) => {
      this.add.text(24, y, option.guestLabel, { fontSize: '15px', color: '#f2e9ff' });
      this.add.text(24, y + 22, `"${option.hintLine}"`, {
        fontSize: '13px',
        color: '#b7a6dd',
        wordWrap: { width: 760 },
      });
      this.add
        .text(24, y + 50, '이 손님의 꿈으로 →', {
          fontSize: '13px',
          color: '#0a0710',
          backgroundColor: '#9b7ee8',
          padding: { x: 10, y: 6 },
        })
        .setInteractive({ useHandCursor: true })
        .on('pointerup', () => {
          gameState.selectDream(option);
          this.scene.start('night');
        });
      y += 100;
    });
  }
}
