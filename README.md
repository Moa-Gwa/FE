
  가톨릭대학교 학내 공지와 일정을 확인할 수 있는 Next.js 웹 애플리케이션

  ## 주요 화면

  ### 학생

  - 홈
  - 공지 탐색
  - 공지 상세
  - 일정
  - 관심 학과
  - 알림 설정
  - 마이페이지

  ### 관리자

  - 관리자 대시보드
  - 공지 등록·수정·삭제
  - 일정 관리
  - 기관 관리

  ## 기술 스택

  - Next.js
  - React
  - TypeScript
  - Tailwind CSS
  - Firebase Authentication
  - Firebase Cloud Messaging

  ## 로컬 실행

  ```bash
  npm install
  npm run dev

  주소: http://localhost:3000

  ### 구글 로그인 로컬 실행(HTTPS)

  구글 로그인은 리디렉션 방식이라 `authDomain`을 앱 주소로 두고 HTTPS로 실행해야 함.
  Firebase가 인증 화면을 항상 `https://{authDomain}/__/auth/...`로 불러오고, 이 경로는 `next.config.ts`에서 Firebase 인증 서버로 프록시됨.

  1. `.env.local` 설정
     - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=localhost:3000`
     - `NEXT_PUBLIC_API_BASE_URL=` (빈 값. HTTPS 화면에서 http 백엔드를 직접 호출하면 브라우저가 차단하므로 `/api` 프록시 사용)
  2. `npm run dev:https` 실행 후 https://localhost:3000 접속
     - 처음 실행 시 로컬 인증서를 `certificates/`에 생성하고 키체인 신뢰 등록을 요청함(Mac 비밀번호 입력). 인증서는 git 제외 대상
     - Safari는 신뢰 등록 후 재실행 필요
  3. 백엔드는 `local` 프로필에서 `https://localhost:3000` 출처를 허용함

  콘솔 설정(최초 1회)
  - Firebase 콘솔 > Authentication > 설정 > 승인된 도메인에 `localhost` 포함 확인(없으면 `auth/unauthorized-domain` 오류)
  - Google Cloud 콘솔 OAuth 클라이언트의 승인된 리디렉션 URI에 `https://localhost:3000/__/auth/handler` 등록
  - 운영 도메인도 같은 방식으로 승인된 도메인, `authDomain`, 리디렉션 URI 등록

  `authDomain`을 `*.firebaseapp.com`으로 두면 Safari 등 다른 도메인 저장소를 차단하는 브라우저에서 인증 결과를 받지 못해 로그인이 실패함.

  ## 환경변수

  `.env.local`에 작성(git 제외 대상). 값은 팀 내부 공유

  NEXT_PUBLIC_API_BASE_URL=http://localhost:8080   # HTTPS 실행 시 빈 값

  NEXT_PUBLIC_FIREBASE_API_KEY=
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=   # 구글 로그인: 로컬은 localhost:3000(HTTPS 실행 필요)
  NEXT_PUBLIC_FIREBASE_PROJECT_ID=
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
  NEXT_PUBLIC_FIREBASE_APP_ID=
  NEXT_PUBLIC_FIREBASE_VAPID_KEY=

  NEXT_PUBLIC_KAKAO_CLIENT_ID=

  NEXT_PUBLIC_TOSS_CLIENT_KEY=   # 토스페이먼츠 결제위젯 클라이언트 키(test_gck_/live_gck_)

  운영 값은 GitHub 저장소 Variables(Settings → Secrets and variables → Actions → Variables)에서 관리. `NEXT_PUBLIC_*`는 빌드할 때 번들에 들어가므로 값을 바꾸면 `main`에 새 커밋이 들어가 이미지를 다시 빌드해야 운영에 반영됨. 운영 `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`은 서비스 도메인(`moagwa.zruor.cc`)

  ## 로그인

  - Google 로그인: Firebase Authentication 사용
  - Kakao 로그인: Kakao OAuth 사용
  - 백엔드는 로그인 결과를 자체 JWT 세션으로 변환

  ## 백엔드 연결

  기본 API 주소: http://localhost:8080

  변경하려면 다음 환경변수를 설정

  NEXT_PUBLIC_API_BASE_URL=https://api.example.com

  ## 개발 명령어

  npm run dev
  npm run lint
  npm run build

  ## 주요 구현

  - 공지 목록 및 상세 조회
  - 공지 검색 및 필터링
  - Google / Kakao 로그인
  - 관심 학과 설정
  - 실시간 공지 갱신
  - 웹 푸시 알림
  - 모바일 반응형 화면

## 학교 공지 썸네일·첨부파일

피드/목록 카드는 BE의 기존 `thumbnail` 값이 있으면 학교 공지에도 이미지를 표시한다.
간략 카드에도 동일하게 적용하며, 이미지가 없거나 불러오기에 실패하면 썸네일 영역을 표시하지 않는다.
학교 공지 상세는 BE #68의 `attachments: [{ fileName, url }]`를 사용한다.
파일명·확장자 아이콘과 원문 다운로드 링크를 보여 주며, HTTP(S) 원문 사이트를 새 창으로 연다.
타 사이트의 파일이므로 `download` 속성을 강제하지 않고 실제 다운로드 방식은 원문 서버를 따른다.
이전 서버에서 attachments가 생략되거나 null/빈 배열이면 첨부파일 영역을 숨긴다.
실제 학교 데이터 표시는 BE 미디어 수집 및 기존 공지 보완 수집이 완료되어야 한다.

미디어 표시 및 다운로드 URL 검증 테스트(Node 22.18+/24):
```bash
node --test tests/attachments.test.mjs tests/notice-media.test.cjs
```

## 공지 이미지 확대와 사진 설명

학생 공지와 작성 미리보기에서 사진을 누르면 전체 화면 뷰어가 열린다.
슬라이드·세로 나열·이전 공지의 이미지와 학교 공지 HTML 본문 사진을 지원한다. 사진 그룹 안에서 좌우로 넘길 수 있다.
확대/축소 버튼(100~400%), 더블클릭, 두 손가락 확대, 확대 후 드래그 이동을 지원한다.
Esc/닫기 버튼으로 나가면 페이지 스크롤과 사진 버튼 초점을 복원한다.

작성 시 각 사진에 선택 설명(최대 300자)을 입력할 수 있고, 순서 변경·삭제 시 설명도 같이 이동한다.
블록 응답의 기존 `images` 배열을 유지하며 같은 순서의 선택 `captions` 배열을 사용한다.
설명이 없는 기존 블록도 호환한다. 글 블록은 일반 텍스트로 유지하고 관련 URL은 기존 관련 링크를 사용한다.

```json
{"type":"IMAGES","layout":"CAROUSEL","images":["/uploads/photo.jpg"],"captions":["행사 장소 안내"]}
```

브라우저 검증: `npx playwright install chromium` 후 `npm run test:e2e`.
테스트는 별도 3100 포트와 `.next-e2e` 출력 폴더에서 가짜 공지 응답을 사용하며 실제 DB를 변경하지 않는다.
