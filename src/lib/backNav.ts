type Router = { back: () => void; replace: (href: string) => void };

// 앱 안 이동 순번을 history 항목에 저장함. 새로고침, 앞뒤 이동 후에도 항목별로 유지됨
let last = -1;

/** 화면 이동마다 호출. 처음 들어온 화면은 0 */
export function trackHistory() {
  const state = history.state ?? {};
  if (typeof state.moaIdx !== "number" || state.moaUrl !== location.href) {
    // router.replace도 새 항목으로 보이므로 실제 기록 수를 넘지 않게 제한함. 새 탭에서 열린 링크는 항상 0
    const idx = Math.min(last + 1, history.length - 1);
    // Next 내부 키(__NA)를 그대로 넘겨 라우터 재실행 없이 순번만 기록됨
    history.replaceState({ ...state, moaIdx: idx, moaUrl: location.href }, "");
  }
  last = history.state.moaIdx;
}

/** 앱 안 이전 화면이 있으면 뒤로, 공유 링크나 알림으로 바로 열린 화면이면 fallback으로 이동 */
export function goBack(router: Router, fallback = "/home") {
  const idx = history.state?.moaIdx;
  // 검색어만 바뀐 항목은 순번이 없으므로 앱 안 이동으로 봄
  const inApp = typeof idx === "number" ? idx > 0 : last >= 0;
  if (inApp) router.back();
  else router.replace(fallback);
}
