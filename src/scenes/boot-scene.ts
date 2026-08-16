import Phaser from 'phaser';

// 연구소 관제도가 실제 진행의 상시 메인 화면이며, 디버그 쿼리도 허용된 씬만 연다.
const KNOWN_DEBUG_SCENES = new Set(['containment-room']);

export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  create(): void {
    const requested = new URLSearchParams(window.location.search).get('scene');
    const target = requested && KNOWN_DEBUG_SCENES.has(requested) ? requested : 'containment-room';
    this.scene.start(target);
  }
}
