// Project Plateau Three.js/TypeScript 프로토타입: 전체화면 3D 맵에서 플레이어 이동과 랩터 추격을 구조적으로 검증합니다.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.165.0/build/three.module.js';

// 문자 타일은 기획자가 직접 읽고 고칠 수 있는 사전 제작 맵 원본입니다.
type TileCode = '#' | '.' | 'g' | 'r';
type Actor = { group: THREE.Group; radius: number; speed: number; velocity: THREE.Vector3 };
type Raptor = Actor & { phase: number; head: THREE.Mesh; body: THREE.Mesh; tail: THREE.Mesh };

// 전체화면 캔버스만 사용하므로 DOM 조회 실패는 즉시 원인을 알 수 있게 에러로 중단합니다.
const canvas = document.querySelector<HTMLCanvasElement>('[data-scene-canvas]');
if (!canvas) throw new Error('Project Plateau canvas was not found.');
const gameCanvas = canvas;

// Three.js CDN 버전은 패키지 설치가 막힌 환경에서도 브라우저가 직접 불러올 수 있는 고정 버전을 사용합니다.
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x08100d);
scene.fog = new THREE.FogExp2(0x08100d, 0.018);

// 탑뷰지만 높이감이 보이도록 약간 기울어진 원근 카메라를 사용합니다.
const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 1800);
const renderer = new THREE.WebGLRenderer({ canvas: gameCanvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// 기존 어두운 고원/녹색/모래색 테마를 유지하는 공용 재질 모음입니다.
const materials = {
  floor: new THREE.MeshStandardMaterial({ color: 0x243d2b, roughness: 0.92 }),
  grass: new THREE.MeshStandardMaterial({ color: 0x3f6b3f, roughness: 0.96 }),
  rock: new THREE.MeshStandardMaterial({ color: 0x6f6249, roughness: 0.88 }),
  wall: new THREE.MeshStandardMaterial({ color: 0x2f3c2a, roughness: 0.9 }),
  player: new THREE.MeshStandardMaterial({ color: 0x8dffba, emissive: 0x123d2a, roughness: 0.52 }),
  playerMarker: new THREE.MeshBasicMaterial({ color: 0xeafff7 }),
  raptorBody: new THREE.MeshStandardMaterial({ color: 0x9fbe66, roughness: 0.72 }),
  raptorHead: new THREE.MeshStandardMaterial({ color: 0xd8b66c, roughness: 0.68 }),
  huntRing: new THREE.MeshBasicMaterial({ color: 0xf4d06f, transparent: true, opacity: 0.2, side: THREE.DoubleSide }),
};

// 사전 제작 맵 데이터입니다. #은 벽, .은 바닥, g는 풀, r은 바위 엄폐물입니다.
const tileSize = 36;
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
] as const;
const mapCols = mapRows[0].length;
const mapDepth = mapRows.length * tileSize;
const mapWidth = mapCols * tileSize;

// 입력과 포인터 상태는 렌더 루프에서 한 번에 소비해 프레임별 이동량을 안정화합니다.
const keys = new Set<string>();
const pointer = new THREE.Vector2(0, 0);
let pointerActive = false;

// 월드 그룹은 맵 중심을 원점으로 맞춰 카메라 추적과 충돌 계산을 단순화합니다.
const world = new THREE.Group();
world.position.set(-mapWidth / 2, 0, -mapDepth / 2);
scene.add(world);

// 조명은 야간 고원 분위기를 유지하면서 캐릭터 실루엣을 읽기 쉽게 구성합니다.
const ambientLight = new THREE.AmbientLight(0xa8d6a1, 0.42);
const sunLight = new THREE.DirectionalLight(0xfff0bf, 1.35);
sunLight.position.set(180, 260, 120);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(1024, 1024);
scene.add(ambientLight, sunLight);

// 타일 타입을 안전하게 읽어 맵 바깥은 전부 벽으로 취급합니다.
function getTileAt(col: number, row: number): TileCode {
  const tile = mapRows[row]?.[col] as TileCode | undefined;
  return tile ?? '#';
}

// 월드 좌표를 타일 좌표로 바꿔 Three.js 중심 원점과 맵 배열 원점을 연결합니다.
function worldToTile(x: number, z: number): { col: number; row: number } {
  return {
    col: Math.floor((x + mapWidth / 2) / tileSize),
    row: Math.floor((z + mapDepth / 2) / tileSize),
  };
}

// 충돌은 벽과 바위를 막고 풀/바닥은 통과시키는 단순한 원형 캐릭터 판정입니다.
function isBlockedAt(x: number, z: number): boolean {
  const { col, row } = worldToTile(x, z);
  const tile = getTileAt(col, row);
  return tile === '#' || tile === 'r';
}

// 네 모서리 샘플을 통해 플레이어와 랩터가 벽 모서리를 통과하지 않게 합니다.
function canMoveTo(actor: Actor, nextX: number, nextZ: number): boolean {
  const r = actor.radius * 0.72;
  return !isBlockedAt(nextX - r, nextZ - r)
    && !isBlockedAt(nextX + r, nextZ - r)
    && !isBlockedAt(nextX - r, nextZ + r)
    && !isBlockedAt(nextX + r, nextZ + r);
}

// 축별 이동으로 막힌 벽을 따라 자연스럽게 미끄러질 수 있습니다.
function moveActor(actor: Actor, dx: number, dz: number): void {
  const nextX = actor.group.position.x + dx;
  const nextZ = actor.group.position.z + dz;
  if (canMoveTo(actor, nextX, actor.group.position.z)) actor.group.position.x = nextX;
  if (canMoveTo(actor, actor.group.position.x, nextZ)) actor.group.position.z = nextZ;
}

// 각 타일은 바닥과 장식 오브젝트를 별도 메시로 구성해 이후 에셋 교체 지점을 명확히 합니다.
function buildMap(): void {
  const floorGeometry = new THREE.PlaneGeometry(tileSize, tileSize);
  const wallGeometry = new THREE.BoxGeometry(tileSize, 16, tileSize);
  const rockGeometry = new THREE.DodecahedronGeometry(11, 0);
  const grassGeometry = new THREE.ConeGeometry(5, 14, 5);

  mapRows.forEach((row, rowIndex) => {
    [...row].forEach((tile, colIndex) => {
      const x = colIndex * tileSize + tileSize / 2;
      const z = rowIndex * tileSize + tileSize / 2;
      const floor = new THREE.Mesh(floorGeometry, tile === 'g' ? materials.grass : materials.floor);
      floor.rotation.x = -Math.PI / 2;
      floor.position.set(x, 0, z);
      floor.receiveShadow = true;
      world.add(floor);

      if (tile === '#') {
        const wall = new THREE.Mesh(wallGeometry, materials.wall);
        wall.position.set(x, 8, z);
        wall.castShadow = true;
        wall.receiveShadow = true;
        world.add(wall);
      }

      if (tile === 'r') {
        const rock = new THREE.Mesh(rockGeometry, materials.rock);
        rock.position.set(x, 8, z);
        rock.rotation.set(0.4, (rowIndex + colIndex) * 0.3, 0.2);
        rock.scale.set(1.2, 0.85, 1.05);
        rock.castShadow = true;
        rock.receiveShadow = true;
        world.add(rock);
      }

      if (tile === 'g') {
        for (let i = 0; i < 3; i += 1) {
          const grass = new THREE.Mesh(grassGeometry, materials.grass);
          grass.position.set(x - 9 + i * 9, 7, z + ((rowIndex + i) % 3 - 1) * 5);
          grass.rotation.y = i * 0.9;
          grass.castShadow = true;
          world.add(grass);
        }
      }
    });
  });
}

// 플레이어는 캡슐형 몸체와 진행 방향 마커로 텍스트 없이 식별되게 합니다.
function createPlayer(): Actor & { marker: THREE.Mesh } {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(8, 12, 6, 12), materials.player);
  const marker = new THREE.Mesh(new THREE.ConeGeometry(5, 16, 3), materials.playerMarker);
  body.castShadow = true;
  marker.position.set(0, 16, -13);
  marker.rotation.x = Math.PI / 2;
  group.add(body, marker);
  group.position.set(-mapWidth / 2 + tileSize * 3.2, 15, -mapDepth / 2 + tileSize * 14.5);
  scene.add(group);
  return { group, marker, radius: 8, speed: 132, velocity: new THREE.Vector3() };
}

