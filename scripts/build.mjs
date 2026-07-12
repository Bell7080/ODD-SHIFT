// 정적 빌드 스크립트: TypeScript를 먼저 검사/컴파일한 뒤 GitHub Pages용 산출물을 구성합니다.
import { cp, mkdir, rm } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

// Three.js는 CDN ESM으로 불러오므로 npm 패키지 설치 없이 TypeScript 컴파일만 수행합니다.
// dist와 임시 컴파일 폴더를 매번 새로 만들어 이전 빌드 잔여물이 배포되지 않도록 합니다.
await rm('dist', { recursive: true, force: true });
await rm('.build', { recursive: true, force: true });
await execFileAsync('tsc', []);
await mkdir('dist', { recursive: true });

// 런타임에 필요한 정적 파일과 컴파일된 JavaScript만 복사합니다.
await Promise.all([
  cp('index.html', 'dist/index.html'),
  cp('src/styles.css', 'dist/src/styles.css'),
  cp('.build/src/main.js', 'dist/src/main.js'),
]);

console.log('Built Three.js TypeScript prototype into dist/');
