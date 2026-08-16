// 게임 전역 상태의 단일 소스. 씬들은 이 상태를 읽고 쓰는 뷰로만 동작하고, 상태를
// 씬 안에 중복 보관하지 않는다.
import type { DayPhase, DreamOption, Employee, Facility, HazardEntity, NightPlan, ResourceType, Resources } from '../data/types';
import { generateHazardEntity } from '../data/encyclopedia';
import { rollDreamOptions } from '../systems/dream-options';

export class GameState {
  day = 1;
  phase: DayPhase = 'morning';
  resources: Resources = { 채집자원: 20, 채광자원: 10, 연구자원: 5, 정비자원: 5 };
  roster: HazardEntity[] = [];
  pendingCapture: HazardEntity[] = [];
  employees: Employee[] = [];
  facilities: Facility[] = [];
  log: string[] = [];

  /** 저녁에 찾아온 세 손님(꿈 후보). 하나를 고르면 비운다. */
  dreamOptions: DreamOption[] = [];
  /** 오늘 밤 들어가기로 확정한 손님의 익명 라벨. */
  selectedGuestLabel: string | null = null;
  nightPlan: NightPlan | null = null;
  encounterQueue: HazardEntity[] = [];

  constructor() {
    this.seedStarterState();
  }

  private seedStarterState(): void {
    // 튜토리얼용 순한 위험체: 낡은 헝겊 고양이 인형.
    const starter = generateHazardEntity({ day: 0, encounterIndex: 0 });
    starter.name = '낡은 헝겊 고양이 인형';
    starter.threatTier = 1;
    starter.form = '인형';
    starter.observationNote =
      '실로 기운 자국이 가득한 낡은 고양이 인형. 위협적이지 않으며 구금·케어 튜토리얼을 담당한다.';
    // 실제로 제작된 PuppetForge 에셋이 있으니 이 개체에 연결한다. 에셋이 지워지거나
    // 경로가 바뀌어도 puppet-loader가 알아서 플레이스홀더로 대체한다.
    starter.puppetAssetUrl = 'assets/illustrations/hazard-entities/entity_001.zip';
    this.roster.push(starter);

    this.employees.push(
      { id: 'staff_1', name: '이서 인턴', role: '케어', aptitude: '생체', skill: 40, fatigue: 0 },
      { id: 'staff_2', name: '박 인턴', role: '전투지원', aptitude: '공포', skill: 35, fatigue: 0 },
    );

    this.facilities.push({
      id: 'facility_1',
      name: '1구역 수용실',
      containmentGrade: 2,
      capacity: 4,
      occupantIds: [starter.id],
      stability: 80,
    });

    this.log.push('부서 첫 근무를 시작합니다.');
  }

  addLog(message: string): void {
    this.log.push(message);
  }

  gainResource(type: ResourceType, amount: number): void {
    this.resources[type] += amount;
  }

  spendResource(type: ResourceType, amount: number): boolean {
    if (this.resources[type] < amount) return false;
    this.resources[type] -= amount;
    return true;
  }

  confirmCapture(entity: HazardEntity): void {
    this.roster.push(entity);
    this.addLog(`${entity.name}을(를) 구금했습니다.`);
  }

  releaseEntity(entity: HazardEntity): void {
    this.addLog(`${entity.name}을(를) 놓아주었습니다.`);
  }

  goToNoon(): void {
    this.phase = 'noon';
  }

  goToEvening(): void {
    this.phase = 'evening';
  }

  /** 저녁의 시설 강화·직원 영입을 마치고, 손님 셋을 맞이하는 단계로 넘어간다. */
  goToGuestSelection(): void {
    this.phase = 'guests';
    this.dreamOptions = rollDreamOptions(this.day);
  }

  /** 세 손님 중 한 명을 골라 그 손님의 꿈으로 들어갈 조건을 확정한다. */
  selectDream(option: DreamOption): void {
    this.nightPlan = option.plan;
    this.encounterQueue = option.encounterQueue;
    this.selectedGuestLabel = option.guestLabel;
    this.dreamOptions = [];
    this.phase = 'night';
  }

  goToCombat(): void {
    this.phase = 'combat';
  }

  goToNextMorning(): void {
    this.day += 1;
    this.phase = 'morning';
    this.nightPlan = null;
    this.encounterQueue = [];
    this.selectedGuestLabel = null;
  }
}

// 씬 전환 간에도 하나의 상태를 공유하기 위한 싱글턴.
export const gameState = new GameState();
