// 포획형 턴제 전투 화면. 아군은 좌측, 상대는 우측에 두고 하단 로그 옆의
// 2×2 명령 패널에서 공격·교체·회유·긴급 기상을 선택한다.
import Phaser from 'phaser';
import { gameState } from '../state/game-state';
import { attemptCapture } from '../systems/capture';
import { grantExperience } from '../systems/leveling';
import { loadCreatureVisual, type CreatureVisual } from '../systems/puppet-loader';
import type { HazardEntity } from '../data/types';
import { makeButton, makeText } from '../ui/text';

const TEMP_BATTLE_PUPPET = 'assets/illustrations/hazard-entities/entity_001.zip';
// 양측 발판 높이에 맞춘 개별 원점으로 적은 위, 아군은 아래인 대각선 구도를 만든다.
const ALLY_PUPPET_ORIGIN_Y = 360;
const ENEMY_PUPPET_ORIGIN_Y = 278;

interface BattleSkill {
  name: string;
  power: number;
  note: string;
}

const BASIC_SKILLS: BattleSkill[] = [
  { name: '몸통박치기', power: 1, note: '안정적인 기본 공격' },
  { name: '할퀴기', power: 1.18, note: '조금 강한 근접 공격' },
  { name: '꿈결 파동', power: 0.9, note: '정신을 흔드는 파동' },
  { name: '웅크리기', power: 0, note: '이번 반격 피해 감소' },
];

export class CombatScene extends Phaser.Scene {
  private party: HazardEntity[] = [];
  private enemies: HazardEntity[] = [];
  private activePartyIndex = 0;
  private activeEnemyIndex = 0;
  private wakeUpsRemaining = 0;
  private defending = false;
  private logLines: string[] = [];
  private logText!: Phaser.GameObjects.Text;
  private commandNodes: Phaser.GameObjects.GameObject[] = [];
  private statusNodes: Phaser.GameObjects.GameObject[] = [];
  private allyVisual: CreatureVisual | null = null;
  private enemyVisual: CreatureVisual | null = null;

  constructor() {
    super('combat');
  }

  async create(): Promise<void> {
    // 기본 3체, 구금 시설 수용량이 6칸 이상이면 원정 편성도 최대 6체로 확장한다.
    const partyLimit = (gameState.facilities[0]?.capacity ?? 0) >= 6 ? 6 : 3;
    const selected = gameState.selectedPartyIds
      .map((id) => gameState.roster.find((entity) => entity.id === id))
      .filter((entity): entity is HazardEntity => Boolean(entity));
    this.party = (selected.length ? selected : gameState.roster).slice(0, partyLimit);
    this.enemies = gameState.encounterQueue;
    this.activePartyIndex = 0;
    this.activeEnemyIndex = 0;
    this.wakeUpsRemaining = gameState.nightPlan?.wakeUps ?? 0;
    this.defending = false;
    this.logLines = [
      `${gameState.selectedGuestLabel ?? '선택한 손님'}의 악몽에 진입했습니다.`,
      '불안정한 개체 신호가 포착되었습니다.',
    ];

    this.drawBattlefield();
    this.logText = makeText(this, 34, 570, '', 'body', {
      fontSize: '12px', color: '#b8accb', lineSpacing: 4, wordWrap: { width: 650 },
    });
    await this.reloadBattleVisuals();
    this.renderStatus();
    this.showMainCommands();
  }

  private get activeAlly(): HazardEntity | undefined {
    return this.party[this.activePartyIndex];
  }

  private get activeEnemy(): HazardEntity | undefined {
    return this.enemies[this.activeEnemyIndex];
  }

