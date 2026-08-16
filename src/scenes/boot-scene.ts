import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  create(): void {
    // 지금은 외부 에셋 프리로드가 없다. PuppetForge 익스포트가 준비되면 여기서 등록한다.
    this.scene.start('morning');
  }
}
