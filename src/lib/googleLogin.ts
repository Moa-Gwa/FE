import { FirebaseError } from "firebase/app";
import { getAuth, getRedirectResult, GoogleAuthProvider, signInWithRedirect, signOut } from "firebase/auth";
import { getFirebaseApp } from "@/lib/firebase";
import { api } from "@/lib/api";

const PENDING_KEY = "moagwa.googleRedirect";
export type GoogleSession = { nickname: string; onboarded: boolean; verified: boolean };
let completion: Promise<GoogleSession | null> | undefined;

function loginError(error: unknown): Error {
  if (error instanceof FirebaseError) {
    console.error("[Google login] Firebase failed", { code: error.code });
    return new Error(`구글 로그인에 실패했어요. (${error.code})`);
  }
  return error instanceof Error ? error : new Error("구글 로그인에 실패했어요.");
}

export async function startGoogleLogin(): Promise<void> {
  sessionStorage.setItem(PENDING_KEY, "1");
  completion = undefined;
  try {
    await signInWithRedirect(getAuth(getFirebaseApp()), new GoogleAuthProvider());
  } catch (error) {
    sessionStorage.removeItem(PENDING_KEY);
    throw loginError(error);
  }
}

/** 같은 페이지의 Effect 재실행에도 인증 결과와 백엔드 세션은 한 번만 처리한다. */
export function completeGoogleLogin(): Promise<GoogleSession | null> {
  if (completion) return completion;
  completion = (async () => {
    const pending = sessionStorage.getItem(PENDING_KEY) === "1";
    const auth = getAuth(getFirebaseApp());
    try {
      const result = await getRedirectResult(auth);
      await auth.authStateReady();
      const user = result?.user ?? (pending && auth.currentUser?.providerData.some((p) => p.providerId === "google.com") ? auth.currentUser : null);
      if (!user) {
        if (pending) throw new Error("구글 인증 결과를 받지 못했어요. 다시 로그인해 주세요.");
        return null;
      }
      const idToken = await user.getIdToken();
      return await api<GoogleSession>("/auth/google", { method: "POST", auth: false, body: { idToken } });
    } catch (error) {
      throw loginError(error);
    } finally {
      sessionStorage.removeItem(PENDING_KEY);
      if (pending || auth.currentUser) await signOut(auth).catch(() => {});
    }
  })();
  return completion;
}

/** 전용 인증 페이지에서만 시작/복귀를 구분한다. */
export async function runGoogleLogin(): Promise<GoogleSession | null> {
  if (sessionStorage.getItem(PENDING_KEY)) return completeGoogleLogin();
  await startGoogleLogin();
  return null;
}
