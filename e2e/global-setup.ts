import { request, type APIRequestContext } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ADMIN_PASSWORD, API, call, verifyStudent, writeSeed, type Seed } from './support';

/** 크롤링 공지는 작성 API가 없어 이 DB에 직접 넣음 */
const DATABASE_URL = process.env.E2E_DATABASE_URL ?? 'postgresql://moagwa:moagwa@localhost:5432/moagwa_e2e';
const at = '2030-06-15T09:00:00Z';
// 화면 넘침을 확인하려고 제목·주소·장소는 허용 길이에 가깝게 채움
const longTitle = '장학금 신청 및 학과 행사 안내 장학금 신청 및 학과 행사 안내'.slice(0, 40);
const longUrl = 'https://school.example/' + 'long-unbroken-url-'.repeat(12);

async function session(path: string, body: unknown): Promise<APIRequestContext> {
  const ctx = await request.newContext({ baseURL: API });
  await call(ctx, 'POST', path, body);
  return ctx;
}

async function upload(ctx: APIRequestContext, path: string, names: string[]): Promise<string[]> {
  const form = new FormData();
  for (const name of names) form.append('files', new Blob([readFileSync(join(__dirname, 'static', name))], { type: 'image/png' }), name);
  const res = await ctx.post(`/api${path}`, { headers: { 'X-Requested-With': 'fetch' }, multipart: form });
  if (!res.ok()) throw new Error(`upload ${path} → ${res.status()} ${await res.text()}`);
  return (await res.json()).urls;
}

function sql(query: string): string {
  return execFileSync('psql', [DATABASE_URL, '-qtA', '-v', 'ON_ERROR_STOP=1', '-c', query], { encoding: 'utf8' }).trim();
}

