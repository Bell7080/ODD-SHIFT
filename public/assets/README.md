# 에셋 폴더 안내

이 폴더는 `public/` 하위라 Vite가 그대로 정적 파일로 서빙한다. 즉 여기 넣은 파일은
빌드 없이 `/assets/...` 경로로 바로 접근할 수 있다 (예: `public/assets/audio/bgm/night.mp3`
→ 코드에서는 `/assets/audio/bgm/night.mp3`).

아직 실제 에셋이 없어도 게임은 항상 빌드·플레이가 된다 — 코드 기반 플레이스홀더가
대신한다 (`CLAUDE.md`, `src/systems/puppet-loader.ts` 참고). 여기에 파일을 넣고 코드에서
연결하는 것은 그 다음 단계다.

## 폴더 구조

```
public/assets/
 ├ fonts/                       # 폰트 파일 (woff2 권장, ttf/otf도 가능)
 ├ illustrations/
 │  ├ characters/                # 가이드 캐릭터 등 상시 등장 인물 원화
 │  ├ hazard-entities/            # 위험체 원화·레퍼런스
 │  └ backgrounds/                 # 배경·UI 배경 이미지
 └ audio/
    ├ bgm/                        # 배경음악
    └ sfx/                        # 효과음
```

## 파일을 넣을 때

- **출처를 문서화한다.** 직접 제작한 것인지, 외부에서 가져온 것인지(라이선스 포함)를
  이 폴더 또는 커밋 메시지에 남긴다 (`CLAUDE.md` 개발 규칙 참고).
- **PuppetForge 캐릭터 에셋(`.export.zip`)은 여기 두지 않는다.** 위험체·캐릭터 애니메이션은
  `puppetforge` 런타임이 읽는 별도 zip 포맷이라, 준비되면 전용 폴더를 새로 만들어 배치하고
  `src/systems/puppet-loader.ts`의 로더와 연결한다. 이 폴더는 폰트·정적 일러스트·오디오
  전용이다. (zip 내부 텍스처 포맷은 PuppetForge 소관이라 아래 webp 규칙 대상이 아니다.)
- **모든 일러스트(`illustrations/` 하위)는 webp로 변환해서 넣는다.** png/jpg 원본을
  그대로 커밋하지 않는다. `npm run assets:webp`가 `illustrations/` 아래 png·jpg를 찾아
  같은 위치에 `.webp`로 바꾸고 원본을 지운다 (`scripts/convert-illustrations-to-webp.mjs`,
  품질 92 — 육안으로 차이 없이 용량만 크게 줄어든다. 예: 8.1MB PNG → 540KB webp).
- **모든 동영상(`audio/`가 아니라 별도로 추가할 영상 에셋)은 webm으로 변환해서 넣는다.**
  지금은 영상 에셋이 없어 자동 변환 스크립트는 없다. 필요해지면
  `ffmpeg -i in.mp4 -c:v libvpx-vp9 -c:a libopus out.webm` 같은 명령으로 변환한다.
- 파일을 추가한 뒤에는 실제로 코드에서 불러와 화면/사운드에 연결해야 "적용됐다"고 볼 수
  있다. 폴더에 넣는 것과 게임에 연결하는 것은 별개 작업이다.

## 폰트 사용 규칙

- 이 프로젝트의 모든 텍스트는 `src/ui/fonts.ts`의 폰트 매니저를 거쳐서만 그린다 —
  씬에서 `Phaser.Scene.add.text`를 직접 쓰지 않고 `src/ui/text.ts`의 헬퍼를 쓴다.
  `fonts/`에 있는 April16th 계열 3종(Life·Promise·Safety, 서로 다른 스타일의 같은
  폰트 패밀리)이 유일한 서체이며, 역할(heading/body/accent)은 `src/ui/fonts.ts`에서
  관리한다. 새 폰트를 추가하고 싶으면 이 파일 하나만 고치면 전체 게임에 반영된다.
- **April16th 3종은 전부 COLR/CPAL 컬러 폰트다** (`#ffe100`·`#ffc600`·`#ffd600`·`#623c21`
  팔레트가 폰트 파일 안에 내장돼 있다). 크로미움 계열 브라우저의 canvas 텍스트 렌더링은
  이 내장 팔레트를 그대로 쓰고 `TextStyle.color`(채우기 색)를 무시한다 — 그래서 어떤
  색을 지정해도 화면에는 항상 금색 계열로 보인다. 버그가 아니라 폰트 자체의 특성이니,
  `color`로 팔레트를 덮어쓰려 하지 말고 필요하면 배경색·굵기·크기로 대비를 만든다.

## 지금 상태

아직 실제 에셋이 없다. 각 하위 폴더에는 git이 빈 폴더를 추적하지 않기 때문에 자리만
잡아두는 `.gitkeep`이 들어 있다. 실제 파일이 들어오면 `.gitkeep`은 지워도 된다.
