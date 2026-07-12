// 문자열 맵은 PDF 기획의 '사전 제작 생태 구역'을 빠르게 수정 가능한 형태로 보관합니다.
export const TILE_SIZE = 4;

// #=절벽/벽, .=흙, g=나무/수풀, r=바위로 해석합니다.
export const MAP_ROWS = [
  '########################',
  '#....g....r......g.....#',
  '#..####......####....r.#',
  '#..#..#..g...#..#......#',
  '#..#..#......#..#..g...#',
  '#..####..rr..####......#',
  '#..............g....r..#',
  '#....gg....####........#',
  '#..r.......#..#....g...#',
  '#..........#..#........#',
  '#....####..####..rr....#',
  '#....#..#..............#',
  '#..g.#..#....g....####.#',
  '#....####.........#..#.#',
  '#...........rr....#..#.#',
  '#..r....g.........####.#',
  '#...........g..........#',
  '########################',
] as const;

export type EntityBody = { x: number; z: number; radius: number };

// 월드 좌표를 문자열 맵의 행/열로 바꿔 렌더링, 충돌, 클릭 판정이 같은 기준을 쓰게 합니다.
export function getTileAt(x: number, z: number): string {
  const col = Math.floor(x / TILE_SIZE);
  const row = Math.floor(z / TILE_SIZE);
  return MAP_ROWS[row]?.[col] ?? '#';
}

// 월드 경계 밖은 모두 벽으로 취급해 카메라 밖 탈출을 막습니다.
export function isWallAt(x: number, z: number): boolean {
  return getTileAt(x, z) === '#';
}

// 돌과 나무/수풀은 자연물 충돌체로 취급해 플레이어와 랩터가 통과하지 못하게 합니다.
export function isNaturalObstacleAt(x: number, z: number): boolean {
  const tile = getTileAt(x, z);
  return tile === 'r' || tile === 'g';
}

// 모든 이동 차단 타일을 한곳에 모아 클릭 이동과 AI 이동이 동일한 장애물 규칙을 공유합니다.
export function isBlockedAt(x: number, z: number): boolean {
  return isWallAt(x, z) || isNaturalObstacleAt(x, z);
}

// 원형 충돌체 네 모서리를 검사해 3D 모델이 절벽/돌/나무 타일과 겹치지 않게 합니다.
export function canMoveTo(entity: EntityBody, nextX: number, nextZ: number): boolean {
  const r = entity.radius * 0.78;
  return !isBlockedAt(nextX - r, nextZ - r)
    && !isBlockedAt(nextX + r, nextZ - r)
    && !isBlockedAt(nextX - r, nextZ + r)
    && !isBlockedAt(nextX + r, nextZ + r);
}

// 축별 이동은 벽을 스치며 미끄러지는 액션 게임 감각을 만듭니다.
export function moveEntity(entity: EntityBody, dx: number, dz: number): void {
  if (canMoveTo(entity, entity.x + dx, entity.z)) entity.x += dx;
  if (canMoveTo(entity, entity.x, entity.z + dz)) entity.z += dz;
}
