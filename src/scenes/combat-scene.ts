// 선택한 손님의 꿈속에서 벌어지는 턴제 전투. 라운드마다 파티원이 순서대로 행동을 고르고,
// 모두 행동하면 적이 반격한다. "응급 각성"은 세계관상 손님을 직접 깨우는 행위다.
import Phaser from 'phaser';
import { gameState } from '../state/game-state';
import { attemptCapture } from '../systems/capture';
import { grantExperience } from '../systems/leveling';
import type { HazardEntity } from '../data/types';
import { drawHud } from '../ui/hud';

export class CombatScene extends Phaser.Scene {
  private party: HazardEntity[] = [];
  private enemies: HazardEntity[] = [];
  private wakeUpsRemaining = 0;
  private actionIndex = 0;
  private defendingThisRound = new Set<string>();
  private logLines: string[] = [];
  private logText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private actionNodes: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super('combat');
  }

  create(): void {
    this.party = gameState.roster.slice(0, 3);
    this.enemies = gameState.encounterQueue;
    this.wakeUpsRemaining = gameState.nightPlan?.wakeUps ?? 0;
    this.actionIndex = 0;
    this.defendingThisRound.clear();
    this.logLines = [`${gameState.selectedGuestLabel}의 꿈속으로 들어왔습니다.`, `${this.enemies.length}마리의 위험체가 나타났습니다.`];

    drawHud(this, gameState);
    this.statusText = this.add.text(24, 60, '', { fontSize: '13px', color: '#e8dcff', wordWrap: { width: 900 } });
    this.logText = this.add.text(24, 560, '', { fontSize: '12px', color: '#9683c4', wordWrap: { width: 1100 } });

    this.renderStatus();
    this.promptNextAction();
  }

  private aliveParty(): HazardEntity[] {
    return this.party.filter((entity) => entity.combat.hp > 0);
  }

  private aliveEnemies(): HazardEntity[] {
    return this.enemies.filter((entity) => entity.combat.hp > 0);
  }

  private renderStatus(): void {
    const partyLines = this.party
      .map((entity) => `${entity.name} HP ${Math.max(0, entity.combat.hp)}/${entity.combat.maxHp}`)
      .join('   ');
    const enemyLines = this.enemies
      .map((entity) => `${entity.name} HP ${Math.max(0, entity.combat.hp)}/${entity.combat.maxHp}`)
      .join('   ');
    this.statusText.setText(
      `아군\n${partyLines}\n\n적\n${enemyLines}\n\n남은 응급 각성: ${this.wakeUpsRemaining}회`,
    );
    this.logText.setText(this.logLines.slice(-6).join('\n'));
  }

  private clearActionNodes(): void {
    this.actionNodes.forEach((node) => node.destroy());
    this.actionNodes = [];
  }

  private makeButton(x: number, y: number, label: string, onClick: () => void): Phaser.GameObjects.Text {
    const button = this.add
      .text(x, y, label, {
        fontSize: '13px',
        color: '#0a0710',
        backgroundColor: '#c9b6ff',
        padding: { x: 8, y: 5 },
      })
      .setInteractive({ useHandCursor: true })
      .on('pointerup', onClick);
    this.actionNodes.push(button);
    return button;
  }

  private promptNextAction(): void {
    this.clearActionNodes();

    if (this.aliveParty().length === 0 || this.aliveEnemies().length === 0) {
      this.endCombat();
      return;
    }
    if (this.actionIndex >= this.party.length) {
      this.resolveEnemyTurn();
      return;
    }
    const actor = this.party[this.actionIndex];
    if (actor.combat.hp <= 0) {
      this.actionIndex += 1;
      this.promptNextAction();
      return;
    }

    const label = this.add.text(24, 320, `${actor.name}의 행동을 선택하세요`, {
      fontSize: '14px',
      color: '#f2e9ff',
    });
    this.actionNodes.push(label);

    this.makeButton(24, 350, '공격', () => this.playerAttack(actor));
    this.makeButton(120, 350, '방어', () => this.playerDefend(actor));

    const target = this.aliveEnemies().find((enemy) => enemy.combat.hp / enemy.combat.maxHp <= 0.3);
    if (target) {
      this.makeButton(220, 350, `구금 시도 → ${target.name}`, () => this.playerCapture(actor, target));
    }
    if (this.wakeUpsRemaining > 0) {
      this.makeButton(460, 350, `${gameState.selectedGuestLabel}을(를) 깨워 응급처치`, () => this.useWakeUp());
    }
  }

  private playerAttack(actor: HazardEntity): void {
    const alive = this.aliveEnemies();
    const target = alive[Math.floor(Math.random() * alive.length)];
    if (!target) return;
    const damage = Math.max(1, actor.combat.attack - target.combat.defense);
    target.combat.hp = Math.max(0, target.combat.hp - damage);
    this.logLines.push(`${actor.name}이(가) ${target.name}에게 ${damage} 피해를 입혔습니다.`);
    if (target.combat.hp === 0) this.logLines.push(`${target.name}이(가) 쓰러졌습니다.`);
    this.actionIndex += 1;
    this.renderStatus();
    this.promptNextAction();
  }

  private playerDefend(actor: HazardEntity): void {
    // 이번 라운드에 한해 피해를 줄인다. 다음 라운드로 넘어가면 초기화한다.
    this.defendingThisRound.add(actor.id);
    this.logLines.push(`${actor.name}이(가) 방어 태세를 취했습니다.`);
    this.actionIndex += 1;
    this.renderStatus();
    this.promptNextAction();
  }

  private playerCapture(actor: HazardEntity, target: HazardEntity): void {
    const result = attemptCapture({ entity: target, sedationLevel: 0.5 });
    if (result.success) {
      this.logLines.push(
        `${actor.name}이(가) ${target.name} 구금에 성공했습니다! (확률 ${Math.round(result.chance * 100)}%)`,
      );
      target.combat.hp = 0;
      gameState.pendingCapture.push(target);
    } else {
      this.logLines.push(`${actor.name}의 구금 시도가 실패했습니다. (확률 ${Math.round(result.chance * 100)}%)`);
    }
    this.actionIndex += 1;
    this.renderStatus();
    this.promptNextAction();
  }

  private useWakeUp(): void {
    this.wakeUpsRemaining -= 1;
    const weakest = [...this.aliveParty()].sort(
      (a, b) => a.combat.hp / a.combat.maxHp - b.combat.hp / b.combat.maxHp,
    )[0];
    if (weakest) {
      const healed = Math.round(weakest.combat.maxHp * 0.3);
      weakest.combat.hp = Math.min(weakest.combat.maxHp, weakest.combat.hp + healed);
      this.logLines.push(
        `${gameState.selectedGuestLabel}을(를) 깨워 잠깐 개입했습니다. ${weakest.name}이(가) ${healed} 회복했습니다.`,
      );
    }
    this.renderStatus();
    this.promptNextAction();
  }

  private resolveEnemyTurn(): void {
    this.aliveEnemies().forEach((enemy) => {
      const alive = this.aliveParty();
      if (alive.length === 0) return;
      const target = alive[Math.floor(Math.random() * alive.length)];
      const isDefending = this.defendingThisRound.has(target.id);
      const effectiveDefense = isDefending ? target.combat.defense * 1.5 : target.combat.defense;
      const damage = Math.max(1, Math.round(enemy.combat.attack - effectiveDefense));
      target.combat.hp = Math.max(0, target.combat.hp - damage);
      this.logLines.push(`${enemy.name}이(가) ${target.name}에게 ${damage} 피해를 입혔습니다.`);
    });
    this.defendingThisRound.clear();
    this.actionIndex = 0;
    this.renderStatus();
    this.promptNextAction();
  }

  private endCombat(): void {
    this.clearActionNodes();
    const victory = this.aliveEnemies().length === 0;
    if (victory) {
      const expGain = this.enemies.reduce((sum, enemy) => sum + enemy.threatTier * 10, 0);
      this.aliveParty().forEach((entity) => grantExperience(entity, expGain));
      this.logLines.push('전투에서 승리했습니다.');
    } else {
      this.logLines.push('파티가 전멸했습니다. 부상자를 수습해 복귀합니다.');
    }
    this.renderStatus();

    this.add
      .text(24, 400, '아침으로 돌아가기 →', {
        fontSize: '16px',
        color: '#0a0710',
        backgroundColor: '#9b7ee8',
        padding: { x: 16, y: 10 },
      })
      .setInteractive({ useHandCursor: true })
      .on('pointerup', () => {
        // 전투 후 최소 절반까지는 자연 회복시켜, 다음 밤 전멸이 그대로 반복되지 않게 한다.
        this.party.forEach((entity) => {
          entity.combat.hp = Math.max(entity.combat.hp, Math.round(entity.combat.maxHp * 0.5));
        });
        gameState.goToNextMorning();
        this.scene.start('morning');
      });
  }
}
