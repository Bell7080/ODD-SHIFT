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

// 1280×720(16:9) 논리 해상도는 유지하되 FIT으로 작은 모바일 화면에도 캔버스 전체가
// 들어오게 한다. 텍스트 헬퍼가 기기 DPR에 맞춰 글자를 고해상도로 래스터화하므로 축소된
// 화면에서도 UI 글자의 가장자리가 지나치게 뭉개지지 않는다.
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
  // 연구소 메인을 중심으로 손님 선택 → 밤 → 전투 화면만 별도 씬으로 등록한다.
  scene: [
    BootScene,
    GuestScene,
    NightScene,
    CombatScene,
    ContainmentRoomScene,
  ],
});
