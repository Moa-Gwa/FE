/** 토스페이먼츠 결제위젯 SDK v2. 결제 페이지에서만 스크립트를 불러옴 */
const SDK_URL = "https://js.tosspayments.com/v2/standard";

export const TOSS_CLIENT_KEY = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY ?? "";
/** 테스트 키(test_)면 실제 청구 없는 테스트 결제 */
export const TOSS_TEST_MODE = TOSS_CLIENT_KEY.startsWith("test_");

export interface TossWidgets {
  setAmount(amount: { currency: "KRW"; value: number }): Promise<void>;
  renderPaymentMethods(options: { selector: string; variantKey?: string }): Promise<unknown>;
  renderAgreement(options: { selector: string; variantKey?: string }): Promise<unknown>;
  requestPayment(request: { orderId: string; orderName: string; successUrl: string; failUrl: string }): Promise<void>;
}

interface TossPaymentsFn {
  (clientKey: string): { widgets(options: { customerKey: string }): TossWidgets };
  ANONYMOUS: string;
}

declare global {
  interface Window {
    TossPayments?: TossPaymentsFn;
  }
}

let loading: Promise<TossPaymentsFn> | undefined;

function loadSdk(): Promise<TossPaymentsFn> {
  loading ??= new Promise((resolve, reject) => {
    if (window.TossPayments) return resolve(window.TossPayments);
    const script = document.createElement("script");
    script.src = SDK_URL;
    script.onload = () => (window.TossPayments ? resolve(window.TossPayments) : reject(new Error("결제 모듈을 불러오지 못했어요.")));
    script.onerror = () => {
      loading = undefined;
      reject(new Error("결제 모듈을 불러오지 못했어요. 네트워크를 확인해 주세요."));
    };
    document.head.appendChild(script);
  });
  return loading;
}

/** 비회원 결제(ANONYMOUS)로 결제위젯 준비 */
export async function createWidgets(): Promise<TossWidgets> {
  const TossPayments = await loadSdk();
  return TossPayments(TOSS_CLIENT_KEY).widgets({ customerKey: TossPayments.ANONYMOUS });
}