export default async function globalSetup() {
  const health = await fetch(`${API}/api/categories`).catch(() => null);
  if (!health?.ok) throw new Error(`E2E BE가 응답하지 않음: ${API}. e2e/README.md의 실행 방법 참고`);
  const anon = await request.newContext({ baseURL: API });
  const categories = await call<{ id: number; code: string }[]>(anon, 'GET', '/categories');
  const organizations = await call<{ id: number; type: string }[]>(anon, 'GET', '/organizations');
  const categoryId = categories.find((c) => c.code === 'EVENT')!.id;
  const departmentId = organizations.find((o) => o.type === 'DEPARTMENT')!.id;

  const admin = await request.newContext({ baseURL: API });
  const me = await call<{ organization: { id: number } }>(admin, 'POST', '/admin/auth/login', { loginId: 'student-council', password: ADMIN_PASSWORD });
  const organizationId = me.organization.id;

  // 화면 검사용 학생: 관심 단체를 먼저 등록해야 공지 게시 알림을 받음
  const viewer = `e2e-viewer-${Date.now()}`;
  const viewerCtx = await session('/auth/dev-student', { nickname: viewer });
  await call(viewerCtx, 'PUT', '/me/profile', { nickname: viewer, primaryDepartmentId: departmentId, admissionYear: 2026, departmentIds: [], organizationIds: [organizationId], categoryIds: [] });
  await verifyStudent(viewerCtx, viewer);

  const images = await upload(admin, '/admin/uploads/images', ['viewer-a.png', 'viewer-b.png']);
  const notice = (body: Record<string, unknown>) => call<{ id: number }>(admin, 'POST', '/admin/notices', {
    categoryIds: [categoryId], publishMode: 'NOW', ...body,
  }).then((n) => n.id);
  const photos = (layout: string, list: string[], captions: string[]) => ({ type: 'IMAGES', layout, images: list, captions });
  const notices = {
    wide: await notice({
      title: longTitle, blocks: [{ type: 'TEXT', text: `${longTitle}\n${longUrl}` }, photos('CAROUSEL', images.slice(0, 1), [longTitle])],
      eventStartAt: at, eventEndAt: '2030-06-15T11:00:00Z', deadlineAt: at, location: longTitle.repeat(4), externalLink: longUrl,
    }),
    carousel: await notice({ title: '사진 확대 공지', blocks: [{ type: 'TEXT', text: '본문' }, photos('CAROUSEL', images, ['첫 사진 설명', '둘째 사진 설명'])] }),
    stack: await notice({ title: '사진 세로 공지', blocks: [{ type: 'TEXT', text: '본문' }, photos('STACK', images, ['첫 사진 설명', '둘째 사진 설명'])] }),
    single: await notice({ title: '사진 한 장 공지', blocks: [{ type: 'TEXT', text: '본문' }, photos('STACK', images.slice(0, 1), ['첫 사진 설명'])] }),
    // 블록 도입 이전 형식: 본문과 이미지 목록만 있음
    legacy: await notice({ title: '예전 형식 공지', description: '본문', imageUrls: images }),
  };
  await call(viewerCtx, 'PUT', `/me/bookmarks/MANUAL/${notices.wide}`);

  const source = sql("SELECT id FROM crawl_sources WHERE code = 'catholic_notice'");
  const html = `<p>학교 공지 본문 ${longUrl}</p><a href="https://school.example/original"><img src="${images[0]}" alt="학교 사진 하나"></a>`
    + `<img src="${images[1]}" alt="학교 사진 둘"><a href="https://school.example/file.pdf"><img src="/images/icon_pdf.gif" width="16" alt="pdf">첨부파일</a>`
    + `<img src="${images[1]}" style="width:1px;height:1px" alt="">`;
  const crawled = Number(sql(`INSERT INTO crawled_notices (source_id, external_id, title, url, content_html, content_text, content_fetched, media_fetched, published_at, deadline_at, category)
    VALUES (${source}, 'e2e-${Date.now()}', $t$${longTitle}$t$, $u$${longUrl}$u$, $h$${html}$h$, $c$학교 공지 본문$c$, true, true, now(), '${at}', 'EVENT') RETURNING id`));
  await call(viewerCtx, 'POST', `/crawled-notices/${crawled}/date-corrections`, { field: 'DEADLINE', suggestedStart: '2030-06-16', memo: longUrl.slice(0, 300) });
  await call(anon, 'POST', '/admin-applications', {
    organizationName: longTitle, university: '가톨릭대학교', department: longTitle, contactName: '담당자',
    email: `e2e-${Date.now()}@catholic.ac.kr`, loginId: `e2e-${Date.now()}`, phone: '010-1234-5678', channelUrl: longUrl, reason: longUrl,
  });

  // 생활 화면: 판매자 물품·같이 사기, 화면 검사용 학생과의 거래 채팅
  const seller = `e2e-seller-${Date.now()}`;
  const sellerCtx = await session('/auth/dev-student', { nickname: seller });
  await call(sellerCtx, 'PUT', '/me/profile', { nickname: seller, primaryDepartmentId: departmentId, admissionYear: 2026, departmentIds: [], organizationIds: [], categoryIds: [] });
  await verifyStudent(sellerCtx, seller);
  const itemImages = await upload(sellerCtx, '/market/uploads/images', ['viewer-a.png']);
  const item = (title: string) => call<{ id: number }>(sellerCtx, 'POST', '/market/items', {
    title, description: longUrl, price: 10000, category: 'BOOK', tradePlace: longTitle, imageUrls: itemImages,
  }).then((i) => i.id);
  const itemId = await item(longTitle);
  const chatItem = await item('채팅용 물품');
  const request_ = await call<{ id: number }>(viewerCtx, 'POST', `/market/items/${chatItem}/requests`, { message: longUrl.slice(0, 200) });
  await call(sellerCtx, 'POST', `/market/requests/${request_.id}/accept`);
  const rooms = await call<{ id: number }[]>(viewerCtx, 'GET', '/me/chats');
  const group = await call<{ summary: { id: number } }>(sellerCtx, 'POST', '/market/group-buys', {
    title: longTitle, description: longUrl, unitPrice: 10000, targetQuantity: 10, deadlineAt: at, pickupPlace: longTitle, imageUrl: itemImages[0],
  });

  const data: Seed = { categoryId, departmentId, organizationId, images, notices, crawled, viewer, item: itemId, group: group.summary.id, chatRoom: rooms[0].id };
  writeSeed(data);
  await Promise.all([anon, admin, viewerCtx, sellerCtx].map((c) => c.dispose()));
}
