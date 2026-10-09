// 웹 서비스 워커용 Firebase SDK 로드 (npm의 firebase 버전과 맞출 것)
importScripts('https://www.gstatic.com/firebasejs/13.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/13.0.0/firebase-messaging-compat.js');

// 새 버전이 배포되면 대기하지 않고 바로 교체한다 (열린 탭이 예전 버전에 묶여 알림이 안 뜨는 문제 방지).
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

// 서비스 워커는 환경변수를 읽을 수 없어 값을 직접 넣는다 (Firebase 웹 설정값은 공개되어도 되는 값)
firebase.initializeApp({
  apiKey: "AIzaSyC0v_5NBjbCJvSPcu_wP7K2BXT9m5qM1bU",
  authDomain: "moa-gwa.firebaseapp.com",
  projectId: "moa-gwa",
  messagingSenderId: "565770375654",
  appId: "1:565770375654:web:0ad35ff0f72da0e95c8627"
});

const messaging = firebase.messaging();

// 서버는 data 전용 메시지({ title, body, url })를 보낸다. 표시 방식은 여기서 정한다.
// (notification 필드가 있는 메시지는 SDK가 알림을 자동으로 띄워 중복되므로 쓰지 않는다.)
messaging.onBackgroundMessage((payload) => {
  const data = payload.data || {};
  const title = data.title || payload.notification?.title;
  if (!title) return;

  self.registration.showNotification(title, {
    body: data.body || payload.notification?.body || '',
    icon: '/moa-gwa-logo.png',
    data: { url: data.url || '/' }
  });
});

// 알림을 누르면 해당 공지로 이동한다. 이미 열린 탭이 있으면 그 탭을 쓴다.
self.addEventListener('notificationclick', (event) => {
  const url = new URL(event.notification.data?.url || '/', self.location.origin).href;
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const open = clients.find((c) => new URL(c.url).origin === self.location.origin);
      if (open) return open.focus().then((c) => ('navigate' in c ? c.navigate(url) : c));
      return self.clients.openWindow(url);
    })
  );
});
