// 위험체 경험치/레벨업 처리. 레벨이 오르면 전투력은 강해지지만, 다음 레벨까지 필요한
// 경험치와 함께 관리 난이도(스트레스 축적 속도 등)도 자연히 커지도록 설계 방향을 잡는다.
import type { HazardEntity } from '../data/types';

const EXP_PER_LEVEL = 30;
const STAT_GROWTH = 1.08;
const HP_GROWTH = 1.1;

export function grantExperience(entity: HazardEntity, amount: number): void {
  entity.exp += amount;
  while (entity.exp >= EXP_PER_LEVEL * entity.level) {
    entity.exp -= EXP_PER_LEVEL * entity.level;
    entity.level += 1;
    entity.combat.attack = Math.round(entity.combat.attack * STAT_GROWTH);
    entity.combat.defense = Math.round(entity.combat.defense * STAT_GROWTH);
    entity.combat.maxHp = Math.round(entity.combat.maxHp * HP_GROWTH);
    entity.combat.hp = entity.combat.maxHp;
  }
}
