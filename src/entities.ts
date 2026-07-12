import * as THREE from 'https://esm.sh/three@0.180.0';
import { EntityBody, moveEntity, TILE_SIZE } from './world.js';

export type Player = EntityBody & { speed: number; facing: number; mesh: InstanceType<typeof THREE.Group> };
export type Raptor = EntityBody & { speed: number; phase: number; mesh: InstanceType<typeof THREE.Group>; awarenessRange: number; homeX: number; homeZ: number };

type JointSpec = { name: string; x: number; y: number; z: number; radius: number; color?: string };
type BoneSpec = { name: string; x: number; y: number; z: number; length: number; radius: number; rotation?: [number, number, number]; color?: string };
type MuscleSpec = { name: string; x: number; y: number; z: number; scale: [number, number, number]; weight: number; color?: string };

// 반복되는 재질은 함수로 만들어 파츠별 색상과 투명도를 일관되게 관리합니다.
function makeMaterial(color: string, roughness = 0.72, opacity = 1): InstanceType<typeof THREE.MeshStandardMaterial> {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.02, transparent: opacity < 1, opacity });
}

// 반복되는 뼈대 막대는 플레이어와 랩터 모두에서 사용해 '골격이 보이는' 프록시 디자인을 통일합니다.
function makeBone(length: number, radius: number, color = '#f3ffe8'): InstanceType<typeof THREE.Mesh> {
  const bone = new THREE.Mesh(new THREE.CapsuleGeometry(radius, length, 6, 10), makeMaterial(color, 0.58));
  bone.castShadow = true;
  return bone;
}

// 작은 관절 구슬은 발가락, 손가락, 턱, 목처럼 회전축이 되는 지점을 시각적으로 읽히게 합니다.
function makeJoint(radius: number, color = '#fff7d5'): InstanceType<typeof THREE.Mesh> {
  const joint = new THREE.Mesh(new THREE.SphereGeometry(radius, 10, 8), makeMaterial(color, 0.5));
  joint.castShadow = true;
  return joint;
}

// 근육 블록은 weight 값으로 크기와 색 농도를 조절해 이후 스탯/부위별 데미지 시스템과 연결할 수 있게 합니다.
function makeMuscle(scale: [number, number, number], weight: number, color = '#b46d46'): InstanceType<typeof THREE.Mesh> {
  const muscle = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), makeMaterial(color, 0.8, Math.min(0.92, 0.48 + weight * 0.08)));
  muscle.scale.set(scale[0] * (0.9 + weight * 0.035), scale[1] * (0.9 + weight * 0.03), scale[2] * (0.9 + weight * 0.025));
  muscle.castShadow = true;
  muscle.userData.muscleWeight = weight;
  return muscle;
}

function addBones(group: InstanceType<typeof THREE.Group>, specs: BoneSpec[]): void {
  specs.forEach((spec) => {
    const bone = makeBone(spec.length, spec.radius, spec.color);
    bone.name = spec.name;
    bone.position.set(spec.x, spec.y, spec.z);
    if (spec.rotation) bone.rotation.set(spec.rotation[0], spec.rotation[1], spec.rotation[2]);
    group.add(bone);
  });
}

function addJoints(group: InstanceType<typeof THREE.Group>, specs: JointSpec[]): void {
  specs.forEach((spec) => {
    const joint = makeJoint(spec.radius, spec.color);
    joint.name = spec.name;
    joint.position.set(spec.x, spec.y, spec.z);
    group.add(joint);
  });
}

function addMuscles(group: InstanceType<typeof THREE.Group>, specs: MuscleSpec[]): void {
  specs.forEach((spec) => {
    const muscle = makeMuscle(spec.scale, spec.weight, spec.color);
    muscle.name = spec.name;
    muscle.position.set(spec.x, spec.y, spec.z);
    group.add(muscle);
  });
}

