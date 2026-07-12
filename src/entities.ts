import * as THREE from 'https://esm.sh/three@0.180.0';
import { EntityBody, moveEntity, TILE_SIZE } from './world.js';

export type Player = EntityBody & { speed: number; facing: number; mesh: InstanceType<typeof THREE.Group> };
export type Raptor = EntityBody & { speed: number; phase: number; mesh: InstanceType<typeof THREE.Group>; awarenessRange: number; homeX: number; homeZ: number };

// 반복되는 뼈대 막대는 플레이어와 랩터 모두에서 사용해 '골격이 보이는' 프록시 디자인을 통일합니다.
function makeBone(length: number, radius: number, color = '#f3ffe8'): InstanceType<typeof THREE.Mesh> {
  const bone = new THREE.Mesh(new THREE.CapsuleGeometry(radius, length, 5, 8), new THREE.MeshStandardMaterial({ color, roughness: 0.58, metalness: 0.02 }));
  bone.castShadow = true;
  return bone;
}

// 플레이어는 민트색 체적과 흰 골격 라인을 섞어 사람형 실루엣이 즉시 읽히게 만든 코드 기반 프록시 모델입니다.
export function createPlayer(): Player {
  const mesh = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color: '#78e9a2', roughness: 0.72 });
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.46, 0.92, 8, 14), skin);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 10), new THREE.MeshStandardMaterial({ color: '#bfffd3', roughness: 0.62 }));
  const spine = makeBone(0.88, 0.035);
  const leftArm = makeBone(0.52, 0.032);
  const rightArm = makeBone(0.52, 0.032);
  const leftLeg = makeBone(0.58, 0.036);
  const rightLeg = makeBone(0.58, 0.036);
  const pointer = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.72, 3), new THREE.MeshStandardMaterial({ color: '#eafff7', roughness: 0.55 }));

  // 각 파츠 위치는 낮은 탑뷰에서도 어깨/다리/전방 포인터가 겹치지 않도록 약간 과장했습니다.
  torso.position.y = 0.72;
  head.position.y = 1.48;
  spine.position.set(0, 0.82, -0.05);
  leftArm.position.set(-0.45, 0.85, -0.02);
  rightArm.position.set(0.45, 0.85, -0.02);
  leftLeg.position.set(-0.18, 0.2, 0.04);
  rightLeg.position.set(0.18, 0.2, 0.04);
  pointer.position.set(0, 0.55, -0.78);
  pointer.rotation.x = Math.PI / 2;
  leftArm.rotation.z = 0.72;
  rightArm.rotation.z = -0.72;
  leftLeg.rotation.z = 0.18;
  rightLeg.rotation.z = -0.18;
  mesh.add(torso, head, spine, leftArm, rightArm, leftLeg, rightLeg, pointer);
  return { x: TILE_SIZE * 3.2, z: TILE_SIZE * 14.5, radius: 0.72, speed: 8.4, facing: 0, mesh };
}

// 랩터는 등뼈/갈비뼈/다리뼈를 밝게 드러내고 체적 파츠를 길게 배치해 공룡 골격 인상을 강화합니다.
export function createRaptor(x: number, z: number, speed: number, phase: number): Raptor {
  const mesh = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color: '#8cae55', roughness: 0.86 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.68, 20, 12), skin);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.34, 0.68), new THREE.MeshStandardMaterial({ color: '#c8a75d', roughness: 0.72 }));
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.18, 1.4, 8), skin);
  const spine = makeBone(0.95, 0.035, '#fff1c9');
  const ribLeft = makeBone(0.34, 0.022, '#fff1c9');
  const ribRight = makeBone(0.34, 0.022, '#fff1c9');
  const legLeft = makeBone(0.72, 0.04, '#fff1c9');
  const legRight = makeBone(0.72, 0.04, '#fff1c9');

  // 랩터의 전방은 -Z이며, 꼬리와 머리를 길게 빼 카메라가 가까워져도 방향성이 유지됩니다.
  body.position.y = 0.72;
  body.scale.set(1.5, 0.78, 0.92);
  head.position.set(0, 0.82, -0.92);
  tail.position.set(0, 0.68, 1.12);
  tail.rotation.x = -Math.PI / 2;
  spine.position.set(0, 1.05, 0.0);
  spine.rotation.x = Math.PI / 2;
  ribLeft.position.set(-0.38, 0.98, -0.08);
  ribRight.position.set(0.38, 0.98, -0.08);
  ribLeft.rotation.z = 0.92;
  ribRight.rotation.z = -0.92;
  legLeft.position.set(-0.42, 0.26, 0.18);
  legRight.position.set(0.42, 0.26, 0.18);
  legLeft.rotation.z = -0.25;
  legRight.rotation.z = 0.25;
  [body, head, tail, spine, ribLeft, ribRight, legLeft, legRight].forEach((part) => { part.castShadow = true; });
  mesh.add(body, head, tail, spine, ribLeft, ribRight, legLeft, legRight);
  return { x, z, radius: 0.9, speed, phase, mesh, awarenessRange: 18, homeX: x, homeZ: z };
}

// 랩터 AI는 인식 범위 안에서만 추격하고, 밖에서는 원래 자리 주변을 배회해 무작정 따라오는 느낌을 줄입니다.
export function updateRaptor(raptor: Raptor, player: Player, delta: number, time: number): void {
  const dx = player.x - raptor.x;
  const dz = player.z - raptor.z;
  const distance = Math.hypot(dx, dz) || 1;
  const hunting = distance <= raptor.awarenessRange;
  const targetX = hunting ? player.x : raptor.homeX + Math.sin(time / 1800 + raptor.phase) * 3.2;
  const targetZ = hunting ? player.z : raptor.homeZ + Math.cos(time / 2100 + raptor.phase) * 3.2;
  const tx = targetX - raptor.x;
  const tz = targetZ - raptor.z;
  const targetDistance = Math.hypot(tx, tz) || 1;
  const orbit = hunting && distance < 5.4 ? Math.sin(time / 340 + raptor.phase) * 0.9 : 0;
  const pace = hunting ? 1 : 0.42;
  moveEntity(raptor, (tx / targetDistance - (tz / targetDistance) * orbit) * raptor.speed * pace * delta, (tz / targetDistance + (tx / targetDistance) * orbit) * raptor.speed * pace * delta);
}
