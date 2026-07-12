# CLAUDE.md

## 프로젝트 핵심
- Project Plateau는 전체화면 탑뷰 맵에서 플레이어 이동과 랩터 추격을 검증하는 웹 프로토타입이다.
- 현재 구현은 TypeScript 원본 코드와 Three.js CDN ESM 기반이며 GitHub Actions로 정적 배포한다.
- 외부 에셋이 없어도 빌드되도록 플레이어/랩터/사전 제작 맵은 Three.js 코드 기반 프록시 모델을 우선 사용한다.

## 개발 규칙
- 코드에는 다음 작업자가 의도를 이해할 수 있는 주석을 남긴다.
- 시각 테마는 어두운 고원 배경과 녹색/모래색 하이라이트를 유지하되, 현재 화면에는 부가 설명 UI를 두지 않는다.
- 실제 에셋을 추가할 때는 라이선스와 출처를 문서화하고, 빌드 실패를 막기 위해 대체 프록시를 유지한다.

## 주요 명령
- `npm run dev`: TypeScript 빌드 후 `dist`를 로컬 정적 서버로 실행.
- `npm run typecheck`: TypeScript 정적 검사.
- `npm run build`: TypeScript 컴파일 후 정적 배포 산출물 생성.
