// 모든 텍스트는 이 헬퍼를 거쳐서 만든다 — 씬에서 scene.add.text를 직접 부르지 않는다.
// 그래야 폰트 매니저(src/ui/fonts.ts)가 정한 서체 규칙을 벗어난 텍스트가 생기지 않는다.
import type Phaser from 'phaser';
import { FONT, type FontRole } from './fonts';

// Phaser Text는 기본적으로 캔버스 논리 해상도(1x)로 글자를 래스터화한 뒤 그 비트맵을
// 그대로 그린다. 우리 게임은 1280×720 고정 해상도를 FIT 모드로 화면에 맞춰 CSS로
// 확대하고, 실제 모니터도 대부분 devicePixelRatio > 1이라 그 비트맵이 물리 픽셀보다
// 작은 채로 늘어나 글자가 뭉개져 보인다. Text 하나마다 resolution을 높여 더 촘촘한
// 비트맵으로 그리게 하면 확대돼도 또렷하다 — 2를 최소값으로 두고 고DPI 화면은 그
// devicePixelRatio를 그대로 따른다.
const TEXT_RESOLUTION = Math.max(2, typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1);

export function makeText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  value: string | string[],
  role: FontRole,
  style: Phaser.Types.GameObjects.Text.TextStyle = {},
): Phaser.GameObjects.Text {
  return scene.add.text(x, y, value, { fontFamily: FONT[role], resolution: TEXT_RESOLUTION, ...style });
}

/** 클릭 가능한 버튼 텍스트. accent 서체 + 손 커서 + pointerup 핸들러를 한 번에 묶는다. */
export function makeButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  onClick: () => void,
  style: Phaser.Types.GameObjects.Text.TextStyle = {},
): Phaser.GameObjects.Text {
  // 버튼은 별도 색면을 두르지 않고 큰 타이포그래피 자체를 조작 요소로 사용한다.
  // 호출부에 남아 있는 과거 backgroundColor 값도 여기서 걷어 내 화면 전체의 버튼 양식을 통일한다.
  const { backgroundColor: _legacyBackground, ...textStyle } = style;
  void _legacyBackground;
  return makeText(scene, x, y, label, 'accent', {
    fontSize: '20px',
    color: '#e9ddff',
    padding: { x: 14, y: 9 },
    ...textStyle,
  })
    .setInteractive({ useHandCursor: true })
    // 배경 없이도 클릭 가능 여부를 즉시 알 수 있도록 기존 보라·청록 네온 색으로 반응한다.
    .on('pointerover', function (this: Phaser.GameObjects.Text) { this.setColor('#43d7cf'); })
    .on('pointerout', function (this: Phaser.GameObjects.Text) { this.setColor(textStyle.color?.toString() ?? '#e9ddff'); })
    .on('pointerup', onClick);
}
