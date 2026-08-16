import Phaser from 'phaser';
import { loadFonts } from './ui/fonts';
import { BootScene } from './scenes/boot-scene';
import { MorningScene } from './scenes/morning-scene';
import { NoonScene } from './scenes/noon-scene';
import { EveningScene } from './scenes/evening-scene';
import { GuestScene } from './scenes/guest-scene';
import { NightScene } from './scenes/night-scene';
import { CombatScene } from './scenes/combat-scene';
import { RoomTestScene } from './scenes/room-test-scene';

// Phaser는 document.fonts가 준비됐는지 스스로 기다려주지 않으므로, 씬이 텍스트를 그리기
// 전에 폰트 매니저가 폰트 3종을 전부 불러올 때까지 게임 생성을 미룬다.
await loadFonts();

// 1280×720(16:9)을 실제 패키징 게임의 고정 해상도로 삼는다. FIT 모드로 어느 모니터
// 비율에서도 레터박스만 생기고 UI 레이아웃이 늘어나거나 뭉개지지 않게 한다.
new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game-root',
  backgroundColor: '#0a0710',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1280,
    height: 720,
  },
  // 아침 → 점심 → 저녁 → 손님맞이 → 밤 → 전투 → 다음날 아침 순서로 씬을 등록한다.
  // room-test는 방·위험체 렌더링을 확인하는 테스트용 씬으로, 기본 진행 흐름에는 없다.
  scene: [BootScene, MorningScene, NoonScene, EveningScene, GuestScene, NightScene, CombatScene, RoomTestScene],
});