// 발가락은 근위/중위/말위 관절과 발톱을 모두 별도 파츠로 만들어 랩터의 공격적인 발 실루엣을 강조합니다.
function addRaptorToe(group: InstanceType<typeof THREE.Group>, side: -1 | 1, toeIndex: number, lateral: number, forward: number, length: number, clawColor = '#1d2118'): void {
  const baseX = side * (0.34 + lateral);
  const baseZ = -0.15 + forward;
  const baseY = 0.1;
  const phalanges = [0, 1, 2].map((segment) => {
    const toe = makeBone(length * (1 - segment * 0.14), 0.018, '#fff1c9');
    toe.name = `raptor_${side < 0 ? 'left' : 'right'}_toe_${toeIndex}_phalange_${segment + 1}`;
    toe.position.set(baseX + side * segment * 0.035, baseY - segment * 0.006, baseZ - segment * length * 0.34);
    toe.rotation.set(Math.PI / 2 + segment * 0.1, 0, side * lateral * 1.5);
    return toe;
  });
  const claw = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.2, 8), makeMaterial(clawColor, 0.42));
  claw.name = `raptor_${side < 0 ? 'left' : 'right'}_toe_${toeIndex}_hook_claw`;
  claw.position.set(baseX + side * 0.095, 0.055, baseZ - length * 0.86);
  claw.rotation.x = Math.PI / 2;
  claw.castShadow = true;
  group.add(...phalanges, claw);
}

// 손가락도 개별 관절/발톱을 제공해 머리와 입만이 아니라 앞발의 포식자 느낌까지 읽히게 합니다.
function addRaptorFinger(group: InstanceType<typeof THREE.Group>, side: -1 | 1, fingerIndex: number, offset: number): void {
  const finger = makeBone(0.22, 0.014, '#fff1c9');
  const claw = new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.12, 7), makeMaterial('#1d2118', 0.45));
  finger.name = `raptor_${side < 0 ? 'left' : 'right'}_finger_${fingerIndex}`;
  claw.name = `raptor_${side < 0 ? 'left' : 'right'}_finger_${fingerIndex}_claw`;
  finger.position.set(side * 0.62, 0.58, -0.58 + offset);
  finger.rotation.set(1.1, 0, side * 0.52);
  claw.position.set(side * 0.7, 0.5, -0.68 + offset);
  claw.rotation.x = Math.PI / 2;
  claw.castShadow = true;
  group.add(finger, claw);
}

