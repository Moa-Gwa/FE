/** 실패한 입력·버튼 바로 옆에 보이는 오류 문구. 오류가 없으면 아무것도 그리지 않는다. */
export default function InlineError({ error, className = "" }: { error: unknown; className?: string }) {
  const message = errorMessage(error);
  if (!message) return null;
  return (
    <p className={`inline-error ${className}`} role="alert">
      {message}
    </p>
  );
}

export function errorMessage(error: unknown): string | null {
  if (!error) return null;
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  return "문제가 생겼어요. 잠시 후 다시 시도해 주세요.";
}

type Attempt = { error: Error | null; submittedAt: number };

/** 같은 자리에 오류를 하나만 보여 줄 때, 가장 최근에 실패한 요청의 오류 */
export function latestError(...attempts: Attempt[]): Error | null {
  return attempts.filter((a) => a.error).sort((a, b) => b.submittedAt - a.submittedAt)[0]?.error ?? null;
}
