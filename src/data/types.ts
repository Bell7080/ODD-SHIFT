// 게임 전역에서 쓰는 핵심 타입 정의. GameState가 이 타입들의 단일 소스다.

/** 위험체 속성. 상성 계산과 시너지 판정의 기준이 된다. */
export type Attribute = '침식' | '공포' | '광기' | '기계' | '생체';

/** 위험체 위협도 등급. 높을수록 강하지만 관리 난이도도 함께 오른다. */
export type ThreatTier = 1 | 2 | 3 | 4 | 5;

/** 백과사전 조합에 쓰이는 형태 태그. */
export type FormTag = '뭉침' | '촉수' | '인형' | '이중체' | '단독형';

/** PuppetForge의 모션 태그 체계와 맞물리는 기질 태그. 애니메이션 강도 배율에도 대응한다. */
export type TemperamentTag = 'heavy' | 'light' | 'bounce' | 'stiff';

/** 전투에 쓰이는 능력치. */
export interface CombatStats {
  attack: number;
  defense: number;
  speed: number;
  mentality: number;
  maxHp: number;
  hp: number;
}

/** 점심 케어 페이즈에서 작업 배치에 쓰이는 작업 적성. 팰월드식 노동 적성 개념. */
export interface WorkStats {
  gathering: number; // 채집
  mining: number; // 채광
  research: number; // 연구
  maintenance: number; // 정비
}

/** 관리 리스크와 직결되는 상태값. 방치하면 오른다. */
export interface CareState {
  stress: number; // 0~100. 100에 가까울수록 사고 확률 상승.
  contamination: number; // 0~100. 오염도.
}

export interface HazardEntity {
  id: string;
  name: string;
  form: FormTag;
  temperament: TemperamentTag;
  attribute: Attribute;
  threatTier: ThreatTier;
  level: number;
  exp: number;
  combat: CombatStats;
  work: WorkStats;
  care: CareState;
  /** 도감에 기록되는 관측 기록 서술. */
  observationNote: string;
  /** 아직 PuppetForge 에셋을 못 구한 개체는 플레이스홀더 색상으로 표시한다. */
  placeholderColor: number;
  /** 실제 에셋이 준비되면 이 경로에 익스포트 zip을 연결한다. */
  puppetAssetUrl?: string;
}

export type EmployeeRole = '케어' | '전투지원' | '시설운영' | '야간응급';

export interface Employee {
  id: string;
  name: string;
  role: EmployeeRole;
  /** 이 직원이 잘 다루는 속성. 매칭되면 안정도·산출량 보너스를 받는다. */
  aptitude: Attribute;
  skill: number; // 0~100
  fatigue: number; // 0~100. 높으면 사고 위험.
}

export interface Facility {
  id: string;
  name: string;
  /** 수용 등급. 이 값보다 높은 위협도의 위험체는 안전하게 수용할 수 없다. */
  containmentGrade: ThreatTier;
  capacity: number;
  occupantIds: string[];
  stability: number; // 0~100
}

export type ResourceType = '채집자원' | '채광자원' | '연구자원' | '정비자원';

export type Resources = Record<ResourceType, number>;

export type DayPhase = 'morning' | 'noon' | 'evening' | 'guests' | 'night' | 'combat';

/** 슬롯머신이 결정하는 그날 밤 전투 조건. */
export interface NightPlan {
  enemyCount: number;
  tagTeam: boolean;
  nightmare: NightmareModifier;
  wakeUps: number;
}

export interface NightmareModifier {
  id: string;
  name: string;
  description: string;
}

/**
 * 저녁 페이즈에 찾아오는 손님 한 명이 제안하는 "그날 밤 들어갈 꿈" 후보.
 * 관리자는 매일 저녁 셋 중 하나를 골라 그 손님의 악몽으로 들어간다.
 * 나머지 두 후보(선택받지 못한 손님)의 이후 처리는 세계관 미정 사항이다 (docs/세계관.md 참고).
 */
export interface DreamOption {
  id: string;
  /** 손님을 가리키는 익명 라벨. 정체·서사는 세계관 미정이라 인적사항을 지어내지 않는다. */
  guestLabel: string;
  /** 손님이 하는 은유적 암시 대사. */
  hintLine: string;
  plan: NightPlan;
  encounterQueue: HazardEntity[];
}
