// 모든 텍스트는 이 헬퍼를 거쳐서 만든다 — 씬에서 scene.add.text를 직접 부르지 않는다.
// 그래야 폰트 매니저(src/ui/fonts.ts)가 정한 서체 규칙을 벗어난 텍스트가 생기지 않는다.
import type Phaser from 'phaser';
import { FONT, type FontRole } from './fonts';

export function makeText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  value: string | string[],
  role: FontRole,
  style: Phaser.Types.GameObjects.Text.TextStyle = {},
): Phaser.GameObjects.Text {
  return scene.add.text(x, y, value, { fontFamily: FONT[role], ...style });
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
  return makeText(scene, x, y, label, 'accent', {
    color: '#0a0710',
    backgroundColor: '#9b7ee8',
    padding: { x: 12, y: 7 },
    ...style,
  })
    .setInteractive({ useHandCursor: true })
    .on('pointerup', onClick);
}
