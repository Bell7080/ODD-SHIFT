import Phaser from 'phaser';

// 실제 진행 흐름은 항상 아침부터 시작한다. ?scene=room-test 같은 쿼리로만 예외적으로
// 테스트용 씬에 바로 들어갈 수 있게 해, 평소 플레이 진입점은 건드리지 않는다.
const KNOWN_DEBUG_SCENES = new Set(['room-test']);

export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  create(): void {
    const requested = new URLSearchParams(window.location.search).get('scene');
    const target = requested && KNOWN_DEBUG_SCENES.has(requested) ? requested : 'morning';
    this.scene.start(target);
  }
}
