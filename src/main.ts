import * as THREE from 'https://esm.sh/three@0.180.0';
import { DESIGN_PILLARS } from './design.js';
import { createPlayer, createRaptor, updateRaptor, type Raptor } from './entities.js';
import { canMoveTo, getTileAt, MAP_ROWS, moveEntity, TILE_SIZE } from './world.js';

// 캔버스와 UI 루트는 브라우저 전체를 차지하며 F11 전체화면에서도 같은 비율로 렌더링됩니다.
const canvasElement = document.querySelector<HTMLCanvasElement>('[data-scene-canvas]');
const actionMenuElement = document.querySelector<HTMLDivElement>('[data-action-menu]');
const combatPanelElement = document.querySelector<HTMLDivElement>('[data-combat-panel]');
const combatTextElement = document.querySelector<HTMLParagraphElement>('[data-combat-text]');
if (!canvasElement || !actionMenuElement || !combatPanelElement || !combatTextElement) throw new Error('Project Plateau canvas or UI roots not found.');
const canvas = canvasElement;
const actionMenu = actionMenuElement;
const combatPanel = combatPanelElement;
const combatText = combatTextElement;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#08100d');
scene.fog = new THREE.FogExp2('#08100d', 0.018);

// 듀랑고풍 탑뷰: 사용자가 요청한 더 가까운 뷰를 위해 기존보다 낮고 플레이어 쪽으로 당겼습니다.
const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 500);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// 클릭 이동 판정을 위한 레이캐스터와 지면 평면은 렌더링 메시와 분리해 유지보수성을 높입니다.
const raycaster = new THREE.Raycaster();
const pointerNdc = new THREE.Vector2();
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const groundHit = new THREE.Vector3();

type Interactable = { kind: 'rock' | 'tree' | 'raptor'; label: string; x: number; z: number; radius: number; target?: Raptor };
const interactables: Interactable[] = [];
let moveTarget: any | null = null;
let combatTarget: Raptor | null = null;
let combatLog = '적의 움직임을 읽고 행동을 선택하세요.';

// 어두운 고원 테마를 유지하면서 3D 모델 실루엣이 튀어나오도록 낮은 태양광을 섞습니다.
scene.add(new THREE.HemisphereLight('#c8ffd9', '#172014', 1.4));
const sun = new THREE.DirectionalLight('#fff0c2', 2.2);
sun.position.set(-16, 28, 10);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
scene.add(sun);

const player = createPlayer();
const raptors: Raptor[] = [
  createRaptor(TILE_SIZE * 17.5, TILE_SIZE * 4.5, 4.2, 0.2),
  createRaptor(TILE_SIZE * 19.4, TILE_SIZE * 12.8, 3.7, 1.8),
  createRaptor(TILE_SIZE * 6.2, TILE_SIZE * 7.4, 4.6, 3.1),
  createRaptor(TILE_SIZE * 13.6, TILE_SIZE * 15.2, 3.9, 4.2),
];
raptors.forEach((raptor, index) => interactables.push({ kind: 'raptor', label: `랩터 ${index + 1}`, x: raptor.x, z: raptor.z, radius: 2.4, target: raptor }));
scene.add(player.mesh, ...raptors.map((raptor) => raptor.mesh));

// 클릭한 위치를 표시하는 포인트 링은 이동 목표가 있을 때만 보이게 합니다.
const moveMarker = new THREE.Mesh(
  new THREE.TorusGeometry(0.78, 0.045, 8, 36),
  new THREE.MeshStandardMaterial({ color: '#d8ff8f', emissive: '#406b23', roughness: 0.5 }),
);
moveMarker.rotation.x = Math.PI / 2;
moveMarker.position.y = 0.16;
moveMarker.visible = false;
scene.add(moveMarker);

// 타일별 메시를 생성해 전체 맵을 한 번만 구성하고, 런타임에는 엔티티와 UI만 갱신합니다.
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

      // 바위와 나무는 장식이면서 동시에 클릭 가능한 자연물/충돌체로 등록합니다.
      if (tile === 'r') addRock(col, row);
      if (tile === 'g') addTree(col, row);
    });
  });
}

function addRock(col: number, row: number): void {
  const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.9, 0), new THREE.MeshStandardMaterial({ color: '#7d6f56', roughness: 1 }));
  const x = col * TILE_SIZE + 2.1;
  const z = row * TILE_SIZE + 2.0;
  rock.position.set(x, 0.66, z);
  rock.scale.set(1.35, 0.8, 1.05);
  rock.castShadow = true;
  scene.add(rock);
  interactables.push({ kind: 'rock', label: '바위', x, z, radius: 2.1 });
}

function addTree(col: number, row: number): void {
  const x = col * TILE_SIZE + 2;
  const z = row * TILE_SIZE + 2.15;
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.32, 1.25, 7), new THREE.MeshStandardMaterial({ color: '#6b4b2f', roughness: 0.9 }));
  const crown = new THREE.Mesh(new THREE.ConeGeometry(0.9, 1.7, 8), new THREE.MeshStandardMaterial({ color: '#95f2b6', roughness: 0.85 }));
  trunk.position.set(x, 0.74, z);
  crown.position.set(x, 1.75, z);
  trunk.castShadow = true;
  crown.castShadow = true;
  scene.add(trunk, crown);
  interactables.push({ kind: 'tree', label: '나무', x, z, radius: 2.1 });
}

