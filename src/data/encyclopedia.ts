// 백과사전(도감) 기반 위험체 절차적 생성. 로보토미 코퍼레이션의 "텍스트 조합으로 상상하게
// 하는" 방식을 따라, 형태 × 기질 × 속성 × 위협도 조합으로 위험체를 만든다.
// 조합 가짓수 자체는 각 풀의 곱만큼(5 × 4 × 5 × 5 = 500종 기본 골격) 나오고,
// 여기에 이름/서술 문구 풀을 곱하면 실질적으로 수천 가지 표현이 가능해진다.
import type { Attribute, CareState, CombatStats, FormTag, HazardEntity, TemperamentTag, ThreatTier, WorkStats } from './types';

export const FORM_TAGS: FormTag[] = ['뭉침', '촉수', '인형', '이중체', '단독형'];
export const TEMPERAMENT_TAGS: TemperamentTag[] = ['heavy', 'light', 'bounce', 'stiff'];
export const ATTRIBUTES: Attribute[] = ['침식', '공포', '광기', '기계', '생체'];

// PuppetForge 태그 카탈로그의 모션 배율(TAG_AMPLITUDE)을 그대로 전투 속도 계산에 재사용한다.
const TEMPERAMENT_SPEED_MULTIPLIER: Record<TemperamentTag, number> = {
  heavy: 0.55,
  light: 1.6,
  bounce: 1.35,
  stiff: 0.2,
};

// 형태 태그별 관측 기록 문구. 조합 결과가 도감에 그대로 노출된다.
const FORM_DESCRIPTIONS: Record<FormTag, string> = {
  뭉침: '여러 개체가 한 덩어리로 뒤엉켜 하나처럼 움직인다.',
  촉수: '중심 없이 뻗어나가는 촉수들이 각자 다른 의지를 가진 듯 꿈틀댄다.',
  인형: '낡은 헝겊과 실로 기운 인형의 형상을 하고 있다.',
  이중체: '몸의 절반씩 서로 다른 성질을 띠며, 상황에 따라 두 인격을 오간다.',
  단독형: '군집을 이루지 않는 단독 개체로, 비교적 예측 가능한 패턴을 보인다.',
};

const ATTRIBUTE_DESCRIPTIONS: Record<Attribute, string> = {
  침식: '닿는 표면을 서서히 부식시키는 기운을 두르고 있다.',
  공포: '가까이 있는 것만으로 관측자의 정신을 갉아먹는다.',
  광기: '규칙성을 알 수 없는 행동으로 관측자를 혼란에 빠뜨린다.',
  기계: '살아있는 것과 기계 장치의 경계가 불분명한 구조를 가졌다.',
  생체: '살아있는 조직으로 이루어져 있으며 통증에 반응한다.',
};

/** 위협도별 기본 스탯 범위. 등급이 오를수록 전투력과 관리 난이도가 함께 상승한다. */
const THREAT_BASE: Record<ThreatTier, { attack: number; defense: number; hp: number; mentality: number }> = {
  1: { attack: 6, defense: 4, hp: 30, mentality: 8 },
  2: { attack: 10, defense: 7, hp: 48, mentality: 14 },
  3: { attack: 15, defense: 11, hp: 70, mentality: 20 },
  4: { attack: 21, defense: 16, hp: 96, mentality: 28 },
  5: { attack: 28, defense: 22, hp: 128, mentality: 38 },
};

const PLACEHOLDER_COLORS: Record<Attribute, number> = {
  침식: 0x3a6b4c,
  공포: 0x4b2a63,
  광기: 0x7a1f4b,
  기계: 0x395a72,
  생체: 0x6b4a2a,
};

let sequence = 0;

function pick<T>(pool: T[], seed: number): T {
  return pool[Math.abs(seed) % pool.length];
}

/** 간단한 의사난수. 같은 day+index 조합이면 항상 같은 위험체가 나오게 해 재현성을 준다. */
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

export interface GenerateHazardEntityOptions {
  /** 조우가 일어난 날짜. 날짜가 오를수록 위협도 상한이 함께 오른다. */
  day: number;
  /** 같은 밤 안에서 여러 마리를 뽑을 때 서로 겹치지 않도록 하는 인덱스. */
  encounterIndex: number;
}

/** 태그 풀을 조합해 위험체 한 마리를 생성한다. 백과사전 등록과 인카운터 생성이 이 함수 하나를 공유한다. */
export function generateHazardEntity({ day, encounterIndex }: GenerateHazardEntityOptions): HazardEntity {
  const seed = day * 97 + encounterIndex * 13 + sequence++;
  const form = pick(FORM_TAGS, Math.floor(seed));
  const temperament = pick(TEMPERAMENT_TAGS, Math.floor(seed * 3));
  const attribute = pick(ATTRIBUTES, Math.floor(seed * 7));

  // 날짜가 오를수록 등장 가능한 위협도 상한이 넓어진다 (최대 5).
  const threatCap = Math.min(5, 1 + Math.floor(day / 4)) as ThreatTier;
  const threatTier = (1 + Math.floor(seededRandom(seed) * threatCap)) as ThreatTier;

  const base = THREAT_BASE[threatTier];
  const speedMultiplier = TEMPERAMENT_SPEED_MULTIPLIER[temperament];

  const combat: CombatStats = {
    attack: base.attack,
    defense: base.defense,
    speed: Math.round((8 + threatTier * 2) * speedMultiplier),
    mentality: base.mentality,
    maxHp: base.hp,
    hp: base.hp,
  };

  const work: WorkStats = {
    gathering: Math.round(seededRandom(seed + 1) * 10) + threatTier,
    mining: Math.round(seededRandom(seed + 2) * 10) + threatTier,
    research: Math.round(seededRandom(seed + 3) * 10) + threatTier,
    maintenance: Math.round(seededRandom(seed + 4) * 10) + threatTier,
  };

  const care: CareState = { stress: 0, contamination: 0 };

  return {
    id: `hazard_${day}_${encounterIndex}_${sequence}`,
    name: `${attribute} ${form} 개체 #${sequence}`,
    form,
    temperament,
    attribute,
    threatTier,
    level: 1,
    exp: 0,
    combat,
    work,
    care,
    observationNote: `${FORM_DESCRIPTIONS[form]} ${ATTRIBUTE_DESCRIPTIONS[attribute]}`,
    placeholderColor: PLACEHOLDER_COLORS[attribute],
  };
}
