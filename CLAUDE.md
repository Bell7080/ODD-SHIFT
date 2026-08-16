# CLAUDE.md

## 프로젝트 핵심
- **이탈자 구금 부서 (Odd Shift)**: 로보토미 코퍼레이션풍으로 "위험체"를 포획·관리하는
  시뮬레이션 + 턴제 전투 게임. 상세 기획은 `docs/기획서.md`를, 세계관 설정은
  `docs/세계관.md`를 최우선 소스로 삼는다.
- 세계관 확장 시 **정해지지 않은 부분을 임의로 창작하지 않는다.** `docs/세계관.md`의
  "미정" 항목은 실제로 비어 있는 것이며, 코드나 문서에 그럴듯한 설정을 지어내 채우지
  말고 사용자에게 먼저 물어본다. 확정된 설정만 "확정된 설정" 절로 옮긴다.
- 기술 스택은 TypeScript + Phaser 3 + 자체 제작 패키지 `puppetforge`
  (2D 종이인형 스켈레탈 애니메이션 런타임, `puppetforge/phaser`로 Mesh 기반 렌더링 제공)다.
  개발 속도가 npm publish 주기보다 빨라서, npm 레지스트리 대신
  `git+https://github.com/Bell7080/WebGLE.git#main`(소스 저장소, bell7080 소유)을
  직접 의존성으로 추적한다. `github:owner/repo` 축약 표기는 npm이 ssh URL로 풀 수 있어
  SSH 키 없는 GitHub Actions 배포 환경에서 실패할 위험이 있으므로 항상 `git+https://`로
  명시한다. 이는 npm에 최신 버전이 다시 publish될 때까지의 임시 조치다.
- 이전 Three.js 3D 탑뷰 프로토타입(Project Plateau)은 폐기했다. 필드를 자유 이동하는
  3D 월드가 아니라, 하루 사이클(아침/점심/저녁/밤)을 오가는 관리 UI + 전투 연출 구조다.
- 실제 PuppetForge 익스포트(zip) 에셋이 없어도 항상 빌드·플레이가 되도록, 위험체/캐릭터는
  코드 기반 플레이스홀더(도형·색상 실루엣)로 우선 표시하고 로더는 zip이 있으면 그것을,
  없으면 플레이스홀더를 그리도록 분기한다.

## 버전 관리 & 기획 동기화 규칙 (필수)
- 이 저장소는 매 업데이트마다 `VERSION.md`에 **버전 번호 + dev로그**를 추가한다.
  새 기능/버그 수정/리팩터 등 사용자에게 의미 있는 변경이 있으면 버전을 올리고,
  무엇을 왜 바꿨는지 짧게 한국어로 남긴다.
- 기획이 바뀌는 작업(새 시스템 추가, 루프 변경, 밸런스 방향 변경 등)을 할 때는
  **코드를 고치기 전에** `docs/기획서.md`를 먼저 최신화한다. 기획서와 실제 구현이
  어긋난 상태로 커밋을 남기지 않는다.
- 기획서와 VERSION.md 갱신을 잊은 채로 "완료"라고 보고하지 않는다.

## 개발 규칙
- 코드에는 다음 작업자가 의도를 이해할 수 있는 한국어 주석을 남긴다.
- 시각 테마는 어둡고 채도 낮은 배경 + 보라/청록 네온 하이라이트를 기본으로 한다
  (`docs/기획서.md` 1장 레퍼런스 참고).
- 실제 PuppetForge 에셋(zip)을 추가할 때는 출처(직접 제작 여부)와 배치 경로를 문서화하고,
  자산이 없는 경우를 대비한 플레이스홀더 분기를 항상 유지한다.
- 폰트·일러스트·오디오는 `public/assets/`(하위 폴더 구조와 규칙은 `public/assets/README.md`
  참고)에 두고, 넣은 뒤에는 실제로 코드에서 불러와 연결해야 적용된 것으로 본다.
- **`public/` 아래 에셋을 코드에서 경로 문자열로 참조할 때 맨 앞에 슬래시를 붙이지
  않는다** (`assets/...`이지 `/assets/...`이 아니다). GitHub Pages 프로젝트 페이지는
  `https://<user>.github.io/ODD-SHIFT/`처럼 도메인 루트가 아닌 하위 경로에 배포되는데,
  절대 경로는 그 하위 경로를 건너뛰고 도메인 루트를 가리켜 404가 난다 (실제로 폰트·Room
  씬 배경이 이 문제로 배포 후 전부 깨진 적이 있다 — `VERSION.md` v0.1.6). 상대 경로는
  현재 문서 위치 기준으로 풀리므로 로컬 개발 서버·GitHub Pages 어디서나 맞게 동작한다.
  새 에셋 경로를 추가하면 `npm run build`로 만든 `dist/`를 하위 경로(`/ODD-SHIFT/`)에
  직접 서빙해 재현해 보고 커밋한다.
- **일러스트는 webp, 동영상은 webm으로 변환해서 커밋한다.** png/jpg·mp4 원본을 그대로
  두지 않는다 (`npm run assets:webp`, 자세한 내용은 `public/assets/README.md`).
- **모든 텍스트는 `src/ui/fonts.ts` 폰트 매니저 + `src/ui/text.ts` 헬퍼를 거친다.**
  씬에서 `scene.add.text`를 직접 호출하지 않는다 — 새 폰트 추가나 서체 정책 변경은
  `src/ui/fonts.ts` 한 곳만 고치면 게임 전체에 반영되게 한다.
- `puppetforge`는 위처럼 GitHub `main`을 추적하지만, `npm install`은 최초 설치 시
  결과를 `package-lock.json`에 커밋 단위로 고정한다 — 자동으로 계속 최신화되지 않는다.
  PuppetForge 관련 작업을 할 때(에셋을 새로 추가·테스트할 때 등)는 먼저
  `rm -rf node_modules/puppetforge && npm install`로 `main`의 최신 커밋을 다시 받아
  버전이 바뀌었는지 확인한다. 바뀌었다면 `node_modules/puppetforge/docs/puppet-json.md`
  기준 포맷 버전 변경 여부를 확인하고, 런타임 로더 코드에 영향이 있으면 함께 반영한 뒤
  typecheck·build로 검증하고 커밋한다.
- 게임 상태(위험체 로스터, 자원, 시설, 날짜 등)는 단일 소스인 `GameState`로 관리하고,
  씬은 이를 읽고 쓰는 뷰로만 동작한다 — 씬 간에 상태를 중복 보관하지 않는다.

## 주요 명령
- `npm install`: 의존성 설치 (Phaser, puppetforge, Vite).
- `npm run dev`: Vite 개발 서버 실행.
- `npm run typecheck`: TypeScript 타입 검사.
- `npm run build`: Vite 프로덕션 빌드. GitHub Actions가 `dist/`를 GitHub Pages로 배포한다.
- `npm run preview`: 빌드 결과 로컬 미리보기.
