// 전투에서 약화시킨 위험체를 구금 시도하는 확률 계산. 포켓몬형 회유 판정을 참고하되,
// 담당 직원 숙련도와 위험체 등급을 함께 반영한다.
import type { Employee, HazardEntity } from '../data/types';

export interface CaptureAttemptInput {
  entity: HazardEntity;
  /** 사용한 진정 수단의 강도. 0~1. */
  sedationLevel: number;
  handler?: Employee;
}

/** 성공 확률만 계산하고 실제 굴림은 하지 않는다. UI에서 확률을 미리 보여줄 때 쓴다. */
export function calculateCaptureChance({ entity, sedationLevel, handler }: CaptureAttemptInput): number {
  const hpRatio = entity.combat.hp / entity.combat.maxHp;
  // 체력이 낮을수록, 위협도가 낮을수록 잡기 쉽다.
  const base = (1 - hpRatio) * 0.6 + (6 - entity.threatTier) * 0.05;
  const sedationBonus = sedationLevel * 0.25;
  const handlerBonus = handler ? (handler.skill / 100) * 0.2 : 0;
  return Math.max(0.02, Math.min(0.95, base + sedationBonus + handlerBonus));
}

export interface CaptureResult {
  success: boolean;
  chance: number;
}

export function attemptCapture(input: CaptureAttemptInput): CaptureResult {
  const chance = calculateCaptureChance(input);
  return { success: Math.random() < chance, chance };
}