// 플레이어는 민트색 체적, 해부학적 관절, 손가락/발가락, 근육 가중치 블록을 섞은 사람형 코드 모델입니다.
export function createPlayer(): Player {
  const mesh = new THREE.Group();
  const skin = makeMaterial('#78e9a2', 0.72);
  const boneColor = '#eafff7';
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 0.86, 10, 16), skin);
  const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.28, 0.34), makeMaterial('#5fc486', 0.78));
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.27, 18, 12), makeMaterial('#bfffd3', 0.62));
  const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.08, 0.16), makeMaterial('#a9edbf', 0.64));
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.14, 8), makeMaterial('#eafff7', 0.5));
  const pointer = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.64, 3), makeMaterial('#eafff7', 0.55));

  torso.position.y = 0.86;
  pelvis.position.set(0, 0.37, 0.03);
  head.position.y = 1.55;
  jaw.position.set(0, 1.44, -0.18);
  nose.position.set(0, 1.55, -0.3);
  nose.rotation.x = Math.PI / 2;
  pointer.position.set(0, 0.54, -0.82);
  pointer.rotation.x = Math.PI / 2;

  addMuscles(mesh, [
    { name: 'human_chest_weight_7', x: 0, y: 0.98, z: -0.08, scale: [0.72, 0.42, 0.22], weight: 7, color: '#6fe39b' },
    { name: 'human_core_weight_5', x: 0, y: 0.68, z: -0.05, scale: [0.5, 0.34, 0.2], weight: 5, color: '#59c881' },
    { name: 'human_left_thigh_weight_6', x: -0.2, y: 0.28, z: 0.03, scale: [0.2, 0.42, 0.18], weight: 6, color: '#69d993' },
    { name: 'human_right_thigh_weight_6', x: 0.2, y: 0.28, z: 0.03, scale: [0.2, 0.42, 0.18], weight: 6, color: '#69d993' },
  ]);
  addBones(mesh, [
    { name: 'human_spine', x: 0, y: 0.86, z: -0.07, length: 0.86, radius: 0.03 },
    { name: 'human_clavicle_left', x: -0.28, y: 1.13, z: -0.05, length: 0.42, radius: 0.022, rotation: [0, 0, 1.35], color: boneColor },
    { name: 'human_clavicle_right', x: 0.28, y: 1.13, z: -0.05, length: 0.42, radius: 0.022, rotation: [0, 0, -1.35], color: boneColor },
    { name: 'human_upper_arm_left', x: -0.49, y: 0.87, z: -0.02, length: 0.5, radius: 0.03, rotation: [0, 0, 0.62], color: boneColor },
    { name: 'human_upper_arm_right', x: 0.49, y: 0.87, z: -0.02, length: 0.5, radius: 0.03, rotation: [0, 0, -0.62], color: boneColor },
    { name: 'human_forearm_left', x: -0.64, y: 0.56, z: -0.06, length: 0.42, radius: 0.026, rotation: [0, 0, 0.18], color: boneColor },
    { name: 'human_forearm_right', x: 0.64, y: 0.56, z: -0.06, length: 0.42, radius: 0.026, rotation: [0, 0, -0.18], color: boneColor },
    { name: 'human_shin_left', x: -0.19, y: 0.04, z: -0.02, length: 0.42, radius: 0.03, rotation: [0, 0, 0.08], color: boneColor },
    { name: 'human_shin_right', x: 0.19, y: 0.04, z: -0.02, length: 0.42, radius: 0.03, rotation: [0, 0, -0.08], color: boneColor },
  ]);
  addJoints(mesh, [
    { name: 'human_neck_joint', x: 0, y: 1.27, z: -0.04, radius: 0.055 }, { name: 'human_left_shoulder_joint', x: -0.42, y: 1.03, z: -0.02, radius: 0.06 },
    { name: 'human_right_shoulder_joint', x: 0.42, y: 1.03, z: -0.02, radius: 0.06 }, { name: 'human_left_elbow_joint', x: -0.6, y: 0.69, z: -0.04, radius: 0.046 },
    { name: 'human_right_elbow_joint', x: 0.6, y: 0.69, z: -0.04, radius: 0.046 }, { name: 'human_left_wrist_joint', x: -0.66, y: 0.36, z: -0.08, radius: 0.038 },
    { name: 'human_right_wrist_joint', x: 0.66, y: 0.36, z: -0.08, radius: 0.038 }, { name: 'human_left_knee_joint', x: -0.19, y: 0.18, z: -0.01, radius: 0.052 },
    { name: 'human_right_knee_joint', x: 0.19, y: 0.18, z: -0.01, radius: 0.052 }, { name: 'human_left_ankle_joint', x: -0.18, y: -0.15, z: -0.07, radius: 0.042 },
    { name: 'human_right_ankle_joint', x: 0.18, y: -0.15, z: -0.07, radius: 0.042 },
  ]);

  ([-1, 1] as const).forEach((side) => {
    for (let finger = 0; finger < 5; finger += 1) {
      const digit = makeBone(0.12, 0.008, boneColor);
      digit.name = `human_${side < 0 ? 'left' : 'right'}_finger_${finger + 1}`;
      digit.position.set(side * (0.67 + finger * 0.016), 0.27, -0.12 - finger * 0.012);
      digit.rotation.set(1.25, 0, side * 0.28);
      mesh.add(digit);
    }
    for (let toe = 0; toe < 5; toe += 1) {
      const digit = makeBone(0.1, 0.008, boneColor);
      digit.name = `human_${side < 0 ? 'left' : 'right'}_toe_${toe + 1}`;
      digit.position.set(side * (0.1 + toe * 0.028), -0.19, -0.24 - toe * 0.008);
      digit.rotation.x = Math.PI / 2;
      mesh.add(digit);
    }
  });
  [torso, pelvis, head, jaw, nose, pointer].forEach((part) => { part.castShadow = true; });
  mesh.add(torso, pelvis, head, jaw, nose, pointer);
  return { x: TILE_SIZE * 3.2, z: TILE_SIZE * 14.5, radius: 0.72, speed: 8.4, facing: 0, mesh };
}

