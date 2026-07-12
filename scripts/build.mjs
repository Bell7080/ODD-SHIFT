// TypeScript 기반 Three.js 프로토타입을 정적 배포물로 컴파일하고 복사합니다.
import { cp, mkdir, rm } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

// dist와 build를 매번 새로 만들어 이전 JS 잔여물이 배포되지 않도록 합니다.
await Promise.all([
  rm('dist', { recursive: true, force: true }),
  rm('build', { recursive: true, force: true }),
]);
await execFileAsync('tsc', ['--project', 'tsconfig.json']);
await mkdir('dist', { recursive: true });
await Promise.all([
  cp('index.html', 'dist/index.html'),
  cp('src/styles.css', 'dist/src/styles.css'),
  cp('build', 'dist/build', { recursive: true }),
]);
console.log('Built TypeScript Three.js prototype into dist/');