  private drawBattlefield(): void {
    this.cameras.main.setBackgroundColor('#08070d');
    // 흐릿한 수평선과 플랫폼만 사용해 퍼펫과 상태 UI가 가장 먼저 읽히게 한다.
    this.add.rectangle(0, 0, 1280, 535, 0x0c0b14, 1).setOrigin(0, 0);
    this.add.ellipse(330, 482, 390, 78, 0x163638, 0.42).setStrokeStyle(2, 0x43d7cf, 0.35);
    this.add.ellipse(900, 400, 390, 78, 0x291f38, 0.5).setStrokeStyle(2, 0x76569c, 0.38);
    this.add.rectangle(0, 535, 1280, 185, 0x060509, 0.98).setOrigin(0, 0);
    this.add.line(0, 535, 0, 0, 1280, 0, 0x8d68c7, 0.55).setOrigin(0, 0);
    makeText(this, 28, 548, 'BATTLE LOG', 'accent', { fontSize: '10px', color: '#43d7cf' });
  }

  private async reloadBattleVisuals(): Promise<void> {
    this.allyVisual?.destroy();
    this.enemyVisual?.destroy();
    const ally = this.activeAlly;
    const enemy = this.activeEnemy;
    // 정식 개체별 전투 에셋이 갖춰지기 전까지 양측 모두 001 퍼펫을 공통 사용한다.
    if (enemy) {
      this.enemyVisual = await loadCreatureVisual(this, { ...enemy, puppetAssetUrl: TEMP_BATTLE_PUPPET }, 900, ENEMY_PUPPET_ORIGIN_Y);
      this.enemyVisual.setScale(0.26);
      this.enemyVisual.play('idle');
    }
    if (ally) {
      this.allyVisual = await loadCreatureVisual(this, { ...ally, puppetAssetUrl: TEMP_BATTLE_PUPPET }, 330, ALLY_PUPPET_ORIGIN_Y);
      this.allyVisual.setScale(0.26);
      this.allyVisual.play('idle');
    }
  }

  private renderStatus(): void {
    this.statusNodes.forEach((node) => node.destroy());
    this.statusNodes = [];
    const enemy = this.activeEnemy;
    const ally = this.activeAlly;
    if (ally) this.drawStatusCard(48, 72, ally, 'CONTAINED UNIT', 0x43d7cf);
    if (enemy) this.drawStatusCard(788, 72, enemy, 'HOSTILE SIGNAL', 0x8d68c7);
    // 태그전에서는 두 번째 전선 개체의 상태도 축약 카드로 동시에 노출한다.
    if (gameState.nightPlan?.tagTeam) {
      const supportAlly = this.party[this.activePartyIndex + 1];
      const supportEnemy = this.enemies[this.activeEnemyIndex + 1];
      if (supportAlly) this.drawTagStatus(48, 192, supportAlly, 'ALLY TAG', 0x43d7cf);
      if (supportEnemy) this.drawTagStatus(1008, 192, supportEnemy, 'ENEMY TAG', 0x8d68c7);
    }
    this.logText.setText(this.logLines.slice(-5).join('\n'));
  }

  /** 주 상태 카드 아래의 작은 태그 슬롯으로 2대2 동시 전선을 표현한다. */
  private drawTagStatus(x: number, y: number, entity: HazardEntity, label: string, accent: number): void {
    const add = (node: Phaser.GameObjects.GameObject): void => { this.statusNodes.push(node); };
    const ratio = Phaser.Math.Clamp(entity.combat.hp / entity.combat.maxHp, 0, 1);
    add(this.add.polygon(x + 105, y + 28, [-105, -28, 96, -28, 105, -19, 101, 28, -101, 28], 0x0d0a13, 0.94).setStrokeStyle(2, accent, 0.75));
    add(makeText(this, x + 10, y - 17, `${label} · ${entity.name}`, 'accent', { fontSize: '8px', color: '#cfc1df' }));
    add(this.add.rectangle(x + 10, y + 8, 180, 7, 0x281f30, 1).setOrigin(0, 0));
    add(this.add.rectangle(x + 10, y + 8, 180 * ratio, 7, accent, 1).setOrigin(0, 0));
  }

