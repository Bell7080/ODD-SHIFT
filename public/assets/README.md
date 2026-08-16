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
  전용이다.
- 파일을 추가한 뒤에는 실제로 코드에서 불러와 화면/사운드에 연결해야 "적용됐다"고 볼 수
  있다. 폴더에 넣는 것과 게임에 연결하는 것은 별개 작업이다.

## 지금 상태

아직 실제 에셋이 없다. 각 하위 폴더에는 git이 빈 폴더를 추적하지 않기 때문에 자리만
잡아두는 `.gitkeep`이 들어 있다. 실제 파일이 들어오면 `.gitkeep`은 지워도 된다.
