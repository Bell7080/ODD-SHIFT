// 게임 전역 상태의 단일 소스. 씬들은 이 상태를 읽고 쓰는 뷰로만 동작하고, 상태를
// 씬 안에 중복 보관하지 않는다.
import type { AssignmentPreview, DayPhase, DreamOption, Employee, Facility, HazardEntity, NightPlan, ResourceType, Resources } from '../data/types';
import { generateHazardEntity } from '../data/encyclopedia';
import { rollDreamOptions } from '../systems/dream-options';

export class GameState {
  day = 1;
  /** 손님 업무의 핵심 공용 재화. 직원과 시설은 포트로 구매한다. */
  ports = 80;
  /** 직원 사망과 업무 성과가 생산 효율에 영향을 주는 부서 공통 사기. */
  morale = 75;
  guestsServedToday = 0;
  phase: DayPhase = 'morning';
  resources: Resources = { 채집자원: 20, 채광자원: 10, 연구자원: 5, 정비자원: 5 };
  roster: HazardEntity[] = [];
  pendingCapture: HazardEntity[] = [];
  employees: Employee[] = [];
  facilities: Facility[] = [];
  log: string[] = [];
  /** 같은 날짜의 자동 생산이 씬 재진입으로 중복 지급되지 않게 기억한다. */
  lastProductionDay = 0;

  /** 저녁에 찾아온 세 손님(꿈 후보). 하나를 고르면 비운다. */
  dreamOptions: DreamOption[] = [];
  /** 오늘 밤 들어가기로 확정한 손님의 익명 라벨. */
  selectedGuestLabel: string | null = null;
  nightPlan: NightPlan | null = null;
  encounterQueue: HazardEntity[] = [];
  /** 브리핑에서 정한 출전 순서. 비어 있으면 로스터 앞쪽을 기본 편성으로 사용한다. */
  selectedPartyIds: string[] = [];
  /** 구금 파손으로 이탈한 개체 ID는 사고 기록과 후속 UI에서 구분한다. */
  escapedEntityIds: string[] = [];

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
    this.selectedPartyIds.push(starter.id);

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

