// PDF 기획 논문의 핵심 방향(진화형 AI, 탑뷰 전투, 자연 지형)을 코드에서 추적하기 위한 상수입니다.
export const DESIGN_PILLARS = {
  // 실험 단계에서는 외부 에셋보다 코드 기반 프록시 모델을 사용해 배포 안정성을 우선합니다.
  proxyAssets: true,
  // 듀랑고풍 탑뷰 감각을 위해 위에서 내려다보되 카메라를 살짝 기울입니다.
  tiltedTopView: true,
  // 이후 유전자/행동 트리로 확장 가능한 랩터 상태값을 분리해 둡니다.
  evolutionaryAiReady: true,
} as const;
