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

// 맨 앞에 슬래시를 붙이지 않는다 — GitHub Pages 프로젝트 페이지는 도메인 루트가 아니라
// /ODD-SHIFT/ 같은 하위 경로에 배포되므로, 절대 경로("/assets/...")는 그 경로를 건너뛰고
// 도메인 루트를 가리켜 404가 난다. 상대 경로는 현재 문서 위치 기준으로 풀리므로 로컬
// 개발 서버·GitHub Pages 어느 쪽에서도 맞게 풀린다 (vite.config.ts의 base: './'와 같은 이유).
const FONT_SPECS: FontSpec[] = [
  { role: 'heading', family: 'April16th Promise', url: 'assets/fonts/April16th-Promise.woff2' },
  { role: 'body', family: 'April16th Life', url: 'assets/fonts/April16th-Life.woff2' },
  { role: 'accent', family: 'April16th Safety', url: 'assets/fonts/April16th-Safety.woff2' },
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

    // allSettled를 쓴다 — 폰트 하나가 404 등으로 실패해도 나머지 폰트와 게임 부팅 자체는
    // 막지 않는다. main.ts가 이 프라미스를 top-level await로 기다리므로, 여기서 거부되면
    // 게임이 아예 뜨지 않는 채로 멈춘다 (검은 화면). 실패한 서체는 브라우저 기본 폰트로
    // 자연스럽게 대체된다.
    loaded = Promise.allSettled(FONT_SPECS.map(({ family }) => document.fonts.load(`16px "${family}"`))).then(
      (results) => {
        results.forEach((result, index) => {
          if (result.status === 'rejected') {
            console.warn(`[fonts] ${FONT_SPECS[index].family} 로드 실패, 기본 폰트로 대체됩니다.`, result.reason);
          }
        });
      },
    );
  }
  return loaded;
}
