import { defineConfig } from "@playwright/test";

// 실제 BE(local 프로필)에 붙어 실행함. BE는 미리 띄워 두고 주소를 E2E_API_ORIGIN으로 알려 줌(e2e/README.md 참고)
const api = process.env.E2E_API_ORIGIN ?? "http://localhost:18080";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  fullyParallel: true,
  globalSetup: "./e2e/global-setup.ts",
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:3100",
    viewport: { width: 1280, height: 900 },
    trace: "retain-on-failure",
  },
  webServer: [
    {
      // 개발 서버와 겹치지 않도록 별도 포트·빌드 폴더를 쓰고, API는 E2E 전용 BE로 프록시
      command: "npm run dev -- --port 3100",
      url: "http://localhost:3100/login",
      reuseExistingServer: false,
      timeout: 120_000,
      env: { NEXT_DIST_DIR: ".next-e2e", NEXT_PUBLIC_API_BASE_URL: "", API_PROXY_TARGET: api },
    },
    {
      command: "node e2e/static-server.mjs",
      url: "http://localhost:3101/",
      reuseExistingServer: true,
    },
  ],
});
