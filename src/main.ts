import Phaser from 'phaser';
import { loadFonts } from './ui/fonts';
import { BootScene } from './scenes/boot-scene';
import { GuestScene } from './scenes/guest-scene';
import { NightScene } from './scenes/night-scene';
import { CombatScene } from './scenes/combat-scene';
import { ContainmentRoomScene } from './scenes/containment-room-scene';

// Phaser는 document.fonts가 준비됐는지 스스로 기다려주지 않으므로, 씬이 텍스트를 그리기
// 전에 폰트 매니저가 폰트 3종을 전부 불러올 때까지 게임 생성을 미룬다. loadFonts 자체는
// 폰트 하나가 실패해도 거부되지 않지만, 부팅 전 비동기 단계가 어떤 이유로든 예외를
// 던지는 상황 자체를 막아 "검은 화면으로 멈춤"이 다시는 나오지 않게 한다 — 실패해도
// 기본 폰트로 게임은 뜬다.
try {
  await loadFonts();
} catch (error) {
  console.warn('[main] 폰트 로드 중 오류, 기본 폰트로 계속 진행합니다.', error);
}

// 1280×720(16:9)을 실제 패키징 게임의 고정 해상도로 삼는다.
//
// FIT 모드는 이 캔버스를 브라우저 창 크기에 맞춰 CSS로 확대·축소한다 — 그런데 Phaser는
// 캔버스의 실제 픽셀 버퍼(canvas.width/height)는 그대로 두고 화면에 보이는 크기
// (canvas.style.width/height)만 CSS로 키운다. 그러면 1280×720 크기로 그려진 저해상도
// 이미지를 브라우저가 억지로 늘려서 보여주는 셈이라 텍스트가 흐리게 뭉개진다. 화면을
// 꽉 채우는 것보다 또렷한 텍스트가 우선이라, 확대·축소를 아예 하지 않는 NONE 모드로
// 바꿨다 — 캔버스는 항상 1280×720 그대로(=1:1 픽셀) 그려지고, 화면 가운데 고정 크기로
// 떠 있는다.
new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game-root',
  backgroundColor: '#0a0710',
  scale: {
    mode: Phaser.Scale.NONE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1280,
    height: 720,
  },
  // 연구소 메인을 중심으로 손님 선택 → 밤 → 전투 화면만 별도 씬으로 등록한다.
  scene: [
    BootScene,
    GuestScene,
    NightScene,
    CombatScene,
    ContainmentRoomScene,
  ],
});
