import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  fullyParallel: true,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:3100",
    viewport: { width: 1280, height: 900 },
    trace: "retain-on-failure",
  },
  // 개발 서버와 겹치지 않도록 별도 포트·빌드 폴더를 쓰고, API는 테스트에서 가짜 응답으로 대신함
  webServer: {
    command: "npm run dev -- --port 3100",
    url: "http://localhost:3100/login",
    reuseExistingServer: false,
    timeout: 120_000,
    env: { NEXT_DIST_DIR: ".next-e2e", NEXT_PUBLIC_API_BASE_URL: "" },
  },
});
