export type InstallPromptEvent = Event & { prompt: () => Promise<void> };

// 로그인 화면처럼 설치 안내가 없는 화면에서 발생한 이벤트도 쓰도록 앱 로드 시점부터 보관
let pending: InstallPromptEvent | null = null;
if (typeof window !== "undefined") {
  addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    pending = e as InstallPromptEvent;
  });
}

export const pendingInstallPrompt = () => pending;

/** 설치 이벤트는 한 번만 쓸 수 있음 */
export const clearInstallPrompt = () => {
  pending = null;
};
