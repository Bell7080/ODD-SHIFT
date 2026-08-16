// 연구소 전체가 게임의 상시 메인 화면이다. 시간대별 업무는 연구소를 가리지 않는
// 팝업으로 띄우고, 직원은 구금실을 제외한 방과 통로를 계속 순회한다.
import Phaser from 'phaser';
import { gameState } from '../state/game-state';
import { drawHud } from '../ui/hud';
import { makeButton, makeText } from '../ui/text';

interface LabRoom {
  x: number;
  y: number;
  width: number;
  height: number;
  code: string;
  name: string;
  containment?: boolean;
}

const ROOMS: LabRoom[] = [
  { x: 34, y: 105, width: 340, height: 205, code: 'C-01', name: '제1 구금실', containment: true },
  { x: 454, y: 105, width: 340, height: 205, code: 'R-01', name: '연구 작업실' },
  { x: 874, y: 105, width: 372, height: 205, code: 'M-01', name: '정비실' },
  { x: 34, y: 430, width: 340, height: 205, code: 'S-01', name: '직원 휴게실' },
  { x: 454, y: 430, width: 340, height: 205, code: 'A-01', name: '자원 보관실' },
  { x: 874, y: 430, width: 372, height: 205, code: 'O-01', name: '관제실' },
];

export class ContainmentRoomScene extends Phaser.Scene {
  constructor() {
    super('containment-room');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#06070c');
    this.drawLaboratory();
    this.drawEmployees();
    drawHud(this, gameState);
    this.drawPhasePopup();
  }

  /** 방 사이의 빈 공간을 실제 이동 가능한 십자 통로와 중앙 허브로 연결한다. */
  private drawLaboratory(): void {
    makeText(this, 34, 54, 'ODD SHIFT  /  MAIN LABORATORY', 'accent', { fontSize: '13px', color: '#43d7cf' });
    makeText(this, 34, 76, '구금 연구동 · 실시간 관제도', 'heading', { fontSize: '20px', color: '#f2e9ff' });
    this.add.rectangle(0, 330, 1280, 80, 0x11131d, 1).setOrigin(0, 0).setStrokeStyle(1, 0x4e4061, 0.7);
    this.add.rectangle(394, 92, 40, 560, 0x11131d, 1).setOrigin(0, 0);
    this.add.rectangle(814, 92, 40, 560, 0x11131d, 1).setOrigin(0, 0);
    this.add.rectangle(594, 330, 92, 80, 0x191525, 1).setOrigin(0, 0).setStrokeStyle(1, 0x43d7cf, 0.45);
    ROOMS.forEach((room) => this.drawRoom(room));
    makeText(this, 640, 359, 'CENTRAL HUB', 'accent', { fontSize: '9px', color: '#43d7cf' }).setOrigin(0.5);
  }

  /** 방의 용도를 색과 라벨로 구분하되 기존 보라·청록 관제 테마를 유지한다. */
  private drawRoom(room: LabRoom): void {
    const accent = room.containment ? 0x9c72d7 : 0x43d7cf;
    this.add.rectangle(room.x, room.y, room.width, room.height, 0x090a11, 0.95)
      .setOrigin(0, 0).setStrokeStyle(2, accent, 0.65);
    this.add.rectangle(room.x, room.y, room.width, 32, 0x141522, 1).setOrigin(0, 0);
    makeText(this, room.x + 12, room.y + 9, `${room.code}  ${room.name}`, 'accent', {
      fontSize: '10px', color: room.containment ? '#b999e5' : '#43d7cf',
    });
    if (room.containment) {
      const entity = gameState.roster[0];
      makeText(this, room.x + 18, room.y + 66, entity?.name ?? '구금 개체 없음', 'heading', { fontSize: '15px', color: '#e8dcff' });
      makeText(this, room.x + 18, room.y + 100, entity ? `위험 ${entity.threatTier} · ${entity.attribute}\n몽환도 ${entity.combat.mentality}%` : '격리 상태', 'body', {
        fontSize: '11px', color: '#998cab', lineSpacing: 7,
      });
      this.add.rectangle(room.x + 225, room.y + 58, 88, 112, 0x170f20, 0.9).setOrigin(0, 0).setStrokeStyle(1, 0x8d68c7, 0.7);
      makeText(this, room.x + 269, room.y + 110, '격리', 'accent', { fontSize: '11px', color: '#b999e5' }).setOrigin(0.5);
    } else {
      makeText(this, room.x + room.width / 2, room.y + 104, '운영 중', 'body', { fontSize: '12px', color: '#6f8490' }).setOrigin(0.5);
    }
  }

