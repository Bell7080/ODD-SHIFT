// 연구소 전체가 게임의 상시 메인 화면이다. 시간대별 업무는 연구소를 가리지 않는
// 팝업으로 띄우고, 직원은 구금실을 제외한 방과 통로를 계속 순회한다.
import Phaser from 'phaser';
import { gameState } from '../state/game-state';
import { loadCreatureVisual, type CreatureVisual } from '../systems/puppet-loader';
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

interface ContainmentTarget {
  entityId: string;
  bounds: Phaser.Geom.Rectangle;
}

const ROOMS: LabRoom[] = [
  { x: 54, y: 108, width: 520, height: 148, code: '3F / R-01', name: '연구·임시 보호실' },
  { x: 650, y: 108, width: 576, height: 148, code: '3F / M-01', name: '정비실' },
  { x: 54, y: 290, width: 520, height: 148, code: '2F / C-01', name: '제1 구금실', containment: true },
  { x: 650, y: 290, width: 576, height: 148, code: '2F / S-01', name: '직원 휴게실' },
  { x: 54, y: 472, width: 520, height: 148, code: '1F / A-01', name: '자원 보관실' },
  { x: 650, y: 472, width: 576, height: 148, code: '1F / O-01', name: '관제실' },
];

export class ContainmentRoomScene extends Phaser.Scene {
  // 씬 종료 시 비동기로 만든 PuppetForge 오브젝트까지 명시적으로 정리한다.
  private containedVisual: CreatureVisual | null = null;
  // 연속 터치로 동일 모달이 중첩 생성되지 않게 열림 상태를 추적한다.
  private phasePopupOpen = false;
  /** 직원 드롭 판정은 화면에 실제로 그린 위험체 칸과 동일한 좌표를 공유한다. */
  private containmentTargets: ContainmentTarget[] = [];

  constructor() {
    super('containment-room');
  }

