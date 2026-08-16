// 구금 방 — 시설 안에 있는 위험체를 실제 배경·퍼펫 크기 그대로 보여주는 씬.
// GameState의 시설·로스터를 그대로 읽는 뷰일 뿐 자체 상태를 갖지 않는다
// (CLAUDE.md "게임 상태는 단일 소스" 규칙). 점심 페이즈에서 들어오고, 나가면 다시
// 점심으로 돌아간다. 일러스트는 원본 해상도 그대로 깔기 때문에 화면(1280×720)보다
// 커서, 남는 영역은 드래그로 둘러본다.
import Phaser from 'phaser';
import { gameState } from '../state/game-state';
import { loadCreatureVisual, type CreatureVisual } from '../systems/puppet-loader';
import { makeButton, makeText } from '../ui/text';

const BACKGROUND_KEY = 'containment-room-background';
// 맨 앞에 슬래시를 붙이지 않는다 — GitHub Pages 하위 경로 배포에서 절대 경로가 404 나는
// 문제를 피한다 (src/ui/fonts.ts 주석 참고).
const BACKGROUND_URL = 'assets/illustrations/backgrounds/background_001.webp';
const CREATURE_SCALE = 0.25;
const RETURN_SCENE = 'noon';

export class ContainmentRoomScene extends Phaser.Scene {
  private focusedCreature: CreatureVisual | null = null;
  private animationButtons: Phaser.GameObjects.Text[] = [];

  constructor() {
    super('containment-room');
  }

  preload(): void {
    this.load.image(BACKGROUND_KEY, BACKGROUND_URL);
  }

  async create(): Promise<void> {
    const facility = gameState.facilities[0];
    const background = this.add.image(0, 0, BACKGROUND_KEY).setOrigin(0, 0);
    const bgWidth = background.width;
    const bgHeight = background.height;

    const occupants = facility ? gameState.roster.filter((entity) => facility.occupantIds.includes(entity.id)) : [];

    // 바닥이 보이는 앞쪽, 화면 폭 기준으로 나란히 세운다.
    const floorY = bgHeight * 0.82;
    const spacing = 260;
    const startX = bgWidth / 2 - (spacing * (occupants.length - 1)) / 2;

    this.setupCamera(bgWidth, bgHeight, bgWidth / 2, floorY);
    this.setupDragPan(bgWidth, bgHeight);

    makeText(
      this,
      12,
      12,
      facility ? `${facility.name} · ${occupants.length}/${facility.capacity}` : '구금 방',
      'heading',
      { fontSize: '14px', color: '#e8dcff', backgroundColor: '#0a0710cc', padding: { x: 8, y: 4 } },
    )
      .setScrollFactor(0)
      .setDepth(100);
    makeText(this, 12, 40, '드래그해서 방을 둘러보세요', 'body', {
      fontSize: '11px',
      color: '#9683c4',
      backgroundColor: '#0a0710cc',
      padding: { x: 8, y: 3 },
    })
      .setScrollFactor(0)
      .setDepth(100);

    for (let i = 0; i < occupants.length; i += 1) {
      // 로드에 실패하면 puppet-loader가 알아서 플레이스홀더로 대체하므로 실제 에셋
      // 유무를 여기서 신경 쓸 필요가 없다.
      const creature = await loadCreatureVisual(this, occupants[i], startX + spacing * i, floorY);
      creature.setScale(CREATURE_SCALE);
      creature.play('idle');
      // 애니메이션 버튼은 지금은 한 마리 기준으로 첫 입주자만 조작한다 — 방에 여럿이
      // 들어오는 건 이후 확장 대상.
      if (i === 0) this.focusedCreature = creature;
    }

    this.buildAnimationButtons();

    makeButton(this, 1120, 12, '나가기 →', () => this.scene.start(RETURN_SCENE), {
      fontSize: '13px',
      padding: { x: 10, y: 6 },
    })
      .setScrollFactor(0)
      .setDepth(100);
  }

  private setupCamera(bgWidth: number, bgHeight: number, focusX: number, focusY: number): void {
    const camera = this.cameras.main;
    camera.setBounds(0, 0, bgWidth, bgHeight);
    camera.centerOn(focusX, focusY);
  }

  private setupDragPan(bgWidth: number, bgHeight: number): void {
    const camera = this.cameras.main;
    const maxScrollX = Math.max(0, bgWidth - camera.width);
    const maxScrollY = Math.max(0, bgHeight - camera.height);
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!pointer.isDown) return;
      camera.scrollX = Phaser.Math.Clamp(camera.scrollX - (pointer.x - pointer.prevPosition.x), 0, maxScrollX);
      camera.scrollY = Phaser.Math.Clamp(camera.scrollY - (pointer.y - pointer.prevPosition.y), 0, maxScrollY);
    });
  }

  private buildAnimationButtons(): void {
    this.animationButtons.forEach((button) => button.destroy());
    this.animationButtons = [];

    const creature = this.focusedCreature;
    if (!creature || creature.animations.length === 0) return;

    creature.animations.forEach((name, index) => {
      const button = makeButton(
        this,
        24 + index * 130,
        664,
        name,
        () => creature.play(name),
        { fontSize: '13px', padding: { x: 10, y: 6 } },
      )
        .setScrollFactor(0)
        .setDepth(100);
      this.animationButtons.push(button);
    });
  }
}
