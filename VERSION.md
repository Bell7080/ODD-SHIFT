# VERSION

이 파일은 의미 있는 변경이 있을 때마다 버전과 dev로그를 함께 남긴다.
기획 변경을 동반한 작업은 `docs/기획서.md`·`docs/세계관.md`를 먼저 갱신한 뒤 커밋한다.

## v0.1.0 — 2026-08-16

**이전 Three.js 탑뷰 프로토타입(Project Plateau)을 전면 폐기하고, 로보토미 코퍼레이션풍
위험체 관리 게임 "이탈자 구금 부서 (Odd Shift)"로 새로 시작했다.**

- 기술 스택을 TypeScript + Three.js CDN에서 **TypeScript + Phaser 3 + `puppetforge`**
  (자체 제작 2D 종이인형 애니메이션 런타임) 기반으로 전환. 빌드 도구를 tsc 단독 빌드에서
  Vite로 교체.
- `docs/기획서.md`(게임 기획)와 `docs/세계관.md`(세계관) 최초 작성. 세계관 문서는 사용자가
  확정한 설정만 담고, 나머지는 "미정"으로 명시해 임의 창작을 금지하는 규칙을 세웠다.
- 하루 사이클(아침 → 점심 → 저녁 → 손님맞이 → 밤 → 전투 → 다음날 아침) 전체를 왕복
  가능한 상태로 구현:
  - **아침**: 직원·시설 현황, 지난 밤 데려온 위험체의 구금/방생 결정.
  - **점심**: 구금된 위험체를 작업(채집/채광/연구/정비)에 배치해 자원 획득.
  - **저녁**: 자원으로 시설 강화·직원 영입, 이후 "손님 맞이" 단계로 진입.
  - **손님맞이**: 무작위 손님 3명이 그날 밤 자신의 꿈에 대한 은유적 암시 대사를 하고,
    관리자가 한 명을 골라 그 손님의 꿈으로 들어간다. (플레이어 본인의 꿈이 아니라
    "다른 사람의 악몽을 처리해주는" 세계관으로 설계 — `docs/세계관.md` 참고)
  - **밤**: 선택한 손님의 꿈 조건(적 수, 태그매치, 악몽 필드 효과, 응급 각성 가능 횟수)을
    슬롯머신으로 확정해 보여준다.
  - **전투**: 라운드제 턴 전투. 공격/방어/구금 시도, "응급 각성"(세계관상 손님을 직접
    깨우는 응급 개입)을 구현. 승리 시 경험치로 레벨업.
- 백과사전 기반 위험체 절차적 생성(`src/data/encyclopedia.ts`) 구현 — 형태 × 기질 × 속성
  × 위협도 태그 조합으로 위험체를 생성하고, 같은 태그 체계를 저녁 손님의 암시 대사
  생성에도 재사용한다.
- 실제 PuppetForge 에셋(zip)이 없어도 항상 빌드·플레이가 되도록 `src/systems/puppet-loader.ts`
  에서 에셋 유무에 따라 실제 퍼펫 또는 플레이스홀더 실루엣을 그리도록 분기했다.
- Playwright로 아침→점심→저녁→손님맞이→밤→전투 전체 흐름을 수동 스모크 테스트해
  런타임 오류 없음을 확인했다.

## v0.1.1 — 2026-08-16

**폰트·일러스트·오디오를 넣을 에셋 폴더 뼈대를 만들었다.**

- `public/assets/fonts/`, `public/assets/illustrations/{characters,hazard-entities,backgrounds}/`,
  `public/assets/audio/{bgm,sfx}/`를 만들고 각 폴더에 git이 빈 폴더를 추적하지 않는 문제를
  피하려고 `.gitkeep`을 넣었다.
- `public/assets/README.md`에 폴더 구조, Vite가 `/assets/...` 경로로 그대로 서빙한다는 점,
  PuppetForge 캐릭터 zip은 이 폴더가 아니라 별도 경로를 쓴다는 점을 문서화했다.
- `CLAUDE.md` 개발 규칙에 이 폴더를 참조하도록 연결했다.

## v0.1.2 — 2026-08-16

**`puppetforge` 의존성을 npm 레지스트리(0.25.1)에서 GitHub 소스(0.32.0)로 전환해,
사용자가 추가한 첫 실제 위험체 에셋(`entity_001.zip`)이 로드되도록 고쳤다.**

- `entity_001.zip`(puppet.json v14)을 npm의 `puppetforge@0.25.1`로 읽으면
  "이 파일은 더 최신 버전입니다" 오류로 실패했다 — 그 npm 버전은 v12까지만 지원한다.
  npm 레지스트리에는 0.18.0 · 0.25.1 두 버전만 있어 더 받아올 최신판이 없었다.
- 소스 저장소(`github.com/Bell7080/WebGLE`, main HEAD `bed490c`)는 `package.json` 기준
  0.32.0이고 puppet.json v14를 지원한다. 이를 빌드해 Node·Phaser 양쪽에서 테스트한
  결과 `entity_001`(튜토리얼용 헝겊 고양이 인형, 애니메이션 `idle`/`hit`/`stun`/`roar`)이
  정상적으로 로드·재생됐다.
- `package.json`의 `puppetforge` 의존성을 npm 레지스트리 대신
  `git+https://github.com/Bell7080/WebGLE.git#<commit>`으로 커밋 고정했다. `github:` 축약
  표기는 npm이 내부적으로 ssh URL을 우선 시도할 수 있어 GitHub Actions처럼 SSH 키가 없는
  환경에서 실패할 위험이 있어 명시적으로 `git+https://`를 썼다 — 실제로는 codeload
  tarball 경유로 받아지는 것을 확인해 CI에서도 문제 없을 것으로 본다.
- 이 방식은 npm에 새 버전이 publish될 때까지의 임시 조치다. bell7080 계정으로
  `puppetforge`를 npm에 다시 publish하면 이 의존성을 다시 레지스트리 버전으로 되돌린다.
