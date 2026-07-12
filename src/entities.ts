import * as THREE from 'https://esm.sh/three@0.180.0';
import { EntityBody, moveEntity, TILE_SIZE } from './world.js';

export type Player = EntityBody & { speed: number; facing: number; mesh: InstanceType<typeof THREE.Group> };
export type Raptor = EntityBody & { speed: number; phase: number; mesh: InstanceType<typeof THREE.Group> };

// 플레이어는 밝은 민트 실루엣과 방향 포인터를 가진 코드 기반 프록시 모델입니다.
export function createPlayer(): Player {
  const mesh = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 0.72, 6, 12), new THREE.MeshStandardMaterial({ color: '#8dffba', roughness: 0.72 }));
  const pointer = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.78, 3), new THREE.MeshStandardMaterial({ color: '#eafff7', roughness: 0.55 }));
  pointer.position.set(0, 0.45, -0.62);
  pointer.rotation.x = Math.PI / 2;
  mesh.add(body, pointer);
  return { x: TILE_SIZE * 3.2, z: TILE_SIZE * 14.5, radius: 0.72, speed: 9.2, facing: 0, mesh };
}

// 랩터는 꼬리/몸통/머리의 단순 조합으로 3D 돌출감을 우선 검증합니다.
export function createRaptor(x: number, z: number, speed: number, phase: number): Raptor {
  const mesh = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color: '#9fbe66', roughness: 0.86 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.62, 18, 10), skin);
  body.scale.set(1.35, 0.72, 0.82);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 8), new THREE.MeshStandardMaterial({ color: '#d8b66c', roughness: 0.72 }));
  head.position.set(0, 0.1, -0.72);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.16, 1.1, 8), skin);
  tail.position.set(0, 0.02, 0.86);
  tail.rotation.x = -Math.PI / 2;
  mesh.add(body, head, tail);
  return { x, z, radius: 0.82, speed, phase, mesh };
}

// 랩터 AI는 현재 추격/포위만 구현하지만, phase/speed가 진화형 AI 유전자 슬롯으로 확장됩니다.
export function updateRaptor(raptor: Raptor, player: Player, delta: number, time: number): void {
  const dx = player.x - raptor.x;
  const dz = player.z - raptor.z;
  const distance = Math.hypot(dx, dz) || 1;
  const stalk = distance < 29 ? 1 : 0.35;
  const orbit = distance < 5.4 ? Math.sin(time / 340 + raptor.phase) * 0.9 : 0;
  const nx = dx / distance;
  const nz = dz / distance;
  moveEntity(raptor, (nx - nz * orbit) * raptor.speed * stalk * delta, (nz + nx * orbit) * raptor.speed * stalk * delta);
}
