import { defineConfig } from 'vite';

// GitHub Pages 프로젝트 페이지 경로(사용자/저장소 하위)에서도 자산이 깨지지 않도록 상대 경로를 쓴다.
export default defineConfig({
  base: './',
});