    this.addLog('부서 첫 근무를 시작합니다.');
  }

  /** 문자열 로그 앞에 날짜와 분류를 붙여 UI 필터가 별도 중복 상태 없이 동작하게 한다. */
  addLog(message: string, category: '운영' | '사고' = '운영'): void {
    this.log.push(`[D${this.day}][${category}] ${message}`);
  }

  gainResource(type: ResourceType, amount: number): void {
    this.resources[type] += amount;
  }

  /** 모든 구금 개체의 작업 적성을 합산해 하루에 정확히 한 번 자원을 생산한다. */
  produceDailyResources(): Resources | null {
    if (this.lastProductionDay === this.day) return null;
    const produced: Resources = { 채집자원: 0, 채광자원: 0, 연구자원: 0, 정비자원: 0 };
    this.roster.forEach((entity) => {
      const manager = this.employees.find((employee) => employee.assignedEntityId === entity.id);
      const aptitudeBonus = manager ? this.getAssignmentPreview(manager, entity).portBonus : 0;
      produced.채집자원 += entity.work.gathering;
      produced.채광자원 += entity.work.mining;
      produced.연구자원 += entity.work.research;
      produced.정비자원 += entity.work.maintenance;
      // 생산에는 관리 부담이 따르므로 매일 스트레스도 소량 누적한다.
      entity.care.stress = Math.min(100, entity.care.stress + 4);
      // 적성이 맞는 담당자는 개체의 포트 전환 효율을 높인다.
      this.ports += entity.threatTier + aptitudeBonus;
    });
    // 사기 0~100을 50~100% 생산 효율로 환산해 직원 손실의 장기 비용을 만든다.
    const moraleEfficiency = 0.5 + this.morale / 200;
    (Object.keys(produced) as ResourceType[]).forEach((type) => {
      produced[type] = Math.round(produced[type] * moraleEfficiency);
      this.gainResource(type, produced[type]);
    });
    this.lastProductionDay = this.day;
    this.addLog(`${this.day}일차 자동 생산이 완료되었습니다.`);
    return produced;
  }

  spendResource(type: ResourceType, amount: number): boolean {
    if (this.resources[type] < amount) return false;
    this.resources[type] -= amount;
    return true;
  }

  /** 드래그 배치의 단일 상태 변경 지점. 한 위험체에는 직원 한 명만 배치한다. */
  assignEmployee(employeeId: string, entityId: string): boolean {
    const employee = this.employees.find((member) => member.id === employeeId);
    if (!employee || this.employees.some((member) => member.id !== employeeId && member.assignedEntityId === entityId)) return false;
    employee.assignedEntityId = entityId;
    const entity = this.roster.find((candidate) => candidate.id === entityId);
    if (entity) entity.care.stress = Math.max(0, entity.care.stress - Math.round(employee.skill / 5));
    this.addLog(`${employee.name}을(를) ${entity?.name ?? '위험체'} 관리에 배치했습니다.`);
    return true;
  }

  /** 툴팁과 실제 정산이 같은 공식을 공유해 안내와 결과가 어긋나지 않게 한다. */
  getAssignmentPreview(employee: Employee, entity: HazardEntity): AssignmentPreview {
    const aptitudeMatch = employee.aptitude === entity.attribute;
    return {
      stressReduction: Math.round(employee.skill / 5),
      portBonus: aptitudeMatch ? Math.ceil(employee.skill / 10) : 0,
      combatBonus: aptitudeMatch ? Math.ceil(employee.skill / 12) : Math.ceil(employee.skill / 25),
      aptitudeMatch,
    };
  }

  /** 배치된 전투지원 수치는 전투 계산에서 공격력에 더해진다. */
  getCombatSupportBonus(entityId: string): number {
    const employee = this.employees.find((member) => member.assignedEntityId === entityId);
    const entity = this.roster.find((candidate) => candidate.id === entityId);
    return employee && entity ? this.getAssignmentPreview(employee, entity).combatBonus : 0;
  }

  /** 브리핑 카드 선택을 출전 한도 안에서 토글하고 배열 순서를 실제 출전 순서로 쓴다. */
  togglePartyMember(entityId: string): boolean {
    const selectedIndex = this.selectedPartyIds.indexOf(entityId);
    if (selectedIndex >= 0) {
      if (this.selectedPartyIds.length === 1) return false;
      this.selectedPartyIds.splice(selectedIndex, 1);
      return true;
    }
    const limit = (this.facilities[0]?.capacity ?? 0) >= 6 ? 6 : 3;
    if (this.selectedPartyIds.length >= limit) return false;
    this.selectedPartyIds.push(entityId);
    return true;
  }

  /** 드래그한 편성 카드를 목표 슬롯으로 옮기고 사이 항목은 자연스럽게 밀어낸다. */
  reorderPartyMember(entityId: string, targetIndex: number): boolean {
    const fromIndex = this.selectedPartyIds.indexOf(entityId);
    if (fromIndex < 0 || targetIndex < 0 || targetIndex >= this.selectedPartyIds.length || fromIndex === targetIndex) return false;
    const [moved] = this.selectedPartyIds.splice(fromIndex, 1);
    this.selectedPartyIds.splice(targetIndex, 0, moved);
    this.addLog(`${fromIndex + 1}번 편성을 ${targetIndex + 1}번 슬롯으로 이동했습니다.`);
    return true;
  }

  /** 포트를 지불해 직원을 영입한다. 미정 인물 설정 대신 운영 번호를 이름으로 쓴다. */
  hireEmployee(): boolean {
    const cost = 45;
    if (this.ports < cost) return false;
    this.ports -= cost;
    const sequence = this.employees.length + 1;
    this.employees.push({ id: `staff_${Date.now()}`, name: `관리 직원 ${String(sequence).padStart(2, '0')}`, role: '케어', aptitude: '생체', skill: 30, fatigue: 0 });
    this.morale = Math.min(100, this.morale + 3);
    this.addLog(`직원 한 명을 ${cost} 포트에 고용했습니다.`);
    return true;
  }

  /** 시설 탭에서 구금 칸을 한 칸 늘린다. */
  expandContainment(): boolean {
    const facility = this.facilities[0];
    const cost = 70 + (facility?.capacity ?? 0) * 10;
    if (!facility || this.ports < cost) return false;
    this.ports -= cost;
    facility.capacity += 1;
    this.addLog(`구금소 수용량을 ${facility.capacity}칸으로 증설했습니다.`);
    return true;
  }

  confirmCapture(entity: HazardEntity): void {
    this.roster.push(entity);
    // 빈 편성 자리가 있으면 신규 개체도 후보에 자동 포함하되 순서는 플레이어가 바꿀 수 있다.
    const limit = (this.facilities[0]?.capacity ?? 0) >= 6 ? 6 : 3;
    if (this.selectedPartyIds.length < limit) this.selectedPartyIds.push(entity.id);
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
    // 하루 동안 관리자가 없던 개체는 몽환 스트레스가 크게 오른다.
    this.roster.forEach((entity) => {
      const managed = this.employees.some((employee) => employee.assignedEntityId === entity.id);
      entity.care.stress = Math.min(100, entity.care.stress + (managed ? 2 : 18));
    });
    this.resolveContainmentIncidents();
    // 배치는 하루 단위 업무이므로 정산 뒤 해제해 다음 날 다시 관리하도록 한다.
    this.employees.forEach((employee) => { employee.assignedEntityId = undefined; });
    this.day += 1;
    this.guestsServedToday = 0;
    this.phase = 'morning';
    this.nightPlan = null;
    this.encounterQueue = [];
    this.selectedGuestLabel = null;
  }

  /** 영업 마감 전에 경고할 몽환 70 이상 개체를 높은 순서로 돌려준다. */
  getCriticalEntities(): HazardEntity[] {
    return this.roster.filter((entity) => entity.care.stress >= 70).sort((a, b) => b.care.stress - a.care.stress);
  }

  /** 정비자원 또는 포트로 긴급 안정화를 실행하며 UI와 비용 규칙을 한곳에 둔다. */
  stabilizeEntity(entityId: string, payment: 'maintenance' | 'ports'): boolean {
    const entity = this.roster.find((candidate) => candidate.id === entityId);
    if (!entity) return false;
    const paid = payment === 'maintenance' ? this.spendResource('정비자원', 25) : this.ports >= 30;
    if (!paid) return false;
    if (payment === 'ports') this.ports -= 30;
    entity.care.stress = Math.max(0, entity.care.stress - 35);
    this.addLog(`${entity.name} 긴급 안정화 · 몽환 -35`);
    return true;
  }

  /** 높은 몽환 수치를 실제 시설 피해·직원 사망·개체 이탈로 처리한다. */
  private resolveContainmentIncidents(): void {
    const facility = this.facilities[0];
    [...this.roster].forEach((entity) => {
      if (entity.care.stress < 70) return;
      const stabilityDamage = entity.care.stress >= 90 ? 22 : 8;
      if (facility) facility.stability = Math.max(0, facility.stability - stabilityDamage);
      this.addLog(`${entity.name} 난폭화 · 시설 안정도 -${stabilityDamage}`, '사고');
      if (entity.care.stress < 90) return;

      // 담당자가 있으면 담당자가, 없으면 첫 가용 직원이 사고를 수습하다 희생된다.
      const casualty = this.employees.find((employee) => employee.assignedEntityId === entity.id) ?? this.employees[0];
      if (casualty) {
        this.employees = this.employees.filter((employee) => employee.id !== casualty.id);
        this.morale = Math.max(0, this.morale - 25);
        this.addLog(`[사망] ${casualty.name} · ${entity.name} 구금 파손 대응 중 사망`, '사고');
      }
      this.roster = this.roster.filter((candidate) => candidate.id !== entity.id);
      this.selectedPartyIds = this.selectedPartyIds.filter((id) => id !== entity.id);
      if (facility) facility.occupantIds = facility.occupantIds.filter((id) => id !== entity.id);
      this.escapedEntityIds.push(entity.id);
      this.addLog(`[탈출] ${entity.name}이(가) 시설에서 이탈했습니다.`, '사고');
    });
  }

  /** 전투 한 건을 정산하고 같은 날 추가 손님을 받을 수 있게 접수를 다시 연다. */
  settleGuestService(): void {
    const reward = 25 + (this.nightPlan?.enemyCount ?? 1) * 10;
    this.ports += reward;
    this.guestsServedToday += 1;
    this.morale = Math.min(100, this.morale + 5);
    this.phase = 'guests';
    this.nightPlan = null;
    this.encounterQueue = [];
    this.selectedGuestLabel = null;
    this.dreamOptions = rollDreamOptions(this.day + this.guestsServedToday);
    this.addLog(`손님 업무 보상으로 ${reward} 포트를 받았습니다.`);
  }
}

// 씬 전환 간에도 하나의 상태를 공유하기 위한 싱글턴.
export const gameState = new GameState();
