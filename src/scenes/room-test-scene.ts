// 방 배경 + 위험체 퍼펫을 실제 크기로 세워 확인하는 테스트 씬. 정식 하루 사이클
// 흐름에는 없고 ?scene=room-test 쿼리로만 들어온다. 일러스트는 원본 해상도 그대로
// 깔기 때문에 1280×720 화면보다 크며, 남는 영역은 화면을 드래그해 둘러본다.
import Phaser from 'phaser';
import { generateHazardEntity } from '../data/encyclopedia';
import { loadCreatureVisual, type CreatureVisual } from '../systems/puppet-loader';
import { makeButton, makeText } from '../ui/text';

const BACKGROUND_KEY = 'room-test-background';
// 맨 앞에 슬래시를 붙이지 않는다 — GitHub Pages 하위 경로 배포에서 절대 경로가 404 나는
// 문제를 피한다 (src/ui/fonts.ts 주석 참고).
const BACKGROUND_URL = 'assets/illustrations/backgrounds/background_001.webp';
const ENTITY_ZIP_URL = 'assets/illustrations/hazard-entities/entity_001.zip';
const CREATURE_SCALE = 0.25;
const FALLBACK_ANIMATIONS = ['idle', 'hit', 'stun', 'roar'];

export class RoomTestScene extends Phaser.Scene {
  private creature: CreatureVisual | null = null;

  constructor() {
    super('room-test');
  }

  preload(): void {
    this.load.image(BACKGROUND_KEY, BACKGROUND_URL);
  }

  async create(): Promise<void> {
    const background = this.add.image(0, 0, BACKGROUND_KEY).setOrigin(0, 0);
    const bgWidth = background.width;
    const bgHeight = background.height;

    // 위험체는 바닥이 보이는 앞쪽, 화면 폭 기준 가운데에 세운다.
    const creatureX = bgWidth / 2;
    const creatureY = bgHeight * 0.82;

    this.setupCamera(bgWidth, bgHeight, creatureX, creatureY);
    this.setupDragPan(bgWidth, bgHeight);

    makeText(this, 12, 12, '방 테스트 — 배경을 드래그해서 둘러보세요 (?scene=room-test 전용)', 'body', {
      fontSize: '12px',
      color: '#e8dcff',
      backgroundColor: '#0a0710cc',
      padding: { x: 6, y: 3 },
    })
      .setScrollFactor(0)
      .setDepth(100);

    // 튜토리얼용 헝겊 고양이 인형(entity_001.zip)을 실제 PuppetForge 에셋으로 세운다.
    // 로드에 실패하면 puppet-loader가 알아서 플레이스홀더로 대체한다.
    const entity = generateHazardEntity({ day: 0, encounterIndex: 0 });
    entity.name = '낡은 헝겊 고양이 인형';
    entity.threatTier = 1;
    entity.form = '인형';
    entity.puppetAssetUrl = ENTITY_ZIP_URL;

    this.creature = await loadCreatureVisual(this, entity, creatureX, creatureY);
    this.creature.setScale(CREATURE_SCALE);
    this.creature.play('idle');

    this.buildAnimationButtons();
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
    const names = this.creature && this.creature.animations.length > 0 ? this.creature.animations : FALLBACK_ANIMATIONS;
    names.forEach((name, index) => {
      makeButton(
        this,
        24 + index * 130,
        664,
        name,
        () => {
          this.creature?.play(name);
        },
        { fontSize: '13px', padding: { x: 10, y: 6 } },
      )
        .setScrollFactor(0)
        .setDepth(100);
    });
  }
}
