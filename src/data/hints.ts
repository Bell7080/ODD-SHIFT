// 저녁 페이즈에 찾아오는 손님들이 하는 은유적 암시 대사. 그날 밤 후보 개체 중 가장
// 위협도가 높은 개체의 형태 태그를 기준으로 문구 풀에서 고른다. 이 문구는 게임 시스템
// 콘텐츠(도감 서술과 같은 층위)이며, 세계관 확정 설정을 함부로 지어내지 않기 위해
// 손님의 정체나 사연은 담지 않는다 — docs/세계관.md 참고.
import type { FormTag, HazardEntity } from './types';

const HINT_LINES: Record<FormTag, string[]> = {
  뭉침: ['손발이... 너무 많아. 전부 날 만지려고 해.', '한 덩어리인데 눈이 자꾸 늘어나.'],
  촉수: ['끈적한 게 발목을 감아. 놓아주질 않아.', '사방에서 팔이 뻗어 나와.'],
  인형: ['실이 뜯어지는 소리가 계속 들려.', '작은 게 자꾸 따라와. 웃고 있어.'],
  이중체: ['풍선... 풍선이 보여. 저 하늘을 빨갛게 물들이더라?', '반은 웃고 반은 울어. 어느 쪽이 진짜인지 모르겠어.'],
  단독형: ['그림자가 하나인데 발소리는 둘이야.', '혼자인데 자꾸 말을 걸어.'],
};

const URGENCY_SUFFIX = ' ...심상치 않아요.';

function pickRandom<T>(pool: T[]): T {
  return pool[Math.floor(Math.random() * pool.length)];
}

/** 그날 밤 후보 개체 중 가장 위협도가 높은 개체를 기준으로 암시 대사를 만든다. */
export function generateHintLine(encounterQueue: HazardEntity[]): string {
  if (encounterQueue.length === 0) return '...아무 소리도 안 들려요. 조용해요.';
  const mostDangerous = encounterQueue.reduce((max, entity) => (entity.threatTier > max.threatTier ? entity : max));
  const line = pickRandom(HINT_LINES[mostDangerous.form]);
  return mostDangerous.threatTier >= 4 ? `${line}${URGENCY_SUFFIX}` : line;
}
