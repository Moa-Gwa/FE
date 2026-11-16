import { request, type APIRequestContext, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** E2E 전용 BE(local 프로필) 주소. 브라우저는 FE 개발 서버 프록시를 거쳐 같은 BE에 붙음 */
export const API = process.env.E2E_API_ORIGIN ?? 'http://localhost:18080';
export const ADMIN_PASSWORD = 'moagwa1234';
const SEED_FILE = join(__dirname, '.seed.json');

export type Seed = {
  categoryId: number;
  departmentId: number;
  organizationId: number;
  images: string[];
  notices: { wide: number; carousel: number; stack: number; single: number; legacy: number };
  crawled: number;
  viewer: string;
  item: number;
  group: number;
  chatRoom: number;
};

let cached: Seed | undefined;
export const seed = (): Seed => (cached ??= JSON.parse(readFileSync(SEED_FILE, 'utf8')));
export const writeSeed = (data: Seed) => writeFileSync(SEED_FILE, JSON.stringify(data, null, 2));

/** FE와 같은 CSRF 헤더를 붙여 BE API 호출. 실패하면 응답 본문과 함께 예외 */
export async function call<T = unknown>(req: APIRequestContext, method: string, path: string, data?: unknown): Promise<T> {
  const res = await req.fetch(`/api${path}`, { method, data, headers: { 'X-Requested-With': 'fetch' } });
  if (!res.ok()) throw new Error(`${method} ${path} → ${res.status()} ${await res.text()}`);
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

type StudentOptions = { nickname?: string; onboard?: boolean; verify?: boolean };

/** dev-student로 실제 로그인(같은 닉네임이면 같은 계정)하고 FE 세션을 저장함 */
export async function loginStudent(page: Page, { nickname = `e2e-${randomUUID().slice(0, 8)}`, onboard = true, verify = false }: StudentOptions = {}) {
  const req = page.request;
  let session = await call<{ onboarded: boolean; verified: boolean }>(req, 'POST', '/auth/dev-student', { nickname });
  if (onboard && !session.onboarded) {
    const s = seed();
    await call(req, 'PUT', '/me/profile', { nickname, primaryDepartmentId: s.departmentId, admissionYear: 2026, departmentIds: [], organizationIds: [s.organizationId], categoryIds: [] });
  }
  if (verify && !session.verified) await verifyStudent(req, nickname);
  session = await call(req, 'POST', '/auth/dev-student', { nickname });
  const stored = { role: 'STUDENT', name: nickname, onboarded: session.onboarded, verified: session.verified };
  await page.addInitScript((value) => localStorage.setItem('moagwa-session', JSON.stringify(value)), stored);
  return nickname;
}

/** local 프로필은 인증 코드를 응답에 담아 줌(VERIFICATION_EXPOSE_CODE) */
export async function verifyStudent(req: APIRequestContext, nickname: string) {
  const sent = await call<{ devCode: string | null }>(req, 'POST', '/me/verification/email', { email: `${nickname}@catholic.ac.kr` });
  if (!sent.devCode) throw new Error('인증 코드가 응답에 없음. BE에 VERIFICATION_EXPOSE_CODE=true 필요');
  await call(req, 'POST', '/me/verification/confirm', { code: sent.devCode });
}

/** 개발용 관리자 계정(DevDataInitializer)으로 실제 로그인. operator는 서비스 운영자 */
export async function loginAdmin(page: Page, loginId: 'student-council' | 'operator' = 'student-council') {
  const res = await call<{ name: string; organization: unknown; operator: boolean }>(page.request, 'POST', '/admin/auth/login', { loginId, password: ADMIN_PASSWORD });
  const stored = { role: 'ADMIN', name: res.name, organization: res.organization, operator: res.operator };
  await page.addInitScript((value) => localStorage.setItem('moagwa-session', JSON.stringify(value)), stored);
}

/** 관리자 공지 작성. 블록 기본값은 본문 한 줄 */
export async function createNotice(req: APIRequestContext, body: Record<string, unknown>) {
  const s = seed();
  return call<{ id: number }>(req, 'POST', '/admin/notices', {
    title: 'E2E 공지', categoryIds: [s.categoryId], blocks: [{ type: 'TEXT', text: '본문' }], publishMode: 'NOW', ...body,
  });
}

/** 테스트 데이터 준비용 관리자 API 세션. 쓰고 나면 dispose */
export async function adminApi(loginId: 'student-council' | 'ai-council' | 'operator' = 'student-council') {
  const ctx = await request.newContext({ baseURL: API });
  await call(ctx, 'POST', '/admin/auth/login', { loginId, password: ADMIN_PASSWORD });
  return ctx;
}

/** 화면 검사용 계정: 학생은 준비 단계의 인증·거래 채팅이 있는 학생, 관리자는 모든 관리 화면을 보는 운영자 */
export async function loginAs(page: Page, role: 'STUDENT' | 'ADMIN' | null) {
  if (role === 'STUDENT') await loginStudent(page, { nickname: seed().viewer, verify: true });
  else if (role === 'ADMIN') await loginAdmin(page, 'operator');
}
