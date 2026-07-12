# Project-Plateau

야성적인 전투를 위한 높은 고찰.

## 현재 상태

- TypeScript와 Three.js CDN 모듈 기반 전체화면 3D 탑뷰 웹 프로토타입입니다.
- 플레이어는 사전 제작 맵을 WASD/방향키로 이동하고, 랩터는 맵 안에서 플레이어를 추격합니다.
- 플레이어, 랩터, 지형은 외부 에셋 없이 빌드되는 3D 코드 기반 프록시 모델입니다.
- GitHub Actions를 통해 GitHub Pages 정적 배포가 가능하도록 구성되어 있습니다.

## 실행 방법

```bash
npm run build
npm run dev
```

## 배포 빌드

```bash
npm run build
```
