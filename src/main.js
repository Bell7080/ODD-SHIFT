// Project Plateau 플레이어블 프로토타입: Canvas 2D만으로 사전 제작 맵, 플레이어 이동, 랩터 추격을 검증합니다.
const canvas = document.querySelector('[data-scene-canvas]');
const ctx = canvas.getContext('2d');

// 입력 상태는 매 프레임 누적 처리해 WASD/방향키 이동이 부드럽게 이어지도록 합니다.
const keys = new Set();
const pointer = { x: 0, y: 0, active: false };

// 사전 제작 맵 데이터입니다. 문자 타일을 사람이 읽기 쉬운 심볼로 유지해 이후 에디터/JSON 분리가 쉽습니다.
const tileSize = 72;
const mapRows = [
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
];
// 플레이어와 랩터는 월드 좌표 기준으로 움직이며 카메라가 플레이어를 따라갑니다.
const player = { x: tileSize * 3.2, y: tileSize * 14.5, radius: 18, speed: 245, facing: 0 };
const raptors = [
  { x: tileSize * 17.5, y: tileSize * 4.5, radius: 23, speed: 112, phase: 0.2 },
  { x: tileSize * 19.4, y: tileSize * 12.8, radius: 24, speed: 98, phase: 1.8 },
  { x: tileSize * 6.2, y: tileSize * 7.4, radius: 21, speed: 126, phase: 3.1 },
  { x: tileSize * 13.6, y: tileSize * 15.2, radius: 22, speed: 106, phase: 4.2 },
];

// 충돌용 벽 판정은 맵 문자열에서 # 타일만 검사해 성능과 가독성을 함께 확보합니다.
function isWallAt(x, y) {
  const col = Math.floor(x / tileSize);
  const row = Math.floor(y / tileSize);
  return !mapRows[row] || mapRows[row][col] === '#';
}

// 원형 캐릭터가 벽 모서리에 끼지 않도록 네 방향 가장자리를 검사합니다.
function canMoveTo(entity, nextX, nextY) {
  const r = entity.radius * 0.78;
  return !isWallAt(nextX - r, nextY - r)
    && !isWallAt(nextX + r, nextY - r)
    && !isWallAt(nextX - r, nextY + r)
    && !isWallAt(nextX + r, nextY + r);
}

// 축별 이동을 분리하면 벽에 닿았을 때 미끄러지듯 통로를 따라 움직일 수 있습니다.
function moveEntity(entity, dx, dy) {
  const nextX = entity.x + dx;
  const nextY = entity.y + dy;
  if (canMoveTo(entity, nextX, entity.y)) entity.x = nextX;
  if (canMoveTo(entity, entity.x, nextY)) entity.y = nextY;
}

// 캔버스 해상도를 CSS 크기와 DPR에 맞춰 선명하게 유지합니다.
function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(rect.width * dpr);
  canvas.height = Math.floor(rect.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

// 현재 플레이어 위치를 중심으로 월드 좌표를 화면 좌표로 변환합니다.
function worldToScreen(x, y) {
  return {
    x: x - player.x + canvas.clientWidth / 2,
    y: y - player.y + canvas.clientHeight / 2,
  };
}

// 화면 밖 배경까지 자연스럽게 보이도록 현재 카메라에 필요한 타일 범위만 그립니다.
function drawMap() {
  const startCol = Math.max(0, Math.floor((player.x - canvas.clientWidth / 2) / tileSize) - 1);
  const endCol = Math.min(mapRows[0].length - 1, Math.ceil((player.x + canvas.clientWidth / 2) / tileSize) + 1);
  const startRow = Math.max(0, Math.floor((player.y - canvas.clientHeight / 2) / tileSize) - 1);
  const endRow = Math.min(mapRows.length - 1, Math.ceil((player.y + canvas.clientHeight / 2) / tileSize) + 1);

  ctx.fillStyle = '#0a120f';
  ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);

  for (let row = startRow; row <= endRow; row += 1) {
    for (let col = startCol; col <= endCol; col += 1) {
      const tile = mapRows[row][col];
      const point = worldToScreen(col * tileSize, row * tileSize);
      drawTile(tile, point.x, point.y, row, col);
    }
  }
}

// 타일 종류별 색과 장식은 기존 녹색/모래색 테마를 유지하며 실제 제작된 맵처럼 보이게 합니다.
function drawTile(tile, x, y, row, col) {
  const noise = ((row * 17 + col * 31) % 9) / 100;
  ctx.fillStyle = tile === '#' ? '#263323' : tile === 'r' ? '#514a37' : '#243d2b';
  ctx.fillRect(x, y, tileSize + 1, tileSize + 1);

  if (tile !== '#') {
    ctx.fillStyle = `rgba(141, 255, 186, ${0.035 + noise})`;
    ctx.fillRect(x + 8, y + 8, tileSize - 16, tileSize - 16);
  }

  if (tile === 'g') {
    ctx.fillStyle = 'rgba(149, 242, 182, 0.34)';
    ctx.beginPath();
    ctx.ellipse(x + 36, y + 42, 24, 10, -0.4, 0, Math.PI * 2);
    ctx.fill();
  }

  if (tile === 'r' || tile === '#') {
    ctx.fillStyle = tile === '#' ? '#536146' : '#7d6f56';
    ctx.beginPath();
    ctx.ellipse(x + 35, y + 38, tile === '#' ? 30 : 21, tile === '#' ? 24 : 14, 0.35, 0, Math.PI * 2);
    ctx.fill();
  }
}

