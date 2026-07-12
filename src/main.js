// Project Plateau 프로토타입: 외부 엔진 없이 Canvas 2D로 탑뷰 3D 느낌을 구현해 빌드 안정성을 확보합니다.
const canvas = document.querySelector('[data-scene-canvas]');
const ctx = canvas.getContext('2d');
const uiState = { zoom: 1, angle: 0, dragging: false, lastX: 0 };

// 기획서 기반 오브젝트 목록입니다. 추후 실제 AI/에셋 로더가 들어오면 이 데이터를 교체하면 됩니다.
const entities = [
  { kind: 'player', x: 0, z: 0, radius: 18, color: '#8dffba', label: 'PLAYER' },
  { kind: 'dino', x: -135, z: -82, radius: 28, color: '#a8d36f', label: 'RAPTOR A' },
  { kind: 'dino', x: 142, z: -36, radius: 30, color: '#d0a35f', label: 'RAPTOR B' },
  { kind: 'dino', x: 72, z: 128, radius: 26, color: '#8fcf83', label: 'SCOUT' },
];

// 절차적 바위 배치는 외부 배경 에셋 없이도 전투 동선과 엄폐물을 확인하게 해 줍니다.
const rocks = Array.from({ length: 28 }, (_, index) => ({
  x: Math.cos(index * 1.7) * (120 + (index % 5) * 46),
  z: Math.sin(index * 1.3) * (110 + (index % 4) * 52),
  size: 10 + (index % 4) * 5,
}));

// 캔버스 해상도를 CSS 크기와 DPR에 맞춰 선명하게 유지합니다.
function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(rect.width * dpr);
  canvas.height = Math.floor(rect.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

// 월드 좌표를 탑뷰 카메라 좌표로 변환합니다.
function project(x, z) {
  const cos = Math.cos(uiState.angle);
  const sin = Math.sin(uiState.angle);
  return {
    x: canvas.clientWidth / 2 + (x * cos - z * sin) * uiState.zoom,
    y: canvas.clientHeight / 2 + (x * sin + z * cos) * uiState.zoom * 0.72,
  };
}

// 3D 느낌을 위한 그림자 타원과 높이 오프셋을 함께 그립니다.
function drawRaisedCircle(x, y, radius, color, label, pulse) {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
  ctx.beginPath();
  ctx.ellipse(x, y + radius * 0.55, radius * 1.15, radius * 0.36, 0, 0, Math.PI * 2);
  ctx.fill();

  const bodyGradient = ctx.createRadialGradient(x - radius * 0.35, y - radius * 0.45, radius * 0.1, x, y, radius * 1.2);
  bodyGradient.addColorStop(0, '#ffffff');
  bodyGradient.addColorStop(0.18, color);
  bodyGradient.addColorStop(1, '#243821');
  ctx.fillStyle = bodyGradient;
  ctx.beginPath();
  ctx.arc(x, y - 8 - pulse, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(255, 247, 216, 0.86)';
  ctx.font = '700 11px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, x, y + radius + 18);
}

// 공룡은 꼬리와 머리 방향을 추가해 무료 모델 적용 전에도 역할을 알아볼 수 있게 합니다.
function drawDinosaur(entity, time) {
  const point = project(entity.x, entity.z);
  const pulse = Math.sin(time / 420 + entity.x) * 2;
  drawRaisedCircle(point.x, point.y, entity.radius, entity.color, entity.label, pulse);

  ctx.strokeStyle = '#5f8b43';
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(point.x + entity.radius * 0.45, point.y - 4);
  ctx.lineTo(point.x + entity.radius * 1.15, point.y + 12);
  ctx.stroke();

  ctx.fillStyle = '#f4d06f';
  ctx.beginPath();
  ctx.arc(point.x - entity.radius * 0.45, point.y - entity.radius * 0.65, 5, 0, Math.PI * 2);
  ctx.fill();
}

// 플레이어는 밝은 실루엣과 방향 마커로 전투 중심을 빠르게 파악하게 합니다.
function drawPlayer(entity, time) {
  const point = project(entity.x, entity.z);
  const pulse = Math.sin(time / 260) * 3;
  drawRaisedCircle(point.x, point.y, entity.radius, entity.color, entity.label, pulse);

  ctx.fillStyle = '#eafff7';
  ctx.beginPath();
  ctx.moveTo(point.x, point.y - entity.radius - 20);
  ctx.lineTo(point.x - 9, point.y - entity.radius - 2);
  ctx.lineTo(point.x + 9, point.y - entity.radius - 2);
  ctx.closePath();
  ctx.fill();
}

// 메인 렌더 루프는 지형, 엄폐물, 헌팅 링, 엔티티를 순서대로 그립니다.
function render(time = 0) {
  ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);

  const terrainGradient = ctx.createRadialGradient(canvas.clientWidth / 2, canvas.clientHeight / 2, 20, canvas.clientWidth / 2, canvas.clientHeight / 2, canvas.clientWidth * 0.65);
  terrainGradient.addColorStop(0, '#42633f');
  terrainGradient.addColorStop(1, '#132019');
  ctx.fillStyle = terrainGradient;
  ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);

  const ring = project(0, 0);
  ctx.strokeStyle = 'rgba(244, 208, 111, 0.72)';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.ellipse(ring.x, ring.y, 116 * uiState.zoom, 84 * uiState.zoom, 0, 0, Math.PI * 2);
  ctx.stroke();

  rocks.forEach((rock) => {
    const point = project(rock.x, rock.z);
    ctx.fillStyle = rock.size % 2 ? '#6f765d' : '#7d6f56';
    ctx.beginPath();
    ctx.ellipse(point.x, point.y, rock.size * uiState.zoom, rock.size * 0.65 * uiState.zoom, 0.4, 0, Math.PI * 2);
    ctx.fill();
  });

  entities.forEach((entity) => (entity.kind === 'player' ? drawPlayer(entity, time) : drawDinosaur(entity, time)));
  requestAnimationFrame(render);
}

// 마우스 드래그와 휠 입력은 웹빌더 미리보기에서도 별도 권한 없이 동작합니다.
canvas.addEventListener('pointerdown', (event) => {
  uiState.dragging = true;
  uiState.lastX = event.clientX;
  canvas.setPointerCapture(event.pointerId);
});
canvas.addEventListener('pointermove', (event) => {
  if (!uiState.dragging) return;
  uiState.angle += (event.clientX - uiState.lastX) * 0.006;
  uiState.lastX = event.clientX;
});
canvas.addEventListener('pointerup', () => { uiState.dragging = false; });
canvas.addEventListener('wheel', (event) => {
  event.preventDefault();
  uiState.zoom = Math.max(0.65, Math.min(1.55, uiState.zoom - event.deltaY * 0.001));
}, { passive: false });

window.addEventListener('resize', resizeCanvas);
resizeCanvas();
render();
