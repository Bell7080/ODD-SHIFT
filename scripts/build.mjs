// 정적 빌드 스크립트: 외부 패키지 없이 GitHub Actions와 웹빌더에서 산출물을 만들 수 있게 합니다.
import { cp, mkdir, rm } from 'node:fs/promises';

// dist를 매번 새로 만들어 이전 빌드 잔여물이 배포되지 않도록 합니다.
await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });

// 순수 정적 파일만 복사하므로 npm registry 접근이 막힌 환경에서도 빌드가 안정적으로 완료됩니다.
await Promise.all([
  cp('index.html', 'dist/index.html'),
  cp('src', 'dist/src', { recursive: true }),
]);

console.log('Built static prototype into dist/');
