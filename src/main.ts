import * as THREE from 'https://esm.sh/three@0.180.0';
import { DESIGN_PILLARS } from './design.js';
import { createPlayer, createRaptor, updateRaptor, type Raptor } from './entities.js';
import { MAP_ROWS, moveEntity, TILE_SIZE } from './world.js';

// 캔버스는 브라우저 전체를 차지하며 F11 전체화면에서도 같은 비율로 렌더링됩니다.
const canvasElement = document.querySelector<HTMLCanvasElement>('[data-scene-canvas]');
if (!canvasElement) throw new Error('Project Plateau canvas not found.');
const canvas = canvasElement;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#08100d');
scene.fog = new THREE.FogExp2('#08100d', 0.018);

// 듀랑고풍 탑뷰: 위에서 내려다보되 Z축 방향으로 살짝 밀어 전경과 적 높이가 보이게 합니다.
const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 500);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// 어두운 고원 테마를 유지하면서 3D 모델 실루엣이 튀어나오도록 낮은 태양광을 섞습니다.
scene.add(new THREE.HemisphereLight('#c8ffd9', '#172014', 1.4));
const sun = new THREE.DirectionalLight('#fff0c2', 2.2);
sun.position.set(-16, 28, 10);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
scene.add(sun);

const keys = new Set<string>();
const pointer = new THREE.Vector2();
let pointerActive = false;
const player = createPlayer();
const raptors: Raptor[] = [
  createRaptor(TILE_SIZE * 17.5, TILE_SIZE * 4.5, 4.2, 0.2),
  createRaptor(TILE_SIZE * 19.4, TILE_SIZE * 12.8, 3.7, 1.8),
  createRaptor(TILE_SIZE * 6.2, TILE_SIZE * 7.4, 4.6, 3.1),
  createRaptor(TILE_SIZE * 13.6, TILE_SIZE * 15.2, 3.9, 4.2),
];
scene.add(player.mesh, ...raptors.map((raptor) => raptor.mesh));

// 타일별 메시를 생성해 전체 맵을 한 번만 구성하고, 런타임에는 엔티티만 갱신합니다.
function buildWorld(): void {
  const tileGeometry = new THREE.BoxGeometry(TILE_SIZE, 0.18, TILE_SIZE);
  const floorMaterials = {
    dirt: new THREE.MeshStandardMaterial({ color: '#243d2b', roughness: 0.95 }),
    grass: new THREE.MeshStandardMaterial({ color: '#2f5a38', roughness: 0.9 }),
    rock: new THREE.MeshStandardMaterial({ color: '#514a37', roughness: 0.98 }),
    cliff: new THREE.MeshStandardMaterial({ color: '#263323', roughness: 1 }),
  };

  MAP_ROWS.forEach((rowText, row) => {
    [...rowText].forEach((tile, col) => {
      const material = tile === '#' ? floorMaterials.cliff : tile === 'g' ? floorMaterials.grass : tile === 'r' ? floorMaterials.rock : floorMaterials.dirt;
      const block = new THREE.Mesh(tileGeometry, material);
      block.position.set(col * TILE_SIZE + TILE_SIZE / 2, tile === '#' ? 0.82 : 0, row * TILE_SIZE + TILE_SIZE / 2);
      block.scale.y = tile === '#' ? 8.4 : 1;
      block.receiveShadow = true;
      block.castShadow = tile === '#';
      scene.add(block);

      // 바위와 풀은 낮은 장식 메시로 추가해 탑뷰에서도 지형 단서가 보이게 합니다.
      if (tile === 'r') addRock(col, row);
      if (tile === 'g') addGrassPatch(col, row);
    });
  });
}

function addRock(col: number, row: number): void {
  const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.82, 0), new THREE.MeshStandardMaterial({ color: '#7d6f56', roughness: 1 }));
  rock.position.set(col * TILE_SIZE + 2.1, 0.62, row * TILE_SIZE + 2.0);
  rock.scale.set(1.2, 0.72, 0.92);
  rock.castShadow = true;
  scene.add(rock);
}

function addGrassPatch(col: number, row: number): void {
  const grass = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.55, 0.5, 7), new THREE.MeshStandardMaterial({ color: '#95f2b6', roughness: 0.85 }));
  grass.position.set(col * TILE_SIZE + 2, 0.36, row * TILE_SIZE + 2.25);
  grass.scale.set(2.5, 1, 0.7);
  scene.add(grass);
}

function syncEntityMeshes(time: number): void {
  player.mesh.position.set(player.x, 1.02, player.z);
  player.mesh.rotation.y = player.facing;
  raptors.forEach((raptor) => {
    const angle = Math.atan2(player.x - raptor.x, player.z - raptor.z);
    raptor.mesh.position.set(raptor.x, 0.88 + Math.sin(time / 180 + raptor.phase) * 0.08, raptor.z);
    raptor.mesh.rotation.y = angle;
  });
}

function updatePlayer(delta: number): void {
  const xAxis = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
  const zAxis = (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0);
  const length = Math.hypot(xAxis, zAxis) || 1;
  moveEntity(player, (xAxis / length) * player.speed * delta, (zAxis / length) * player.speed * delta);
  if (pointerActive) player.facing = Math.atan2(pointer.x, pointer.y);
}

function updateCamera(): void {
  camera.position.set(player.x, 34, player.z + 24);
  camera.lookAt(player.x, 0.8, player.z - 2.8);
}

function resize(): void {
  const width = canvas.clientWidth || window.innerWidth;
  const height = canvas.clientHeight || window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
}

let lastTime = performance.now();
function render(time = performance.now()): void {
  const delta = Math.min((time - lastTime) / 1000, 0.033);
  lastTime = time;
  updatePlayer(delta);
  raptors.forEach((raptor) => updateRaptor(raptor, player, delta, time));
  syncEntityMeshes(time);
  updateCamera();
  renderer.render(scene, camera);
  requestAnimationFrame(render);
}

window.addEventListener('keydown', (event) => keys.add(event.code));
window.addEventListener('keyup', (event) => keys.delete(event.code));
canvas.addEventListener('pointermove', (event) => {
  const rect = canvas.getBoundingClientRect();
  pointer.set(event.clientX - rect.left - rect.width / 2, event.clientY - rect.top - rect.height / 2);
  pointerActive = true;
});
canvas.addEventListener('pointerleave', () => { pointerActive = false; });
window.addEventListener('resize', resize);

// 기획 상수를 참조해 번들 제거를 피하고, 후속 AI 실험 지점을 명시적으로 남깁니다.
console.info('Project Plateau design pillars', DESIGN_PILLARS);
buildWorld();
resize();
render();
