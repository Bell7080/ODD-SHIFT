// 밤 페이즈 진입 시 그날의 전투 조건(적 수, 태그매치 여부, 악몽, 응급 각성 횟수)을
// 결정하는 슬롯머신. 날짜가 오를수록 테이블이 상향돼 자연스러운 난이도 곡선을 만든다.
import type { NightPlan, NightmareModifier } from '../data/types';

const NIGHTMARES: NightmareModifier[] = [
  { id: 'fog', name: '안개 지형', description: '시야가 흐려져 명중률이 낮아진다.' },
  { id: 'insomnia', name: '불면의 악몽', description: '전투 중 회복 효과가 무효화된다.' },
  { id: 'corrosion', name: '침식 지대', description: '매 턴 아군 전원이 도트 피해를 입는다.' },
  { id: 'silence', name: '정적', description: '기술 발동 확률이 낮아진다.' },
];

// 날짜가 낮을 때는 순한 악몽만, 오를수록 험한 악몽까지 등장하게 인덱스를 제한한다.
function availableNightmares(day: number): NightmareModifier[] {
  const unlocked = Math.min(NIGHTMARES.length, 1 + Math.floor(day / 3));
  return NIGHTMARES.slice(0, unlocked);
}

export function rollNightPlan(day: number): NightPlan {
  // 초반 1~2마리에서 후반 최대 6마리까지, 3일마다 한 마리씩 늘어난다.
  const enemyCount = Math.min(6, 1 + Math.floor(day / 3));
  // 4마리 이상부터 두 마리씩 짝지어 나오는 태그매치가 섞일 수 있다.
  const tagTeam = enemyCount >= 4 && Math.random() < 0.5;
  const pool = availableNightmares(day);
  const nightmare = pool[Math.floor(Math.random() * pool.length)];
  // 응급 각성은 기본 1회, 5일마다 1회씩 늘어나 최대 3회.
  const wakeUps = Math.min(3, 1 + Math.floor(day / 5));

  return { enemyCount, tagTeam, nightmare, wakeUps };
}