  private drawStatusCard(x: number, y: number, entity: HazardEntity, label: string, accent: number): void {
    const add = (node: Phaser.GameObjects.GameObject): void => { this.statusNodes.push(node); };
    add(this.add.rectangle(x, y, 430, 112, 0x07060c, 0.92).setOrigin(0, 0).setStrokeStyle(1, accent, 0.75));
    add(makeText(this, x + 16, y + 10, label, 'accent', { fontSize: '9px', color: accent === 0x43d7cf ? '#43d7cf' : '#b999e5' }));
    add(makeText(this, x + 16, y + 30, entity.name, 'heading', { fontSize: '15px', color: '#f2e9ff' }));
    add(makeText(this, x + 292, y + 16, `LV.${entity.level}  위험 ${entity.threatTier}\n악몽유형  ${entity.attribute}`, 'body', {
      fontSize: '10px', color: '#9d90ad', align: 'right',
    }));
    const ratio = Phaser.Math.Clamp(entity.combat.hp / entity.combat.maxHp, 0, 1);
    add(makeText(this, x + 16, y + 69, 'HP', 'accent', { fontSize: '10px', color: '#d8cceb' }));
    add(this.add.rectangle(x + 51, y + 72, 340, 10, 0x241e2c, 1).setOrigin(0, 0));
    add(this.add.rectangle(x + 51, y + 72, 340 * ratio, 10, ratio < 0.3 ? 0xd85c79 : accent, 1).setOrigin(0, 0));
    add(makeText(this, x + 315, y + 89, `${Math.max(0, entity.combat.hp)} / ${entity.combat.maxHp}`, 'body', {
      fontSize: '10px', color: '#8f849a',
    }));
  }

  private clearCommands(): void {
    this.commandNodes.forEach((node) => node.destroy());
    this.commandNodes = [];
  }

