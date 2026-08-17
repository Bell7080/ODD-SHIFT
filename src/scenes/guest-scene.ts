// 세 손님을 한 화면의 카드 격자로 비교하고, 오늘 밤 들어갈 꿈을 고르는 접수 화면.
// 손님의 신상은 세계관 미정이므로 접수 번호와 시스템이 생성한 암시만 표시한다.
import Phaser from 'phaser';
import { gameState } from '../state/game-state';
import { drawHud } from '../ui/hud';
import { makeButton, makeText } from '../ui/text';

const GUEST_IMAGE_KEY = 'guest-placeholder-001';
// 정식 손님 이미지가 준비될 때까지 사용자 제공 char_001을 세 카드가 함께 사용한다.
const GUEST_IMAGE_URL = 'assets/illustrations/characters/char_001.webp';

export class GuestScene extends Phaser.Scene {
  constructor() {
    super('guests');
  }

  preload(): void {
    this.load.image(GUEST_IMAGE_KEY, GUEST_IMAGE_URL);
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#08070d');
    drawHud(this, gameState);

    makeText(this, 640, 70, 'NIGHT RECEPTION  /  손님 접수', 'heading', {
      fontSize: '24px',
      color: '#f2e9ff',
    }).setOrigin(0.5);
    makeText(this, 640, 99, '세 개의 악몽 신호 중 오늘 밤 진입할 하나를 선택하십시오.', 'body', {
      fontSize: '13px',
      color: '#8e82a9',
    }).setOrigin(0.5);

    gameState.dreamOptions.forEach((option, index) => {
      const x = 74 + index * 404;
      const card = this.add.rectangle(x, 136, 360, 508, 0x0d0b14, 0.94)
        .setOrigin(0, 0)
        .setStrokeStyle(1, index === 1 ? 0x43d7cf : 0x8d68c7, 0.72);
      // 카드 내부의 얇은 상단 선은 연구소 관제 화면과 같은 네온 포인트다.
      this.add.rectangle(x + 18, 153, 324, 2, index === 1 ? 0x43d7cf : 0x8d68c7, 0.9).setOrigin(0, 0);
      makeText(this, x + 20, 166, `GUEST  0${index + 1}`, 'accent', { fontSize: '12px', color: '#43d7cf' });
      makeText(this, x + 20, 188, option.guestLabel, 'heading', { fontSize: '18px', color: '#f2e9ff' });

      const portrait = this.add.image(x + 180, 350, GUEST_IMAGE_KEY).setOrigin(0.5);
      const maxPortraitWidth = 292;
      const maxPortraitHeight = 280;
      portrait.setScale(Math.min(maxPortraitWidth / portrait.width, maxPortraitHeight / portrait.height));
      // 일러스트 가장자리를 가리는 반투명 프레임으로 카드와 이미지의 명암을 통일한다.
      this.add.rectangle(x + 18, 222, 324, 278, 0x050409, 0.12)
        .setOrigin(0, 0)
        .setStrokeStyle(1, 0x514363, 0.7);

      makeText(this, x + 28, 516, `“${option.hintLine}”`, 'body', {
        fontSize: '13px',
        color: '#c8bddc',
        wordWrap: { width: 304 },
        align: 'center',
      }).setOrigin(0, 0);
      makeButton(this, x + 96, 592, '이 악몽 선택  →', () => {
        gameState.selectDream(option);
        this.scene.start('night');
      }, {
        fontSize: '14px',
        backgroundColor: '#bda6ed',
        padding: { x: 16, y: 9 },
      });
      card.setInteractive({ useHandCursor: true });
    });

    // 전투를 더 받지 않을 때만 관리자가 명시적으로 하루를 끝낸다.
    makeText(this, 1020, 676, `오늘 응대 ${gameState.guestsServedToday}건`, 'body', { fontSize: '11px', color: '#8e82a9' }).setOrigin(1, 0.5);
    makeButton(this, 1244, 676, '영업 마감  →', () => this.requestBusinessClose(), {
      fontSize: '13px', color: '#f4eaff', backgroundColor: '#4b263d', padding: { x: 14, y: 8 },
    }).setOrigin(1, 0.5);
  }

  /** 위험 개체가 있으면 바로 날짜를 넘기지 않고 긴급 대응 선택지를 먼저 제공한다. */
  private requestBusinessClose(): void {
    const critical = gameState.getCriticalEntities();
    if (!critical.length) { this.closeBusiness(); return; }
    const entity = critical[0];
    this.add.rectangle(640, 360, 1280, 720, 0x020205, 0.78).setDepth(40).setInteractive();
    this.add.polygon(640, 360, [-350, -190, 320, -190, 350, -160, 350, 190, -320, 190, -350, 160], 0x1d0d18, 1)
      .setStrokeStyle(6, 0xd35872, 0.95).setDepth(41);
    makeText(this, 640, 205, 'CONTAINMENT WARNING', 'accent', { fontSize: '13px', color: '#ff7996' }).setOrigin(0.5).setDepth(42);
    makeText(this, 640, 250, '영업 마감 전 긴급 대응 필요', 'heading', { fontSize: '25px', color: '#fff0f5' }).setOrigin(0.5).setDepth(42);
    makeText(this, 640, 305, `${entity.name}\n몽환 ${entity.care.stress}% · 위험 개체 ${critical.length}체\n대응하지 않으면 시설 피해·사망·탈출이 발생할 수 있습니다.`, 'body', {
      fontSize: '14px', color: '#d8bccb', align: 'center', lineSpacing: 8,
    }).setOrigin(0.5, 0).setDepth(42);
    makeButton(this, 440, 455, '정비자원 25 · 안정화', () => {
      if (gameState.stabilizeEntity(entity.id, 'maintenance')) this.scene.restart();
      else gameState.addLog('긴급 안정화 실패 · 정비자원 부족');
    }, { fontSize: '12px', backgroundColor: '#43a79f' }).setOrigin(0.5).setDepth(42);
    makeButton(this, 640, 455, 'PORT 30 · 안정화', () => {
      if (gameState.stabilizeEntity(entity.id, 'ports')) this.scene.restart();
      else gameState.addLog('긴급 안정화 실패 · PORT 부족');
    }, { fontSize: '12px' }).setOrigin(0.5).setDepth(42);
    makeButton(this, 840, 455, '위험 감수 · 마감', () => this.closeBusiness(), {
      fontSize: '12px', color: '#fff0f5', backgroundColor: '#732e48',
    }).setOrigin(0.5).setDepth(42);
  }

  /** 경고 확인이 끝난 뒤에만 날짜 정산과 관제도 복귀를 실행한다. */
  private closeBusiness(): void {
    gameState.goToNextMorning();
    this.scene.start('containment-room');
  }
}