// 랩터는 몸통/머리/꼬리 프록시 모델을 그룹화해 나중에 GLB 모델로 교체하기 쉽게 분리합니다.
function createRaptor(col: number, row: number, phase: number, speed: number): Raptor {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(7, 18, 5, 10), materials.raptorBody);
  const head = new THREE.Mesh(new THREE.SphereGeometry(5.2, 12, 8), materials.raptorHead);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(3.2, 24, 8), materials.raptorBody);
  body.rotation.z = Math.PI / 2;
  head.position.set(0, 3, -15);
  tail.position.set(0, 2, 18);
  tail.rotation.x = Math.PI;
  body.castShadow = true;
  head.castShadow = true;
  tail.castShadow = true;
  group.add(body, head, tail);
  group.position.set(-mapWidth / 2 + col * tileSize, 13, -mapDepth / 2 + row * tileSize);
  scene.add(group);
  return { group, body, head, tail, phase, radius: 9, speed, velocity: new THREE.Vector3() };
}

// 사냥 반경 링은 UI 텍스트 없이 위험 영역을 은은하게 보여주는 시각 피드백입니다.
function createHuntRing(): THREE.Mesh {
  const ring = new THREE.Mesh(new THREE.RingGeometry(34, 36, 64), materials.huntRing);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.9;
  scene.add(ring);
  return ring;
}