  private addCommand(x: number, y: number, title: string, subline: string, onClick: () => void): void {
    const panel = this.add.rectangle(x, y, 240, 62, 0x15101e, 1)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0x8d68c7, 0.75)
      .setInteractive({ useHandCursor: true });
    panel.on('pointerover', () => panel.setFillStyle(0x251a35, 1));
    panel.on('pointerout', () => panel.setFillStyle(0x15101e, 1));
    panel.on('pointerdown', onClick);
    this.commandNodes.push(panel);
    this.commandNodes.push(makeText(this, x + 16, y + 11, title, 'heading', { fontSize: '14px', color: '#f0e5ff' }));
    this.commandNodes.push(makeText(this, x + 16, y + 36, subline, 'body', { fontSize: '9px', color: '#877a99' }));
  }

  private showMainCommands(): void {
    this.clearCommands();
    this.addCommand(756, 558, '공격', '기술 목록 열기', () => this.showSkills());
    this.addCommand(1008, 558, '교체', '구금 개체 변경', () => this.showSwitches());
    this.addCommand(756, 632, '회유', '약해진 개체 구금 시도', () => this.tryPersuade());
    this.addCommand(1008, 632, '긴급 기상', `남은 개입 ${this.wakeUpsRemaining}회`, () => this.useWakeUp());
  }

  private showSkills(): void {
    this.clearCommands();
    BASIC_SKILLS.forEach((skill, index) => {
      const x = index % 2 === 0 ? 756 : 1008;
      const y = index < 2 ? 558 : 632;
      this.addCommand(x, y, skill.name, skill.note, () => this.useSkill(skill));
    });
    // 네 기술 슬롯은 그대로 유지하고, 패널 위의 작은 보조 버튼으로 선택 취소를 제공한다.
    const backButton = makeButton(this, 1228, 526, '← 뒤로', () => this.showMainCommands(), {
      fontSize: '11px', color: '#e8dcff', backgroundColor: '#463457', padding: { x: 9, y: 5 },
    }).setOrigin(1, 0.5);
    this.commandNodes.push(backButton);
  }

  private showSwitches(): void {
    this.clearCommands();
    const candidates = this.party.filter((member, index) => member.combat.hp > 0 && index !== this.activePartyIndex);
    candidates.slice(0, 3).forEach((member, index) => {
      const x = index % 2 === 0 ? 756 : 1008;
      const y = index < 2 ? 558 : 632;
      this.addCommand(x, y, member.name, `HP ${member.combat.hp}/${member.combat.maxHp}`, () => void this.switchTo(member));
    });
    this.addCommand(candidates.length % 2 === 0 ? 756 : 1008, candidates.length < 2 ? 558 : 632, '돌아가기', '기본 명령으로', () => this.showMainCommands());
  }

  private async switchTo(member: HazardEntity): Promise<void> {
    this.activePartyIndex = this.party.indexOf(member);
    this.logLines.push(`${member.name}으로 교체했습니다.`);
    await this.reloadBattleVisuals();
    this.renderStatus();
    this.resolveEnemyTurn();
  }

  private useSkill(skill: BattleSkill): void {
    const ally = this.activeAlly;
    const enemy = this.activeEnemy;
    if (!ally || !enemy) return;
    if (skill.power === 0) {
      this.defending = true;
      this.logLines.push(`${ally.name}이(가) 웅크려 반격에 대비합니다.`);
    } else {
      const supportBonus = gameState.getCombatSupportBonus(ally.id);
      const damage = Math.max(1, Math.round((ally.combat.attack + supportBonus) * skill.power - enemy.combat.defense));
      enemy.combat.hp = Math.max(0, enemy.combat.hp - damage);
      this.allyVisual?.play('roar');
      this.enemyVisual?.play('hit');
      this.logLines.push(`${ally.name}의 ${skill.name}! ${damage} 피해를 주었습니다.`);
      // 태그전에서는 두 번째 아군도 같은 기술 계열의 지원 공격을 두 번째 적에게 가한다.
      if (gameState.nightPlan?.tagTeam) {
        const supportAlly = this.party[this.activePartyIndex + 1];
        const supportEnemy = this.enemies[this.activeEnemyIndex + 1];
        if (supportAlly && supportEnemy && supportAlly.combat.hp > 0 && supportEnemy.combat.hp > 0) {
          const supportPower = gameState.getCombatSupportBonus(supportAlly.id);
          const tagDamage = Math.max(1, Math.round((supportAlly.combat.attack + supportPower) * skill.power - supportEnemy.combat.defense));
          supportEnemy.combat.hp = Math.max(0, supportEnemy.combat.hp - tagDamage);
          this.logLines.push(`태그 지원: ${supportAlly.name}이(가) ${supportEnemy.name}에게 ${tagDamage} 피해.`);
          if (supportEnemy.combat.hp <= 0) this.promoteTagReplacement(this.enemies, this.activeEnemyIndex + 1);
        }
      }
    }
    this.afterPlayerAction(true);
  }

  private tryPersuade(): void {
    const enemy = this.activeEnemy;
    if (!enemy) return;
    if (enemy.combat.hp / enemy.combat.maxHp > 0.3) {
      this.logLines.push('대상의 신호가 너무 강합니다. HP를 30% 이하로 낮추십시오.');
      this.renderStatus();
      this.showMainCommands();
      return;
    }
    const result = attemptCapture({ entity: enemy, sedationLevel: 0.5 });
    if (result.success) {
      gameState.pendingCapture.push(enemy);
      enemy.combat.hp = 0;
      this.logLines.push(`회유 성공! ${enemy.name}을(를) 임시 보호합니다.`);
    } else {
      this.logLines.push(`회유에 실패했습니다. 성공 확률 ${Math.round(result.chance * 100)}%.`);
    }
    this.afterPlayerAction(false);
  }

  private useWakeUp(): void {
    const ally = this.activeAlly;
    if (!ally || this.wakeUpsRemaining <= 0) {
      this.logLines.push('사용 가능한 긴급 기상이 없습니다.');
      this.renderStatus();
      return;
    }
    this.wakeUpsRemaining -= 1;
    const healed = Math.round(ally.combat.maxHp * 0.3);
    ally.combat.hp = Math.min(ally.combat.maxHp, ally.combat.hp + healed);
    this.logLines.push(`손님을 긴급 기상시켜 ${ally.name}의 HP를 ${healed} 회복했습니다.`);
    this.renderStatus();
    this.showMainCommands();
  }

  private afterPlayerAction(returnToSkills: boolean): void {
    const enemy = this.activeEnemy;
    if (enemy && enemy.combat.hp <= 0) {
      this.logLines.push(`${enemy.name}의 신호가 소멸했습니다.`);
      this.activeEnemyIndex += 1;
      if (!this.activeEnemy) {
        this.endCombat(true);
        return;
      }
      void this.reloadBattleVisuals().then(() => {
        this.renderStatus();
        returnToSkills ? this.showSkills() : this.showMainCommands();
      });
      return;
    }
    this.resolveEnemyTurn(returnToSkills);
  }

  private resolveEnemyTurn(returnToSkills = false): void {
    const enemy = this.activeEnemy;
    const ally = this.activeAlly;
    if (!enemy || !ally) return;
    const defense = this.defending ? ally.combat.defense * 1.7 : ally.combat.defense;
    const damage = Math.max(1, Math.round(enemy.combat.attack - defense));
    ally.combat.hp = Math.max(0, ally.combat.hp - damage);
    this.enemyVisual?.play('roar');
    this.allyVisual?.play('hit');
    this.logLines.push(`${enemy.name}의 반격! ${ally.name}이(가) ${damage} 피해를 받았습니다.`);
    this.defending = false;

    // 2대2 태그전의 두 번째 적도 두 번째 아군에게 같은 턴에 행동한다.
    if (gameState.nightPlan?.tagTeam) {
      const supportEnemy = this.enemies[this.activeEnemyIndex + 1];
      const supportAlly = this.party[this.activePartyIndex + 1];
      if (supportEnemy && supportAlly && supportEnemy.combat.hp > 0 && supportAlly.combat.hp > 0) {
        const tagDamage = Math.max(1, Math.round(supportEnemy.combat.attack - supportAlly.combat.defense));
        supportAlly.combat.hp = Math.max(0, supportAlly.combat.hp - tagDamage);
        this.logLines.push(`태그 전선: ${supportEnemy.name} → ${supportAlly.name} ${tagDamage} 피해.`);
        if (supportAlly.combat.hp <= 0) this.promoteTagReplacement(this.party, this.activePartyIndex + 1);
      }
    }

    if (ally.combat.hp <= 0) {
      const next = this.party.findIndex((member) => member.combat.hp > 0);
      if (next < 0) {
        this.endCombat(false);
        return;
      }
      this.activePartyIndex = next;
      void this.reloadBattleVisuals().then(() => {
        this.renderStatus();
        this.showMainCommands();
      });
      return;
    }
    this.renderStatus();
    // 공격을 골랐던 턴은 기술 패널을 유지해 공격 메뉴를 매번 다시 열지 않게 한다.
    returnToSkills ? this.showSkills() : this.showMainCommands();
  }

  /** 태그 슬롯이 쓰러지면 뒤 편성의 첫 생존 개체를 같은 슬롯으로 당겨 빈 전선을 메운다. */
  private promoteTagReplacement(side: HazardEntity[], slotIndex: number): void {
    const replacementIndex = side.findIndex((entity, index) => index > slotIndex && entity.combat.hp > 0);
    if (replacementIndex < 0) return;
    [side[slotIndex], side[replacementIndex]] = [side[replacementIndex], side[slotIndex]];
    this.logLines.push(`${side[slotIndex].name}이(가) 빈 태그 슬롯에 진입했습니다.`);
  }

  private endCombat(victory: boolean): void {
    this.clearCommands();
    if (victory) {
      const expGain = this.enemies.reduce((sum, enemy) => sum + enemy.threatTier * 10, 0);
      this.party.filter((member) => member.combat.hp > 0).forEach((member) => grantExperience(member, expGain));
      this.logLines.push('모든 적대 신호를 제압했습니다.');
    } else {
      this.logLines.push('구금 개체가 전투 불능입니다. 강제 복귀합니다.');
    }
    this.renderStatus();
    // 한 번의 승리로 날짜를 강제 종료하지 않고 보상을 정산한 뒤 추가 손님 여부를 고른다.
    makeButton(this, 1004, 650, victory ? 'PORT 정산 · 접수로 →' : '접수로 복귀 →', () => {
      if (victory) gameState.settleGuestService();
      else gameState.goToGuestSelection();
      this.scene.start('guests');
    }, { fontSize: '14px', padding: { x: 15, y: 9 } });
  }
}
