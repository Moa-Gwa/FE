import { getApp, getApps, initializeApp } from "firebase/app";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

/** Firebase 환경변수가 모두 채워져 있는지. 비어 있으면 푸시 기능을 끈다. */
export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.appId && VAPID_KEY);

/** 구글 로그인에 필요한 값(apiKey/authDomain/projectId)이 채워져 있는지. */
export const isFirebaseAuthConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId,
);

export function getFirebaseApp() {
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}