buildMap();
const player = createPlayer();
const raptors: Raptor[] = [
  createRaptor(17.5, 4.5, 0.2, 60),
  createRaptor(19.4, 12.8, 1.8, 54),
  createRaptor(6.2, 7.4, 3.1, 66),
  createRaptor(13.6, 15.2, 4.2, 58),
];
const huntRing = createHuntRing();
const clock = new THREE.Clock();

// 입력에서 이동 벡터를 계산하고 포인터가 있으면 플레이어가 해당 방향을 바라봅니다.
function updatePlayer(delta: number): void {
  const xAxis = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
  const zAxis = (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0);
  const length = Math.hypot(xAxis, zAxis) || 1;
  player.velocity.set((xAxis / length) * player.speed, 0, (zAxis / length) * player.speed);
  moveActor(player, player.velocity.x * delta, player.velocity.z * delta);

  if (pointerActive) {
    player.group.rotation.y = Math.atan2(pointer.x, pointer.y);
  } else if (xAxis !== 0 || zAxis !== 0) {
    player.group.rotation.y = Math.atan2(xAxis, zAxis);
  }
}

// 랩터는 플레이어와의 거리에 따라 추격/순찰을 전환하고 가까우면 측면 압박을 섞습니다.
function updateRaptors(delta: number, elapsed: number): void {
  raptors.forEach((raptor) => {
    const dx = player.group.position.x - raptor.group.position.x;
    const dz = player.group.position.z - raptor.group.position.z;
    const distance = Math.hypot(dx, dz) || 1;
    const chaseWeight = distance < 260 ? 1 : 0.32;
    const orbit = distance < 52 ? Math.sin(elapsed * 3 + raptor.phase) * 0.8 : 0;
    const nx = dx / distance;
    const nz = dz / distance;
    raptor.velocity.set((nx - nz * orbit) * raptor.speed * chaseWeight, 0, (nz + nx * orbit) * raptor.speed * chaseWeight);
    moveActor(raptor, raptor.velocity.x * delta, raptor.velocity.z * delta);
    raptor.group.rotation.y = Math.atan2(raptor.velocity.x, raptor.velocity.z);
    raptor.body.position.y = Math.sin(elapsed * 8 + raptor.phase) * 0.9;
  });
}

// 카메라는 듀랑고처럼 높은 탑뷰를 유지하되 살짝 옆으로 내려와 전경과 적의 입체감이 보이게 합니다.
function updateCamera(delta: number): void {
  const target = new THREE.Vector3(player.group.position.x, 8, player.group.position.z + 18);
  const shoulderOffset = new THREE.Vector3(72, 138, 118);
  const desired = target.clone().add(shoulderOffset);
  camera.position.lerp(desired, Math.min(delta * 5.5, 1));
  camera.lookAt(target);
  huntRing.position.x = player.group.position.x;
  huntRing.position.z = player.group.position.z;
}

// 브라우저 크기에 맞춰 렌더러와 카메라 비율을 갱신합니다.
function resizeRenderer(): void {
  const width = gameCanvas.clientWidth || window.innerWidth;
  const height = gameCanvas.clientHeight || window.innerHeight;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

// 루프는 업데이트와 렌더를 분리해 이후 전투/AI 시스템을 추가하기 쉽게 유지합니다.
function animate(): void {
  const delta = Math.min(clock.getDelta(), 0.033);
  const elapsed = clock.elapsedTime;
  updatePlayer(delta);
  updateRaptors(delta, elapsed);
  updateCamera(delta);
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

// 키보드와 포인터 이벤트는 별도 UI가 없는 전체화면 플레이 상태에 맞춰 전역에서 처리합니다.
window.addEventListener('keydown', (event) => keys.add(event.code));
window.addEventListener('keyup', (event) => keys.delete(event.code));
gameCanvas.addEventListener('pointermove', (event) => {
  pointerActive = true;
  pointer.set((event.clientX / window.innerWidth - 0.5) * 2, (event.clientY / window.innerHeight - 0.5) * 2);
});
gameCanvas.addEventListener('pointerleave', () => { pointerActive = false; });
window.addEventListener('resize', resizeRenderer);
resizeRenderer();
animate();
