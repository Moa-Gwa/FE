# E2E 테스트

Playwright로 FE 개발 서버를 띄우고, **실제 BE(local 프로필)와 Postgres**에 붙어 실행함.
가짜 API 응답은 쓰지 않음. 실제 BE로 만들 수 없는 실패 상황(저장 500, 이미지 404)만 해당 요청 하나를 가로챔.

## 구성

| 파일 | 역할 |
|---|---|
| `global-setup.ts` | 테스트 전 실제 API로 공유 데이터 준비(공지·이미지·거래·채팅·신청 등). 작성 API가 없는 크롤링 공지만 SQL로 넣음. 만든 id는 `e2e/.seed.json`에 저장 |
| `support.ts` | 실제 로그인(`dev-student`, 개발용 관리자 계정)과 API 호출 헬퍼 |
| `static/` | BE가 수집할 학사일정 고정 페이지, 업로드용 이미지. `static-server.mjs`가 3101 포트로 제공 |
| `scenarios.spec.ts` | 온보딩 → 탐색 → 저장 → 일정, 관리자 게시 → 학생 화면 실시간 반영, 버그 회귀 테스트 |

데이터를 바꾸는 테스트는 테스트마다 새 학생을 만들어 서로 영향을 주지 않음. DB를 비우지 않고 여러 번 실행해도 됨.

## 로컬 실행

평소 쓰는 BE(8080)·DB(`moagwa`)와 겹치지 않도록 E2E 전용 DB와 BE(18080)를 따로 띄움.

```bash
# 1. 전용 DB(최초 한 번)
psql -h localhost -U moagwa -d moagwa -c "CREATE DATABASE moagwa_e2e OWNER moagwa"

# 2. BE 저장소에서 E2E 전용 BE 실행
SPRING_PROFILES_ACTIVE=local SERVER_PORT=18080 \
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/moagwa_e2e \
UPLOAD_DIR=/tmp/moagwa-e2e-uploads \
ACADEMIC_CALENDAR_FETCH_URL='http://localhost:3101/academic-{year}.html' \
./mvnw spring-boot:run

# 3. FE 저장소에서 실행(FE 개발 서버와 정적 파일 서버는 자동으로 뜸)
npm run test:e2e
```

다른 주소를 쓰면 `E2E_API_ORIGIN`(BE), `E2E_DATABASE_URL`(Postgres)로 지정함.

## CI

`.github/workflows/ci.yml`의 `브라우저·반응형 검사`가 Postgres 서비스와 BE `develop` 이미지(`ghcr.io/moa-gwa/be:develop`)를 띄운 뒤 실행함.