function syncEntityMeshes(time: number): void {
  player.mesh.position.set(player.x, 0, player.z);
  player.mesh.rotation.y = player.facing;
  raptors.forEach((raptor, index) => {
    const angle = Math.atan2(player.x - raptor.x, player.z - raptor.z);
    raptor.mesh.position.set(raptor.x, Math.sin(time / 180 + raptor.phase) * 0.08, raptor.z);
    raptor.mesh.rotation.y = angle;
    interactables[index].x = raptor.x;
    interactables[index].z = raptor.z;
  });
}

function updatePlayer(delta: number): void {
  if (!moveTarget) return;
  const dx = moveTarget.x - player.x;
  const dz = moveTarget.z - player.z;
  const distance = Math.hypot(dx, dz);
  if (distance < 0.2) {
    moveTarget = null;
    moveMarker.visible = false;
    return;
  }
  const step = Math.min(player.speed * delta, distance);
  player.facing = Math.atan2(dx, dz);
  moveEntity(player, (dx / distance) * step, (dz / distance) * step);
}

function updateCamera(): void {
  camera.position.set(player.x, 25, player.z + 18);
  camera.lookAt(player.x, 0.9, player.z - 2.1);
}

function resize(): void {
  const width = canvas.clientWidth || window.innerWidth;
  const height = canvas.clientHeight || window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
}

function setPointerFromEvent(event: PointerEvent): void {
  const rect = canvas.getBoundingClientRect();
  pointerNdc.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -(((event.clientY - rect.top) / rect.height) * 2 - 1));
}

function getGroundPoint(event: PointerEvent): any | null {
  setPointerFromEvent(event);
  raycaster.setFromCamera(pointerNdc, camera);
  return raycaster.ray.intersectPlane(groundPlane, groundHit) ? groundHit.clone() : null;
}

function findInteractable(point: any): Interactable | null {
  return interactables.find((item) => Math.hypot(item.x - point.x, item.z - point.z) <= item.radius) ?? null;
}

function showActionMenu(item: Interactable, event: PointerEvent): void {
  actionMenu.innerHTML = '';
  const title = document.createElement('strong');
  const button = document.createElement('button');
  title.textContent = item.label;
  button.type = 'button';
  button.textContent = item.kind === 'raptor' ? '전투' : '채집';
  button.addEventListener('click', () => enterAction(item));
  actionMenu.append(title, button);
  actionMenu.style.left = `${event.clientX + 12}px`;
  actionMenu.style.top = `${event.clientY + 12}px`;
  actionMenu.hidden = false;
}

function hideActionMenu(): void {
  actionMenu.hidden = true;
}

function enterAction(item: Interactable): void {
  hideActionMenu();
  if (item.kind === 'raptor' && item.target) {
    combatTarget = item.target;
    combatLog = '랩터가 빈틈을 노립니다. 패링, 회피, 맞대응 중 하나를 선택하세요.';
    combatPanel.hidden = false;
  } else {
    combatLog = `${item.label}에서 쓸만한 자원을 채집했습니다.`;
    combatTarget = null;
    combatPanel.hidden = false;
  }
  combatText.textContent = combatLog;
}

function handleCombatAction(action: string): void {
  if (!combatTarget) {
    combatText.textContent = '채집 액션 완료. 자연물 상호작용 흐름을 확인했습니다.';
    return;
  }
  const responses: Record<string, string> = {
    parry: '패링 성공! 랩터의 전진을 끊고 반격 타이밍을 만들었습니다.',
    dodge: '회피 성공! 측면으로 빠져 다음 공격을 준비합니다.',
    counter: '맞대응! 피해를 감수하는 대신 랩터에게 강한 압박을 줬습니다.',
  };
  combatText.textContent = responses[action] ?? combatLog;
}

function handlePointerDown(event: PointerEvent): void {
  const point = getGroundPoint(event);
  if (!point) return;
  const item = findInteractable(point);
  if (item) {
    showActionMenu(item, event);
    return;
  }
  hideActionMenu();
  const probe = { x: point.x, z: point.z, radius: player.radius };
  if (getTileAt(point.x, point.z) !== '#' && canMoveTo(probe, point.x, point.z)) {
    moveTarget = point;
    moveMarker.position.set(point.x, 0.16, point.z);
    moveMarker.visible = true;
  }
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

canvas.addEventListener('pointerdown', handlePointerDown);
combatPanel.addEventListener('click', (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-combat-action]');
  if (button) handleCombatAction(button.dataset.combatAction ?? '');
});
window.addEventListener('resize', resize);

// 기획 상수를 참조해 번들 제거를 피하고, 후속 AI 실험 지점을 명시적으로 남깁니다.
console.info('Project Plateau design pillars', DESIGN_PILLARS);
buildWorld();
resize();
render();