  /** 직원마다 서로 다른 비구금 지점을 왕복시켜 생활감 있는 순찰 연출을 만든다. */
  private drawEmployees(): void {
    const routes = [
      [{ x: 610, y: 370 }, { x: 620, y: 190 }, { x: 835, y: 370 }, { x: 1050, y: 520 }],
      [{ x: 1020, y: 370 }, { x: 835, y: 370 }, { x: 620, y: 520 }, { x: 210, y: 370 }],
    ];
    gameState.employees.forEach((employee, index) => {
      const route = routes[index % routes.length];
      const marker = this.add.circle(route[0].x, route[0].y, 9, index % 2 ? 0x9c72d7 : 0x43d7cf, 1)
        .setStrokeStyle(2, 0xe8dcff, 0.8);
      const label = makeText(this, route[0].x, route[0].y + 14, employee.name, 'body', { fontSize: '9px', color: '#c8bddc' }).setOrigin(0.5, 0);
      let destination = 1;
      const move = (): void => {
        const point = route[destination];
        this.tweens.add({ targets: [marker, label], x: point.x, y: (_target: unknown, key: string) => point.y + (key === 'y' && _target === label ? 14 : 0), duration: 2800 + index * 500, onComplete: () => {
          destination = (destination + 1) % route.length;
          move();
        } });
      };
      move();
    });
  }

  /** 현재 시간대의 할 일만 모달에 올려 연구소 맥락을 잃지 않고 하루를 진행한다. */
  private drawPhasePopup(): void {
    this.add.rectangle(640, 360, 600, 350, 0x05050a, 0.96).setStrokeStyle(2, 0x8d68c7, 0.9);
    const titles = { morning: '아침 업무 보고', noon: '점심 자동 생산', evening: '저녁 운영', guests: '손님 접수 준비', night: '야간 진입', combat: '전투 중' };
    makeText(this, 640, 225, titles[gameState.phase], 'heading', { fontSize: '23px', color: '#f2e9ff' }).setOrigin(0.5);
    if (gameState.phase === 'morning') this.drawMorningPopup();
    if (gameState.phase === 'noon') this.drawNoonPopup();
    if (gameState.phase === 'evening') this.drawEveningPopup();
  }

  private drawMorningPopup(): void {
    makeText(this, 390, 275, `직원 ${gameState.employees.length}명 · 구금 개체 ${gameState.roster.length}체\n시설 안정도 ${gameState.facilities[0]?.stability ?? 0}%`, 'body', {
      fontSize: '14px', color: '#b7a6dd', lineSpacing: 10,
    });
    makeButton(this, 780, 470, '점심 업무 시작  →', () => { gameState.goToNoon(); this.scene.restart(); }, { fontSize: '15px', padding: { x: 14, y: 8 } });
  }

  private drawNoonPopup(): void {
    const produced = gameState.produceDailyResources();
    const summary = produced
      ? Object.entries(produced).map(([type, amount]) => `${type}  +${amount}`).join('\n')
      : '오늘의 생산은 이미 완료되었습니다.';
    makeText(this, 390, 275, `구금 개체의 작업 적성에 따라 일일 생산했습니다.\n\n${summary}`, 'body', {
      fontSize: '14px', color: '#b7a6dd', lineSpacing: 8,
    });
    makeButton(this, 780, 470, '저녁 운영으로  →', () => { gameState.goToEvening(); this.scene.restart(); }, { fontSize: '15px', padding: { x: 14, y: 8 } });
  }

  private drawEveningPopup(): void {
    const facility = gameState.facilities[0];
    makeText(this, 390, 275, '오늘 생산된 자원으로 연구동 운영을 마무리하십시오.', 'body', { fontSize: '14px', color: '#b7a6dd' });
    makeButton(this, 390, 330, '정비 20 · 안정도 강화', () => {
      if (facility && gameState.spendResource('정비자원', 20)) facility.stability = Math.min(100, facility.stability + 10);
      else gameState.addLog('정비자원이 부족합니다.');
      this.scene.restart();
    }, { fontSize: '13px', backgroundColor: '#7fd4a2', padding: { x: 10, y: 6 } });
    makeButton(this, 780, 470, '손님 맞이하기  →', () => { gameState.goToGuestSelection(); this.scene.start('guests'); }, { fontSize: '15px', padding: { x: 14, y: 8 } });
  }
}
