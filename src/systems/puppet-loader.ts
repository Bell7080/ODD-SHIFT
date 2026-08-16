// PuppetForge 에셋(zip)이 있으면 그것을 불러오고, 없거나 로드에 실패하면 플레이스홀더
// 실루엣으로 대체한다. 실제 에셋이 없어도 항상 빌드·플레이가 되게 하는 CLAUDE.md 규칙을
// 이 모듈 하나로 지킨다 — 씬 코드는 이 함수만 호출하면 되고 에셋 유무를 신경 쓰지 않는다.
import type Phaser from 'phaser';
import type { HazardEntity } from '../data/types';

export interface CreatureVisual {
  readonly gameObject: Phaser.GameObjects.GameObject;
  playIdle(): void;
  destroy(): void;
}

class PlaceholderCreature implements CreatureVisual {
  readonly gameObject: Phaser.GameObjects.Container;
  private readonly body: Phaser.GameObjects.Arc;

  constructor(scene: Phaser.Scene, entity: HazardEntity, x: number, y: number) {
    const radius = 18 + entity.threatTier * 6;
    this.body = scene.add.circle(0, 0, radius, entity.placeholderColor).setStrokeStyle(2, 0xffffff, 0.25);
    const label = scene.add
      .text(0, radius + 6, entity.name, { fontSize: '11px', color: '#e8dcff' })
      .setOrigin(0.5, 0);
    this.gameObject = scene.add.container(x, y, [this.body, label]);
  }

  playIdle(): void {
    // 기질 태그별 진폭 차이를 자세히 재현하진 못하지만, 실제 애니메이션 도입 전에도
    // 개체마다 다른 인상을 주기 위해 가벼운 대기 트윈을 건다.
    this.body.scene.tweens.add({
      targets: this.body,
      scaleX: 1.05,
      scaleY: 0.95,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  destroy(): void {
    this.gameObject.destroy();
  }
}

export async function loadCreatureVisual(
  scene: Phaser.Scene,
  entity: HazardEntity,
  x: number,
  y: number,
): Promise<CreatureVisual> {
  if (entity.puppetAssetUrl) {
    try {
      const { PuppetCreature } = await import('puppetforge/phaser');
      const creature = await PuppetCreature.load(scene, entity.puppetAssetUrl, { x, y });
      creature.play('idle');
      return {
        gameObject: creature,
        playIdle: () => {
          creature.play('idle');
        },
        destroy: () => creature.destroy(),
      };
    } catch (error) {
      console.warn(`[puppet-loader] ${entity.name} 에셋 로드 실패, 플레이스홀더로 대체합니다.`, error);
    }
  }
  const placeholder = new PlaceholderCreature(scene, entity, x, y);
  placeholder.playIdle();
  return placeholder;
}
