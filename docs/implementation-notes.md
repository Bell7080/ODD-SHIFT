# 구현 노트

## 2026-07-12 환경 조성
- 기획서의 진화형 AI/탑뷰 전투 방향에 맞춰 웹에서 바로 실행 가능한 3D 프로토타입 환경을 구성했다.
- 무료 공룡/플레이어 에셋은 네트워크 및 라이선스 안정성을 위해 직접 다운로드하지 않았고, 대신 저작권 문제가 없는 코드 기반 프록시 모델을 적용했다.
- GitHub Actions는 정적 빌드 결과물인 `dist`를 GitHub Pages artifact로 배포하도록 구성했다.

## 2026-07-12 Three.js/TypeScript 3D 전환
- 기존 `src/main.js` Canvas 2D 구현을 삭제하고 `src/main.ts`, `src/entities.ts`, `src/world.ts`, `src/design.ts`로 책임을 분리했다.
- Three.js CDN 모듈을 사용하는 TypeScript 구조로 전환해 플레이어, 랩터, 절벽, 바위, 풀을 3D 프록시 모델로 렌더링한다.
- 카메라는 플레이어를 따라가는 기울어진 탑뷰로 구성해 F11 전체화면에서 지형과 적이 돌출되어 보이게 했다.
- 랩터의 `speed`와 `phase`는 이후 PDF 기획의 진화형 AI 유전자/행동 파라미터로 확장할 수 있는 슬롯으로 남겼다.
- 현재 잔여 코드 점검 결과, 이전 Canvas 2D 소스 파일 `src/main.js`는 제거했으며 테스트용 임시 코드는 추가하지 않았다.

## 다음 에셋 교체 슬롯
- `src/entities.ts`의 `createPlayer`는 플레이어 GLB/GLTF 모델로 교체 가능하다.
- `src/entities.ts`의 `createRaptor`는 무료 공룡 모델로 교체 가능하다.
- 외부 에셋 도입 시 `public/assets` 하위에 출처별 폴더와 라이선스 파일을 함께 둔다.
