
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

  ## 환경변수

  NEXT_PUBLIC_API_BASE_URL=http://localhost:8080

  NEXT_PUBLIC_FIREBASE_API_KEY=
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
  NEXT_PUBLIC_FIREBASE_PROJECT_ID=
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
  NEXT_PUBLIC_FIREBASE_APP_ID=
  NEXT_PUBLIC_FIREBASE_VAPID_KEY=

  NEXT_PUBLIC_KAKAO_CLIENT_ID=

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
