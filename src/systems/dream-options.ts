// 저녁 페이즈 "손님 맞이" 단계에서 보여줄 세 명의 손님(=세 개의 꿈 후보)을 만든다.
import type { DreamOption } from '../data/types';
import { generateHazardEntity } from '../data/encyclopedia';
import { generateHintLine } from '../data/hints';
import { rollNightPlan } from './slot-machine';

const GUEST_COUNT = 3;

function randomGuestLabel(): string {
  // 손님의 정체나 사연은 세계관 미정 사항이라 지어내지 않고, 접수 번호처럼 익명으로 표기한다.
  const ticket = 10 + Math.floor(Math.random() * 90);
  return `예약자 #${ticket}`;
}

export function rollDreamOptions(day: number): DreamOption[] {
  return Array.from({ length: GUEST_COUNT }, (_, optionIndex) => {
    const plan = rollNightPlan(day);
    const encounterQueue = Array.from({ length: plan.enemyCount }, (_, enemyIndex) =>
      generateHazardEntity({ day, encounterIndex: optionIndex * 10 + enemyIndex }),
    );
    return {
      id: `dream_${day}_${optionIndex}`,
      guestLabel: randomGuestLabel(),
      hintLine: generateHintLine(encounterQueue),
      plan,
      encounterQueue,
    };
  });
}
