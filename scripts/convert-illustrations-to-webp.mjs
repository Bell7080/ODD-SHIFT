// 일러스트를 webp로 변환하는 스크립트. `public/assets/illustrations/` 아래의
// png/jpg/jpeg를 찾아 같은 위치에 .webp로 저장하고 원본은 지운다.
// PuppetForge 캐릭터 zip(.export.zip) 내부 텍스처는 그 포맷의 소관이라 건드리지 않는다.
import { readdir, unlink } from 'node:fs/promises';
import { extname, join } from 'node:path';
import sharp from 'sharp';

const TARGET_DIR = 'public/assets/illustrations';
const SOURCE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg']);
const WEBP_QUALITY = 92;

async function collectImageFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectImageFiles(fullPath)));
    } else if (SOURCE_EXTENSIONS.has(extname(entry.name).toLowerCase())) {
      files.push(fullPath);
    }
  }
  return files;
}

const files = await collectImageFiles(TARGET_DIR);
if (files.length === 0) {
  console.log('변환할 png/jpg가 없습니다.');
}

for (const file of files) {
  const outPath = file.replace(extname(file), '.webp');
  await sharp(file).webp({ quality: WEBP_QUALITY }).toFile(outPath);
  await unlink(file);
  console.log(`${file} → ${outPath}`);
}
