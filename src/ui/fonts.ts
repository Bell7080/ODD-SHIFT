// 폰트 매니저 — 게임에서 쓰는 서체는 여기 하나로 관리한다. 씬은 이 파일이 정한 역할
// 이름(heading/body/accent)만 알면 되고, 실제 폰트 파일이 바뀌어도 여기만 고치면 된다.
// April16th 계열 3종은 같은 폰트 패밀리의 서로 다른 스타일이다: Promise(제목·강조가
// 굵고 또렷함) → 표제용, Life(본문에 적합한 굵기) → 본문용, Safety(각지고 눈에 띔) →
// 버튼·경고 등 강조용으로 배정했다. 의미 배정은 화면 안 텍스트 역할 기준이며 세계관과는
// 무관하다.
export type FontRole = 'heading' | 'body' | 'accent';

interface FontSpec {
  role: FontRole;
  family: string;
  url: string;
}

const FONT_SPECS: FontSpec[] = [
  { role: 'heading', family: 'April16th Promise', url: '/assets/fonts/April16th-Promise.woff2' },
  { role: 'body', family: 'April16th Life', url: '/assets/fonts/April16th-Life.woff2' },
  { role: 'accent', family: 'April16th Safety', url: '/assets/fonts/April16th-Safety.woff2' },
];

/** 씬 코드에서 쓰는 역할 → CSS font-family 문자열. Phaser TextStyle의 fontFamily에 그대로 넣는다. */
export const FONT: Record<FontRole, string> = {
  heading: `"${FONT_SPECS.find((f) => f.role === 'heading')!.family}"`,
  body: `"${FONT_SPECS.find((f) => f.role === 'body')!.family}"`,
  accent: `"${FONT_SPECS.find((f) => f.role === 'accent')!.family}"`,
};

let loaded: Promise<void> | null = null;

/**
 * 폰트 3종을 전부 불러온다. Phaser는 `document.fonts`가 준비됐는지 스스로 기다려주지
 * 않으므로, 게임(`new Phaser.Game(...)`)을 만들기 전에 반드시 이 함수를 await한다.
 * 이미 불러왔으면 같은 프라미스를 재사용한다.
 *
 * TypeScript의 DOM lib이 `FontFaceSet.add`를 타입에 담고 있지 않아(브라우저에는 있다),
 * `FontFace` API로 직접 등록하는 대신 `@font-face` CSS를 주입하고 `document.fonts.load`로
 * 강제 로드해 기다린다 — 둘 다 표준 동작이고 이쪽이 타입 단언 없이 깔끔하다.
 */
export function loadFonts(): Promise<void> {
  if (!loaded) {
    const style = document.createElement('style');
    style.textContent = FONT_SPECS.map(
      ({ family, url }) => `@font-face { font-family: "${family}"; src: url("${url}") format("woff2"); }`,
    ).join('\n');
    document.head.appendChild(style);

    loaded = Promise.all(FONT_SPECS.map(({ family }) => document.fonts.load(`16px "${family}"`))).then(
      () => undefined,
    );
  }
  return loaded;
}