  create(): void {
    // Phaser의 scene.restart()는 같은 인스턴스를 재사용하므로 이전 팝업 잠금을 반드시 초기화한다.
    // 이 값이 true로 남으면 아침에서 점심으로 넘어온 뒤 업무창을 다시 열 수 없었다.
    this.phasePopupOpen = false;
    this.containmentTargets = [];
    this.cameras.main.setBackgroundColor('#06070c');
    this.drawLaboratory();
    void this.drawContainedCreature();
    this.drawEmployees();
    drawHud(this, gameState);
    this.drawPhaseButton();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.containedVisual?.destroy());
  }

  /** 방 사이의 빈 공간을 실제 이동 가능한 십자 통로와 중앙 허브로 연결한다. */
  private drawLaboratory(): void {
    makeText(this, 34, 54, 'ODD SHIFT  /  MAIN LABORATORY', 'accent', { fontSize: '13px', color: '#43d7cf' });
    makeText(this, 34, 76, '구금 연구동 · 실시간 관제도', 'heading', { fontSize: '20px', color: '#f2e9ff' });
    // 세 개의 두꺼운 바닥선과 계단형 샤프트로 위에서 내려다보는 지도가 아닌 건물 단면을 만든다.
    [256, 438, 620].forEach((floorY) => this.add.rectangle(30, floorY, 1216, 14, 0x332746, 1).setOrigin(0, 0).setStrokeStyle(3, 0x0a0710));
    this.add.polygon(612, 364, [-24, -92, 24, -92, 24, -20, 50, -20, 50, 92, 2, 92, 2, 20, -24, 20], 0x171320, 1)
      .setStrokeStyle(4, 0x43d7cf, 0.55);
    ROOMS.forEach((room) => this.drawRoom(room));
    makeText(this, 612, 356, 'LIFT', 'accent', { fontSize: '9px', color: '#43d7cf' }).setOrigin(0.5);
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
      this.drawContainmentCells(room);
    } else if (room.code.includes('O-01')) {
      // 최근 로그를 관제실 안에 고정해 사고·생산·구매 결과를 놓치지 않게 한다.
      const recentLogs = gameState.log.slice(-4).join('\n');
      makeText(this, room.x + 18, room.y + 43, recentLogs, 'body', {
        fontSize: '10px', color: '#9db5bb', lineSpacing: 4, wordWrap: { width: room.width - 36 },
      });
      makeButton(this, room.x + room.width - 16, room.y + room.height - 12, '전체 로그 / 필터  →', () => this.drawLogPopup(), {
        fontSize: '9px', color: '#dffdfa', backgroundColor: '#224247', padding: { x: 8, y: 4 },
      }).setOrigin(1, 1);
    } else if (room.code.includes('S-01')) {
      // 휴게실은 부서 사기와 그에 따른 현재 생산 효율을 시각화한다.
      const efficiency = Math.round((0.5 + gameState.morale / 200) * 100);
      makeText(this, room.x + 22, room.y + 54, `부서 사기  ${gameState.morale}%\n작업 생산 효율  ${efficiency}%`, 'heading', {
        fontSize: '14px', color: gameState.morale < 40 ? '#e26982' : '#8bdad1', lineSpacing: 9,
      });
    } else {
      makeText(this, room.x + room.width / 2, room.y + 104, '운영 중', 'body', { fontSize: '12px', color: '#6f8490' }).setOrigin(0.5);
    }
  }

  /** 전체 운영 기록을 날짜 포함으로 열고 전체/운영/사고 분류를 즉시 바꿔 본다. */
  private drawLogPopup(initialFilter: '전체' | '운영' | '사고' = '전체'): void {
    if (this.phasePopupOpen) return;
    this.phasePopupOpen = true;
    const existing = new Set(this.children.list);
    const dismiss = (): void => {
      this.children.list.filter((node) => !existing.has(node)).forEach((node) => node.destroy());
      this.phasePopupOpen = false;
    };
    this.add.rectangle(640, 360, 1280, 720, 0x020205, 0.78).setDepth(40).setInteractive().on('pointerup', dismiss);
    this.add.polygon(640, 360, [-470, -275, 440, -275, 470, -245, 470, 275, -440, 275, -470, 245], 0x0b0911, 1)
      .setStrokeStyle(6, 0x43d7cf, 0.72).setDepth(41).setInteractive();
    makeText(this, 210, 112, 'OPERATIONS ARCHIVE', 'accent', { fontSize: '12px', color: '#43d7cf' }).setDepth(42);
    makeText(this, 210, 142, '관제 운영 기록', 'heading', { fontSize: '24px', color: '#f2e9ff' }).setDepth(42);
    makeButton(this, 1070, 112, '× 닫기', dismiss, { fontSize: '11px', color: '#f2e9ff', backgroundColor: '#392646' }).setOrigin(1, 0).setDepth(42);

    let rendered: Phaser.GameObjects.GameObject[] = [];
    const render = (filter: '전체' | '운영' | '사고'): void => {
      rendered.forEach((node) => node.destroy());
      rendered = [];
      (['전체', '운영', '사고'] as const).forEach((label, index) => {
        const button = makeButton(this, 210 + index * 100, 190, label, () => render(label), {
          fontSize: '10px', color: '#efffff', backgroundColor: label === filter ? '#34746f' : '#30243d', padding: { x: 14, y: 6 },
        }).setDepth(42);
        rendered.push(button);
      });
      const lines = gameState.log.filter((line) => filter === '전체' || line.includes(`[${filter}]`)).slice(-15).reverse();
      const body = makeText(this, 210, 238, lines.length ? lines.join('\n') : '해당 분류의 기록이 없습니다.', 'body', {
        fontSize: '12px', color: '#b7c9cc', lineSpacing: 8, wordWrap: { width: 850 },
      }).setDepth(42);
      rendered.push(body);
    };
    render(initialFilter);
  }

  /** 수용량만큼 독립 구금 칸을 만들고 각 위험체·담당자·몽환 수치를 함께 보여준다. */
  private drawContainmentCells(room: LabRoom): void {
    const facility = gameState.facilities[0];
    const visibleCapacity = Math.min(6, facility?.capacity ?? 0);
    const gap = 6;
    const cellWidth = (room.width - 24 - gap * (visibleCapacity - 1)) / Math.max(1, visibleCapacity);
    Array.from({ length: visibleCapacity }, (_, index) => {
      const entity = gameState.roster[index];
      const x = room.x + 12 + index * (cellWidth + gap);
      const y = room.y + 40;
      const cell = this.add.rectangle(x, y, cellWidth, 94, entity ? 0x170f20 : 0x0b1015, 0.96)
        .setOrigin(0, 0).setStrokeStyle(3, entity?.care.stress && entity.care.stress >= 70 ? 0xd35872 : 0x8d68c7, 0.8);
      if (!entity) {
        makeText(this, x + cellWidth / 2, y + 42, `EMPTY ${index + 1}`, 'accent', { fontSize: '8px', color: '#43545d' }).setOrigin(0.5);
        return;
      }
      const manager = gameState.employees.find((employee) => employee.assignedEntityId === entity.id);
      this.containmentTargets.push({ entityId: entity.id, bounds: new Phaser.Geom.Rectangle(x, y, cellWidth, 94) });
      makeText(this, x + 7, y + 8, entity.name, 'heading', { fontSize: '9px', color: '#f0e5ff', wordWrap: { width: cellWidth - 14 } });
      makeText(this, x + 7, y + 43, `몽환 ${entity.care.stress}%\n${manager ? manager.name : '직원 DROP'}`, 'body', {
        fontSize: '8px', color: manager ? '#43d7cf' : '#b999e5', lineSpacing: 4,
      });
      // 개체 칸 호버는 현재 배치 결과와 위험 임계치를 간단히 설명한다.
      const tip = makeText(this, x + cellWidth / 2, y - 6, `위험 ${entity.threatTier} · ${entity.attribute}\n70 난폭 / 90 탈출`, 'body', {
        fontSize: '8px', color: '#f1e8ff', backgroundColor: '#21162c', padding: { x: 6, y: 4 }, align: 'center',
      }).setOrigin(0.5, 1).setDepth(20).setVisible(false);
      cell.setInteractive().on('pointerover', () => tip.setVisible(true)).on('pointerout', () => tip.setVisible(false));
    });
  }

  /** 로스터의 실제 퍼펫(또는 플레이스홀더)을 구금 윈도우 안에 표시한다. */
  private async drawContainedCreature(): Promise<void> {
    const entity = gameState.roster[0];
    if (!entity) return;
    this.containedVisual = await loadCreatureVisual(this, entity, 112, 342);
    // 전투용 퍼펫을 축소한 뒤 실제 렌더 경계의 하단을 구금 칸 바닥에 맞춰 애매하게 뜨거나
    // 몸 중심을 기준으로 박히지 않게 한다.
    this.containedVisual.setScale(0.045);
    this.containedVisual.alignFeetTo(396);
    this.containedVisual.play('idle');
  }

  /** 직원마다 서로 다른 비구금 지점을 왕복시켜 생활감 있는 순찰 연출을 만든다. */
  private drawEmployees(): void {
    const routes = [
      [{ x: 610, y: 236 }, { x: 840, y: 236 }, { x: 840, y: 418 }, { x: 1050, y: 600 }],
      [{ x: 1020, y: 418 }, { x: 840, y: 418 }, { x: 700, y: 600 }, { x: 210, y: 600 }],
    ];
    gameState.employees.forEach((employee, index) => {
      const route = routes[index % routes.length];
      // 마커는 직원 카드의 축약형이며 드래그해 2층 구금실에 놓으면 실제 GameState 배치가 된다.
      const marker = this.add.polygon(route[0].x, route[0].y, [-12, -10, 10, -10, 14, 7, 0, 13, -14, 7], index % 2 ? 0x9c72d7 : 0x43d7cf, 1)
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
      marker.setInteractive({ draggable: true, useHandCursor: true });
      this.input.setDraggable(marker);
      marker.on('dragstart', () => this.tweens.killTweensOf([marker, label]));
      marker.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
        marker.setPosition(dragX, dragY); label.setPosition(dragX, dragY + 14);
      });
      marker.on('dragend', () => {
        const target = this.containmentTargets.find((candidate) => Phaser.Geom.Rectangle.Contains(candidate.bounds, marker.x, marker.y));
        if (target) {
          gameState.assignEmployee(employee.id, target.entityId);
          this.scene.restart();
        } else this.scene.restart();
      });
      // 드래그 중에는 포인터 옆에 실제 배치 공식을 사용한 예상 효과를 표시한다.
      const previewTip = makeText(this, 0, 0, '', 'body', {
        fontSize: '9px', color: '#ecfaff', backgroundColor: '#173035', padding: { x: 7, y: 5 },
      }).setDepth(30).setVisible(false);
      marker.on('drag', () => {
        const hovered = this.containmentTargets.find((candidate) => Phaser.Geom.Rectangle.Contains(candidate.bounds, marker.x, marker.y));
        const entity = hovered && gameState.roster.find((candidate) => candidate.id === hovered.entityId);
        if (!entity) { previewTip.setVisible(false); return; }
        const preview = gameState.getAssignmentPreview(employee, entity);
        previewTip.setText(`몽환 -${preview.stressReduction}\nPORT +${preview.portBonus}\n전투 +${preview.combatBonus}${preview.aptitudeMatch ? '\n적성 일치' : ''}`)
          .setPosition(marker.x + 18, marker.y - 18).setVisible(true);
      });
    });
  }

  /** 평상시에는 관제도를 열어 두고, 하단 버튼으로만 날짜·페이즈 모달을 연다. */
  private drawPhaseButton(): void {
    const phaseLabels = { morning: '아침', noon: '점심', evening: '저녁', guests: '손님맞이', night: '밤', combat: '전투' };
    makeButton(this, 640, 692, `${gameState.day}일차 · ${phaseLabels[gameState.phase]} 업무 열기  ↑`, () => this.drawPhasePopup(), {
      fontSize: '15px', padding: { x: 20, y: 8 },
    }).setOrigin(0.5, 1);
  }

  /** 현재 시간대의 할 일만 모달에 올려 연구소 맥락을 잃지 않고 하루를 진행한다. */
  private drawPhasePopup(): void {
    if (this.phasePopupOpen) return;
    this.phasePopupOpen = true;
    // 바깥 차단막과 X 버튼은 동일한 닫기 함수를 써 터치와 마우스 모두 즉시 복귀한다.
    const existing = new Set(this.children.list);
    const dismiss = (): void => {
      this.children.list.filter((node) => !existing.has(node)).forEach((node) => node.destroy());
      this.phasePopupOpen = false;
    };
    this.add.rectangle(640, 360, 1280, 720, 0x020205, 0.58).setInteractive().on('pointerup', dismiss);
    // 관제도의 상단 방들은 계속 보이게 두고, 읽기와 진행 동선은 중앙 하단 한 축에 모은다.
    this.add.rectangle(640, 530, 620, 276, 0x05050a, 0.96).setStrokeStyle(2, 0x8d68c7, 0.9);
    this.add.rectangle(640, 530, 620, 276, 0x05050a, 0.001).setInteractive();
    makeButton(this, 930, 402, '× 닫기', dismiss, { fontSize: '12px', color: '#efe6ff', backgroundColor: '#392646' }).setOrigin(1, 0);
    const titles = { morning: '아침 업무 보고', noon: '점심 자동 생산', evening: '저녁 운영', guests: '손님 접수 준비', night: '야간 진입', combat: '전투 중' };
    makeText(this, 640, 418, titles[gameState.phase], 'heading', { fontSize: '23px', color: '#f2e9ff' }).setOrigin(0.5);
    if (gameState.phase === 'morning') this.drawMorningPopup();
    if (gameState.phase === 'noon') this.drawNoonPopup();
    if (gameState.phase === 'evening') this.drawEveningPopup();
  }

  private drawMorningPopup(): void {
    const pending = gameState.pendingCapture[0];
    makeText(this, 640, 455, `직원 ${gameState.employees.length}명 · 구금 개체 ${gameState.roster.length}체\n시설 안정도 ${gameState.facilities[0]?.stability ?? 0}%${pending ? `\n연구실 임시 보호: ${pending.name}` : ''}`, 'body', {
      fontSize: '14px', color: '#b7a6dd', align: 'center', lineSpacing: 10,
    }).setOrigin(0.5, 0);
    if (pending) {
      makeButton(this, 520, 570, '구금 승인', () => {
        const facility = gameState.facilities[0];
        if (facility && facility.occupantIds.length < facility.capacity) {
          gameState.confirmCapture(pending); facility.occupantIds.push(pending.id); gameState.pendingCapture.shift();
        } else gameState.addLog('구금소 빈 칸이 없습니다.');
        this.scene.restart();
      }, { fontSize: '11px' }).setOrigin(0.5);
      makeButton(this, 760, 570, '방생', () => { gameState.releaseEntity(pending); gameState.pendingCapture.shift(); this.scene.restart(); }, { fontSize: '11px', backgroundColor: '#65425b' }).setOrigin(0.5);
    }
    makeButton(this, 640, 608, '점심 업무 시작  →', () => { gameState.goToNoon(); this.scene.restart(); }, { fontSize: '15px', padding: { x: 14, y: 8 } }).setOrigin(0.5);
  }

  private drawNoonPopup(): void {
    const produced = gameState.produceDailyResources();
    const summary = produced
      ? Object.entries(produced).map(([type, amount]) => `${type}  +${amount}`).join('\n')
      : '오늘의 생산은 이미 완료되었습니다.';
    makeText(this, 640, 455, `구금 개체의 작업 적성에 따라 일일 생산했습니다.\n\n${summary}`, 'body', {
      fontSize: '14px', color: '#b7a6dd', align: 'center', lineSpacing: 8,
    }).setOrigin(0.5, 0);
    makeButton(this, 640, 622, '저녁 운영으로  →', () => { gameState.goToEvening(); this.scene.restart(); }, { fontSize: '15px', padding: { x: 14, y: 8 } }).setOrigin(0.5);
  }

  private drawEveningPopup(): void {
    const facility = gameState.facilities[0];
    makeText(this, 640, 468, '오늘 생산된 자원으로 연구동 운영을 마무리하십시오.', 'body', { fontSize: '14px', color: '#b7a6dd' }).setOrigin(0.5);
    makeButton(this, 640, 526, '정비 20 · 안정도 강화', () => {
      if (facility && gameState.spendResource('정비자원', 20)) facility.stability = Math.min(100, facility.stability + 10);
      else gameState.addLog('정비자원이 부족합니다.');
      this.scene.restart();
    }, { fontSize: '13px', backgroundColor: '#7fd4a2', padding: { x: 10, y: 6 } }).setOrigin(0.5);
    makeButton(this, 470, 570, '직원 고용 · 45 PORT', () => { gameState.hireEmployee(); this.scene.restart(); }, { fontSize: '11px' }).setOrigin(0.5);
    const expansionCost = 70 + (facility?.capacity ?? 0) * 10;
    makeButton(this, 810, 570, `구금소 +1 · ${expansionCost} PORT`, () => { gameState.expandContainment(); this.scene.restart(); }, { fontSize: '11px' }).setOrigin(0.5);
    makeButton(this, 640, 608, '손님 맞이하기  →', () => { gameState.goToGuestSelection(); this.scene.start('guests'); }, { fontSize: '15px', padding: { x: 14, y: 8 } }).setOrigin(0.5);
  }
}
