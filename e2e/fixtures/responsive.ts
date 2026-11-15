import type { Page } from '@playwright/test';
const at = '2030-06-15T09:00:00Z';
const title = '장학금 신청 및 학과 행사 안내 '.repeat(4);
const url = 'https://school.example/' + 'long-unbroken-url-'.repeat(12);
const organization = { id: 1, name: '가톨릭대학교 학생자치단체', type: 'STUDENT_GOVERNMENT' };
export const notice = { id: 1, source: 'MANUAL', organization, title, description: url, contentHtml: null,
  blocks: [{ type: 'TEXT', text: `${title}\n${url}` }, { type: 'IMAGES', layout: 'CAROUSEL', images: ['/responsive-image.svg'], captions: [title] }],
  images: ['/responsive-image.svg'], imageUrls: ['/responsive-image.svg'], thumbnail: '/responsive-image.svg',
  categories: ['EVENT'], categoryCodes: ['EVENT'], categoryIds: [1], category: 'EVENT', status: 'PUBLISHED', urgent: false,
  publishedAt: at, publishAt: at, updatedAt: at, createdAt: at, deadlineAt: at, eventStartAt: at, eventEndAt: at,
  location: title, externalLink: url, bookmarked: true, viewCount: 1234, bookmarkCount: 100, attachments: [{ fileName: title+'.pdf', url }] };
const item = { id: 1, title, price: 10000, category: 'BOOK', status: 'ON_SALE', tradePlace: title,
  thumbnail: '/responsive-image.svg', likeCount: 2, liked: false, createdAt: at };
const group = { id: 1, title, unitPrice: 10000, targetQuantity: 10, joinedQuantity: 3, deadlineAt: at,
  pickupPlace: title, imageUrl: '/responsive-image.svg', status: 'RECRUITING', hostNickname: '주최자', myQuantity: 1, createdAt: at };
const room = { id: 1, type: 'TRADE', title, partner: '상대방이름'.repeat(8), itemId: 1, groupBuyId: null,
  thumbnail: null, category: 'BOOK', lastMessage: url, lastAt: at, unread: 2 };
export async function responsiveFixtures(page: Page, role: 'STUDENT' | 'ADMIN' | null) {
  await page.addInitScript(role => {
    localStorage.removeItem('moagwa-session');
    if (role) localStorage.setItem('moagwa-session', JSON.stringify({ role, name: '테스트 사용자', operator: role === 'ADMIN',
      onboarded: true, verified: true, organization: { id: 1, name: '학생자치단체', type: 'STUDENT_GOVERNMENT' } }));
  }, role);
  await page.route('**/responsive-image.svg', route => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="600"><rect width="1200" height="600" fill="#ffe4db"/></svg>' }));
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname;
    let data: unknown = [];
    if (path === '/api/stream') return route.fulfill({ contentType: 'text/event-stream', body: ':ok\n\n' });
    if (path === '/api/categories') data = [{ id: 1, code: 'EVENT', name: '행사' }];
    else if (path === '/api/organizations') data = [{ ...organization, college: '공학계열' }];
    else if (path === '/api/admin/dashboard') data = { organization, kpi: { active: 3, closingToday: 2, scheduled: 1, ended: 0 }, performance: { notices: 3, views: 1234, bookmarks: 10, shares: 5 }, activeNotices: [notice] };
    else if (path === '/api/admin/organization') data = { ...organization, description: url, externalUrl: url, verified: true, profileImage: null };
    else if (path === '/api/admin/notices') data = [notice, { ...notice, id: 2 }];
    else if (/\/api\/(admin\/notices|notices|crawled-notices)\/1$/.test(path)) data = { ...notice, source: path.includes('crawled') ? 'CRAWLED' : 'MANUAL' };
    else if (path === '/api/admin/date-corrections') data = [{ id: 1, field: 'DEADLINE', suggestedStart: '2030-06-15', suggestedEnd: null, memo: url, status: 'PENDING', createdAt: at, notice: { ...notice, url, contentText: url, dateEvidence: title } }];
    else if (path === '/api/admin/applications') data = [{ id: 1, organizationName: title, university: '가톨릭대학교', department: title, contactName: '담당자', email: 'long'.repeat(15)+'@catholic.ac.kr', phone: '010-1234-5678', channelUrl: url, reason: url, status: 'PENDING', rejectionReason: null, createdAt: at }];
    else if (path === '/api/admin/schedule' || path === '/api/schedule') data = [{ type: 'DEADLINE', at, source: 'MANUAL', noticeId: 1, title, organizationName: organization.name, location: title, bookmarked: true }];
    else if (path === '/api/feed/now') data = [notice, { ...notice, id: 2 }];
    else if (path.startsWith('/api/feed')) data = { items: [notice, { ...notice, id: 2 }, { ...notice, id: 3 }], nextCursor: null };
    else if (path === '/api/me/profile') data = { id: 1, nickname: '테스트', primaryDepartmentId: 1, admissionYear: 2026, departmentIds: [], organizationIds: [1], categoryIds: [1] };
    else if (path === '/api/me/notification-settings') data = { newNotice: true, eventStart: true, deadlineSoon: true, urgent: true };
    else if (path === '/api/me/notifications') data = { unreadCount: 1, items: [{ id: 1, type: 'REMINDER', source: 'PERSONAL', noticeId: 1, title, body: url, read: false, createdAt: at }] };
    else if (path.startsWith('/api/me/reminders/')) data = { enabled: false, at, remindAt: at, tooLate: false };
    else if (path === '/api/market/items') data = { items: [item, { ...item, id: 2 }], page: 0, size: 20, hasNext: false };
    else if (path === '/api/market/items/1') data = { ...item, imageUrls: ['/responsive-image.svg'], description: url, viewCount: 3, mine: false, seller: { id: 2, nickname: title, department: title } };
    else if (path === '/api/market/group-buys') data = { items: [group], page: 0, size: 20, hasNext: false };
    else if (path === '/api/market/group-buys/1') data = { summary: group, description: url, mine: false, participants: 3, paymentRequired: false, participationFee: 0, myPaid: false, myPaidAmount: 0 };
    else if (path === '/api/me/chats') data = [room];
    else if (path === '/api/chats/1/messages') data = { messages: [{ id: 1, roomId: 1, senderId: 2, senderName: title, content: url, createdAt: at }], hasMore: false, reads: [] };
    else if (path === '/api/me/verification') data = { verified: true };
    else if (path === '/api/admin/auth/setup/validate') data = { valid: true, email: 'operator@catholic.ac.kr' };
    else if (path.startsWith('/api/me/market/')) data = [item];
    else if (route.request().method() !== 'GET') return route.fulfill({ status: 204 });
    return route.fulfill({ json: data });
  });
}