// 생명체 공통 그림자는 탑뷰에서도 높이감이 보이도록 본체 아래에 깔립니다.
function drawShadow(point, radius) {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.beginPath();
  ctx.ellipse(point.x, point.y + radius * 0.62, radius * 1.2, radius * 0.38, 0, 0, Math.PI * 2);
  ctx.fill();
}

// 플레이어는 설명 텍스트 없이 밝은 실루엣과 조준 방향만으로 식별되게 합니다.
function drawPlayer() {
  const point = worldToScreen(player.x, player.y);
  drawShadow(point, player.radius);
  ctx.fillStyle = '#8dffba';
  ctx.beginPath();
  ctx.arc(point.x, point.y, player.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#eafff7';
  ctx.beginPath();
  ctx.moveTo(point.x + Math.cos(player.facing) * 30, point.y + Math.sin(player.facing) * 30);
  ctx.lineTo(point.x + Math.cos(player.facing + 2.45) * 13, point.y + Math.sin(player.facing + 2.45) * 13);
  ctx.lineTo(point.x + Math.cos(player.facing - 2.45) * 13, point.y + Math.sin(player.facing - 2.45) * 13);
  ctx.closePath();
  ctx.fill();
}

// 랩터는 꼬리, 몸통, 머리만으로 공룡 실루엣을 만들고 플레이어를 향해 움직입니다.
function drawRaptor(raptor, time) {
  const point = worldToScreen(raptor.x, raptor.y);
  const angle = Math.atan2(player.y - raptor.y, player.x - raptor.x);
  const bob = Math.sin(time / 180 + raptor.phase) * 2;
  drawShadow(point, raptor.radius);
  ctx.strokeStyle = '#557340';
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(point.x - Math.cos(angle) * 8, point.y - Math.sin(angle) * 8 + bob);
  ctx.lineTo(point.x - Math.cos(angle) * 36, point.y - Math.sin(angle) * 36 + bob);
  ctx.stroke();
  ctx.fillStyle = '#9fbe66';
  ctx.beginPath();
  ctx.ellipse(point.x, point.y + bob, raptor.radius * 1.1, raptor.radius * 0.72, angle, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#d8b66c';
  ctx.beginPath();
  ctx.arc(point.x + Math.cos(angle) * 25, point.y + Math.sin(angle) * 25 + bob, 9, 0, Math.PI * 2);
  ctx.fill();
}

// 키보드 입력으로 플레이어를 이동시키고 포인터가 있으면 바라보는 방향을 갱신합니다.
function updatePlayer(delta) {
  const xAxis = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
  const yAxis = (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0);
  const length = Math.hypot(xAxis, yAxis) || 1;
  moveEntity(player, (xAxis / length) * player.speed * delta, (yAxis / length) * player.speed * delta);
  if (pointer.active) player.facing = Math.atan2(pointer.y - canvas.clientHeight / 2, pointer.x - canvas.clientWidth / 2);
}

// 랩터는 시야 안에 들어온 플레이어를 추격하고 너무 가까우면 원형으로 압박합니다.
function updateRaptors(delta, time) {
  raptors.forEach((raptor) => {
    const dx = player.x - raptor.x;
    const dy = player.y - raptor.y;
    const distance = Math.hypot(dx, dy) || 1;
    const stalk = distance < 520 ? 1 : 0.35;
    const orbit = distance < 96 ? Math.sin(time / 340 + raptor.phase) * 0.9 : 0;
    const nx = dx / distance;
    const ny = dy / distance;
    moveEntity(raptor, (nx - ny * orbit) * raptor.speed * stalk * delta, (ny + nx * orbit) * raptor.speed * stalk * delta);
  });
}

// 실제 게임 루프는 맵, 랩터, 플레이어 순서로 그려 가려짐을 단순하게 정리합니다.
let lastTime = performance.now();
function render(time = performance.now()) {
  const delta = Math.min((time - lastTime) / 1000, 0.033);
  lastTime = time;
  updatePlayer(delta);
  updateRaptors(delta, time);
  drawMap();
  raptors.forEach((raptor) => drawRaptor(raptor, time));
  drawPlayer();
  requestAnimationFrame(render);
}

// 브라우저 입력 이벤트는 게임 화면 밖 UI가 없다는 전제에 맞춰 전역으로 받습니다.
window.addEventListener('keydown', (event) => keys.add(event.code));
window.addEventListener('keyup', (event) => keys.delete(event.code));
canvas.addEventListener('pointermove', (event) => {
  pointer.active = true;
  pointer.x = event.clientX;
  pointer.y = event.clientY;
});
canvas.addEventListener('pointerleave', () => { pointer.active = false; });
window.addEventListener('resize', resizeCanvas);
resizeCanvas();
render();
