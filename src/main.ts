import Phaser from 'phaser';
import { BootScene } from './scenes/boot-scene';
import { MorningScene } from './scenes/morning-scene';
import { NoonScene } from './scenes/noon-scene';
import { EveningScene } from './scenes/evening-scene';
import { GuestScene } from './scenes/guest-scene';
import { NightScene } from './scenes/night-scene';
import { CombatScene } from './scenes/combat-scene';

// 아침 → 점심 → 저녁 → 손님맞이 → 밤 → 전투 → 다음날 아침 순서로 씬을 등록한다.
new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game-root',
  backgroundColor: '#0a0710',
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1280,
    height: 720,
  },
  scene: [BootScene, MorningScene, NoonScene, EveningScene, GuestScene, NightScene, CombatScene],
});
