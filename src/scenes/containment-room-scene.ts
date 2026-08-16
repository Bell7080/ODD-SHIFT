// 메인 연구소 관리 보드. 각 방을 하나의 격자 타일로 보고, 위험체는 왼쪽에 배치하며
// 오른쪽 직원 슬롯은 후속 직원 배치 시스템을 위해 비워 둔다.
import Phaser from 'phaser';
import { gameState } from '../state/game-state';
import type { HazardEntity } from '../data/types';
import { loadCreatureVisual } from '../systems/puppet-loader';
import { makeButton, makeText } from '../ui/text';

const RETURN_SCENE = 'noon';
const TILE_WIDTH = 380;
const TILE_HEIGHT = 242;

export class ContainmentRoomScene extends Phaser.Scene {
  constructor() {
    super('containment-room');
  }

  async create(): Promise<void> {
    this.cameras.main.setBackgroundColor('#07080d');
    this.drawLabFrame();

    const facility = gameState.facilities[0];
    const occupants = facility
      ? gameState.roster.filter((entity) => facility.occupantIds.includes(entity.id))
      : [];

    // 실제 구금 타일은 상태의 입주자와 연결하고, 나머지는 효과가 미확정인 계획 타일이다.
    await this.drawContainmentTile(44, 128, occupants[0], facility?.name ?? '구금실');
    this.drawPlannedTile(450, 128, 'COMBAT MODULE', '전투 강화실', '기능 설계 예정');
    this.drawPlannedTile(856, 128, 'STAFF MODULE', '직원 휴게실', '기능 설계 예정');
    this.drawPlannedTile(44, 396, 'RESOURCE MODULE', '자원 보조실', '기능 설계 예정');
    this.drawPlannedTile(450, 396, 'EMPTY CELL', '미지정 구역', '시설 확장 슬롯');
    this.drawPlannedTile(856, 396, 'EMPTY CELL', '미지정 구역', '시설 확장 슬롯');
  }

  private drawLabFrame(): void {
    makeText(this, 44, 34, 'ODD SHIFT  /  MAIN LABORATORY', 'accent', { fontSize: '13px', color: '#43d7cf' });
    makeText(this, 44, 58, '구금 연구동 · 격자 관제도', 'heading', { fontSize: '24px', color: '#f2e9ff' });
    makeText(this, 44, 94, '각 타일은 독립된 시설입니다. 위험체 좌측 / 담당 직원 우측', 'body', {
      fontSize: '12px',
      color: '#827792',
    });
    makeButton(this, 1130, 42, '나가기  →', () => this.scene.start(RETURN_SCENE), {
      fontSize: '13px',
      padding: { x: 12, y: 7 },
    });
  }

  private async drawContainmentTile(x: number, y: number, entity: HazardEntity | undefined, roomName: string): Promise<void> {
    this.add.rectangle(x, y, TILE_WIDTH, TILE_HEIGHT, 0x030408, 0.76)
      .setOrigin(0, 0)
      .setStrokeStyle(2, 0x43d7cf, 0.72);
    this.add.rectangle(x, y, TILE_WIDTH, 34, 0x111521, 0.96).setOrigin(0, 0);
    makeText(this, x + 14, y + 9, `C-01  ${roomName}`, 'accent', { fontSize: '11px', color: '#43d7cf' });
    this.add.line(x + 246, y + 45, 0, 0, 0, 184, 0x64517c, 0.52).setOrigin(0, 0);

    if (!entity) {
      makeText(this, x + 123, y + 128, '구금 개체 없음', 'body', { fontSize: '14px', color: '#746c7e' }).setOrigin(0.5);
    } else {
      const visual = await loadCreatureVisual(this, entity, x + 72, y + 182);
      visual.setScale(0.13);
      visual.play('idle');
      makeText(this, x + 16, y + 46, entity.name, 'heading', {
        fontSize: '13px', color: '#f2e9ff', wordWrap: { width: 215 },
      });
      const dreamPercent = Phaser.Math.Clamp(Math.round(entity.combat.mentality), 0, 100);
      makeText(this, x + 126, y + 92,
        `위험도  ${'◆'.repeat(entity.threatTier)}\n악몽유형  ${entity.attribute}\nLEVEL  ${entity.level}\n몽환도  ${dreamPercent}%`,
        'body', { fontSize: '11px', color: '#bdb0d2', lineSpacing: 6 });
      this.add.rectangle(x + 126, y + 192, 100, 5, 0x211b2b, 1).setOrigin(0, 0);
      this.add.rectangle(x + 126, y + 192, dreamPercent, 5, 0x9c72d7, 1).setOrigin(0, 0);
    }

    makeText(this, x + 263, y + 54, 'STAFF', 'accent', { fontSize: '10px', color: '#8d68c7' });
    this.add.rectangle(x + 263, y + 78, 98, 116, 0x0c0a12, 0.8)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0x604977, 0.65);
    makeText(this, x + 312, y + 126, '+', 'heading', { fontSize: '26px', color: '#655678' }).setOrigin(0.5);
    makeText(this, x + 312, y + 161, '직원 배치 예정', 'body', { fontSize: '9px', color: '#665e71' }).setOrigin(0.5);
  }

  private drawPlannedTile(x: number, y: number, code: string, name: string, status: string): void {
    this.add.rectangle(x, y, TILE_WIDTH, TILE_HEIGHT, 0x09080e, 0.62)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0x51425f, 0.5);
    // 잠금 타일은 실제 효과가 구현된 것으로 오해하지 않도록 점선 대신 명시적 상태를 쓴다.
    makeText(this, x + 16, y + 14, code, 'accent', { fontSize: '10px', color: '#67587a' });
    makeText(this, x + TILE_WIDTH / 2, y + 102, name, 'heading', { fontSize: '17px', color: '#82758f' }).setOrigin(0.5);
    makeText(this, x + TILE_WIDTH / 2, y + 136, status, 'body', { fontSize: '11px', color: '#5f5867' }).setOrigin(0.5);
    makeText(this, x + TILE_WIDTH / 2, y + 174, '＋', 'heading', { fontSize: '20px', color: '#493f53' }).setOrigin(0.5);
  }
}