// 랩터는 머리/입/이빨/눈/손/발목/발가락 관절과 근육 가중치 블록을 모두 분리한 고밀도 코드 기반 모형입니다.
export function createRaptor(x: number, z: number, speed: number, phase: number): Raptor {
  const mesh = new THREE.Group();
  const skin = makeMaterial('#8cae55', 0.86);
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.68, 24, 14), skin);
  const neck = makeBone(0.42, 0.055, '#d8c98d');
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.34, 0.7), makeMaterial('#c8a75d', 0.72));
  const upperJaw = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.12, 0.46), makeMaterial('#d6b46a', 0.7));
  const lowerJaw = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.08, 0.42), makeMaterial('#a97b43', 0.74));
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.18, 1.65, 10), skin);

  body.position.y = 0.72;
  body.scale.set(1.55, 0.78, 0.92);
  neck.position.set(0, 0.9, -0.62);
  neck.rotation.x = 0.88;
  head.position.set(0, 0.86, -1.08);
  upperJaw.position.set(0, 0.86, -1.55);
  lowerJaw.position.set(0, 0.76, -1.53);
  tail.position.set(0, 0.68, 1.3);
  tail.rotation.x = -Math.PI / 2;

  addMuscles(mesh, [
    { name: 'raptor_hip_power_weight_10', x: 0, y: 0.72, z: 0.28, scale: [1.22, 0.48, 0.58], weight: 10, color: '#9f6a3d' },
    { name: 'raptor_chest_pull_weight_7', x: 0, y: 0.77, z: -0.48, scale: [0.82, 0.38, 0.42], weight: 7, color: '#a97944' },
    { name: 'raptor_left_calf_spring_weight_9', x: -0.47, y: 0.22, z: 0.22, scale: [0.22, 0.54, 0.2], weight: 9, color: '#b17b47' },
    { name: 'raptor_right_calf_spring_weight_9', x: 0.47, y: 0.22, z: 0.22, scale: [0.22, 0.54, 0.2], weight: 9, color: '#b17b47' },
  ]);
  addBones(mesh, [
    { name: 'raptor_spine', x: 0, y: 1.05, z: 0, length: 1.15, radius: 0.035, rotation: [Math.PI / 2, 0, 0], color: '#fff1c9' },
    { name: 'raptor_tail_vertebrae', x: 0, y: 0.83, z: 0.92, length: 0.95, radius: 0.028, rotation: [Math.PI / 2, 0, 0], color: '#fff1c9' },
    { name: 'raptor_left_thigh', x: -0.46, y: 0.43, z: 0.16, length: 0.58, radius: 0.044, rotation: [0.25, 0, -0.42], color: '#fff1c9' },
    { name: 'raptor_right_thigh', x: 0.46, y: 0.43, z: 0.16, length: 0.58, radius: 0.044, rotation: [0.25, 0, 0.42], color: '#fff1c9' },
    { name: 'raptor_left_metatarsal', x: -0.42, y: 0.06, z: -0.08, length: 0.5, radius: 0.032, rotation: [0.7, 0, -0.12], color: '#fff1c9' },
    { name: 'raptor_right_metatarsal', x: 0.42, y: 0.06, z: -0.08, length: 0.5, radius: 0.032, rotation: [0.7, 0, 0.12], color: '#fff1c9' },
    { name: 'raptor_left_arm', x: -0.56, y: 0.62, z: -0.43, length: 0.42, radius: 0.024, rotation: [0.85, 0, 0.72], color: '#fff1c9' },
    { name: 'raptor_right_arm', x: 0.56, y: 0.62, z: -0.43, length: 0.42, radius: 0.024, rotation: [0.85, 0, -0.72], color: '#fff1c9' },
  ]);
  addJoints(mesh, [
    { name: 'raptor_jaw_hinge_left', x: -0.2, y: 0.8, z: -1.28, radius: 0.038 }, { name: 'raptor_jaw_hinge_right', x: 0.2, y: 0.8, z: -1.28, radius: 0.038 },
    { name: 'raptor_left_eye', x: -0.18, y: 0.98, z: -1.36, radius: 0.045, color: '#f8ffbd' }, { name: 'raptor_right_eye', x: 0.18, y: 0.98, z: -1.36, radius: 0.045, color: '#f8ffbd' },
    { name: 'raptor_left_ankle_joint', x: -0.42, y: 0.08, z: -0.18, radius: 0.052 }, { name: 'raptor_right_ankle_joint', x: 0.42, y: 0.08, z: -0.18, radius: 0.052 },
  ]);

  for (let tooth = 0; tooth < 9; tooth += 1) {
    ([-1, 1] as const).forEach((side) => {
      const fang = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.11, 6), makeMaterial('#f8f0d8', 0.4));
      fang.name = `raptor_${side < 0 ? 'left' : 'right'}_tooth_${tooth + 1}`;
      fang.position.set(side * 0.16, 0.78 + (tooth % 2) * 0.055, -1.31 - tooth * 0.03);
      fang.rotation.x = Math.PI;
      fang.castShadow = true;
      mesh.add(fang);
    });
  }
  ([-1, 1] as const).forEach((side) => {
    addRaptorToe(mesh, side, 1, -0.1, 0.02, 0.36);
    addRaptorToe(mesh, side, 2, 0.02, -0.03, 0.46);
    addRaptorToe(mesh, side, 3, 0.12, 0.02, 0.34);
    addRaptorFinger(mesh, side, 1, 0);
    addRaptorFinger(mesh, side, 2, 0.08);
  });
  [body, neck, head, upperJaw, lowerJaw, tail].forEach((part) => { part.castShadow = true; });
  mesh.add(body, neck, head, upperJaw, lowerJaw, tail);
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
