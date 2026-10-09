import { FirebaseError } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { getFirebaseApp } from "@/lib/firebase";

/**
 * 구글 팝업 로그인 후 Firebase ID 토큰을 돌려준다. 이 토큰은 서버가 검증해 우리 세션으로 바꾼다.
 * 우리 서비스는 자체 JWT를 쓰므로 Firebase 쪽 로그인 상태는 남기지 않는다.
 */
export async function getGoogleIdToken(): Promise<string> {
  const auth = getAuth(getFirebaseApp());
  try {
    const { user } = await signInWithPopup(auth, new GoogleAuthProvider());
    return await user.getIdToken();
  } catch (e) {
    if (e instanceof FirebaseError) {
      if (e.code === "auth/popup-closed-by-user" || e.code === "auth/cancelled-popup-request") {
        throw new Error("로그인 창이 닫혔어요. 다시 시도해 주세요.");
      }
      if (e.code === "auth/popup-blocked") throw new Error("팝업이 차단되었어요. 팝업을 허용하고 다시 시도해 주세요.");
      if (e.code === "auth/unauthorized-domain") throw new Error("이 주소는 구글 로그인이 허용되지 않았어요.");
    }
    throw e;
  } finally {
    await signOut(auth).catch(() => {});
  }
}
