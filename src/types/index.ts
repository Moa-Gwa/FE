export type Source = "MANUAL" | "CRAWLED";
export type OrgType = "UNIVERSITY" | "DEPARTMENT" | "STUDENT_GOVERNMENT";
export type DisplayStatus = "UPCOMING" | "ONGOING" | "DEADLINE_SOON" | "CLOSED" | "ENDED";
export type NoticeStatus = "DRAFT" | "SCHEDULED" | "PUBLISHED" | "CLOSED";

export interface OrgRef {
  id: number;
  name: string;
  type: OrgType;
}

export type BlockLayout = "CAROUSEL" | "STACK";
export type Block =
  | { type: "TEXT"; text: string }
  | { type: "IMAGES"; images: string[]; layout: BlockLayout; captions?: string[] };

export interface FeedItem {
  source: Source;
  id: number;
  organization: OrgRef;
  title: string;
  summary: string | null;
  category: string | null;
  urgent: boolean;
  pinned: boolean;
  publishedAt: string;
  eventStartAt: string | null;
  eventEndAt: string | null;
  deadlineAt: string | null;
  location: string | null;
  status: DisplayStatus | null;
  viewCount: number;
  thumbnail: string | null;
  bookmarked: boolean;
}

export interface FeedPage {
  items: FeedItem[];
  page: number;
  size: number;
  hasNext: boolean;
}

/** BE #68: 원문 사이트의 첨부파일. URL은 서버가 절대 경로로 정규화한다. */
export interface NoticeAttachment {
  fileName: string;
  url: string;
}

export interface NoticeDetail {
  source: Source;
  id: number;
  organization: OrgRef;
  title: string;
  description: string | null;
  contentHtml: string | null;
  categories: string[];
  images: string[];
  blocks: Block[] | null;
  urgent: boolean;
  publishedAt: string;
  updatedAt: string;
  eventStartAt: string | null;
  eventEndAt: string | null;
  deadlineAt: string | null;
  location: string | null;
  externalLink: string | null;
  status: DisplayStatus | null;
  viewCount: number;
  bookmarkCount: number;
  bookmarked: boolean;
  /** 미수집 또는 이전 서버 응답에서는 생략될 수 있다. */
  attachments?: NoticeAttachment[] | null;
  /** 크롤링 공지: 자동 추출한 마감·행사일의 근거 원문 문장 */
  dateEvidence?: string | null;
  /** 크롤링 공지: 본문에서 추출한 검색 키워드 */
  keywords?: string[];
}

export interface Category {
  id: number;
  code: string;
  name: string;
}

export interface OrganizationView {
  id: number;
  name: string;
  type: OrgType;
  college: string | null;
  /** BE #112: 운영자처럼 구독을 해제할 수 없는 단체 */
  required?: boolean;
}

export interface ScheduleEntry {
  /** This viewer's color override; null uses the default. */
  color?: string | null;
  /** Exclusive end; null for legacy point schedules and deadlines. */
  endAt?: string | null;
  type: "EVENT" | "DEADLINE" | "PERSONAL" | "ACADEMIC";
  at: string;
  source: Source | "PERSONAL" | "ACADEMIC";
  noticeId: number;
  title: string;
  organizationName: string;
  location: string | null;
  /** 로그인한 학생이 저장한 공지 */
  bookmarked: boolean;
  memo?: string | null;
  sourceUrl?: string | null;
}

export interface Profile {
  id: number;
  nickname: string;
  primaryDepartmentId: number | null;
  admissionYear: number | null;
  departmentIds: number[];
  organizationIds: number[];
  categoryIds: number[];
}

export interface NotificationItem {
  id: number;
  type: string;
  /** MARKET이면 noticeId는 물품 id */
  source: Source | "MARKET" | "PERSONAL";
  noticeId: number;
  title: string;
  body: string | null;
  read: boolean;
  createdAt: string;
}

export interface NotificationSettings {
  newNotice: boolean;
  eventStart: boolean;
  deadlineSoon: boolean;
  urgent: boolean;
}

export interface AdminNotice {
  id: number;
  title: string;
  description: string;
  categoryIds: number[];
  categoryCodes: string[];
  imageUrls: string[];
  blocks: Block[] | null;
  status: NoticeStatus;
  displayStatus: DisplayStatus | null;
  urgent: boolean;
  publishAt: string | null;
  eventStartAt: string | null;
  eventEndAt: string | null;
  deadlineAt: string | null;
  location: string | null;
  externalLink: string | null;
  viewCount: number;
  bookmarkCount: number;
  shareCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface NoticeInput {
  title: string;
  blocks: Block[];
  categoryIds: number[];
  eventStartAt: string | null;
  eventEndAt: string | null;
  deadlineAt: string | null;
  location: string;
  externalLink: string;
  urgent: boolean;
  publishMode: "DRAFT" | "NOW" | "SCHEDULED" | null;
  publishAt: string | null;
}

export interface AdminDashboard {
  organization: OrgRef;
  kpi: { active: number; closingToday: number; scheduled: number; ended: number };
  performance: { notices: number; views: number; bookmarks: number; shares: number };
  activeNotices: AdminNotice[];
}

export interface AdminOrg {
  id: number;
  name: string;
  type: OrgType;
  description: string | null;
  profileImage: string | null;
  externalUrl: string | null;
  verified: boolean;
}

export interface AdminScheduleItem {
  type: "PUBLISH" | "EVENT" | "DEADLINE";
  at: string;
  noticeId: number;
  title: string;
}

export interface Session {
  role: "STUDENT" | "ADMIN";
  name: string;
  onboarded?: boolean;
  /** 학교 메일로 재학생 인증을 마쳤는지. 생활 탭이 이 값을 확인한다. */
  verified?: boolean;
  organization?: OrgRef;
  /** 서비스 운영자 관리자. 날짜 교정 검토 화면이 이 값을 확인한다. */
  operator?: boolean;
}

/* ---- 생활거래 (중고거래 · 같이 사기) ---- */
export type MarketCategory = "BOOK" | "ELECTRONICS" | "LIVING" | "CLOTHES" | "ETC";
export type MarketStatus = "ON_SALE" | "RESERVED" | "SOLD";

export interface MarketItemSummary {
  id: number;
  title: string;
  price: number;
  category: MarketCategory;
  status: MarketStatus;
  tradePlace: string | null;
  thumbnail: string | null;
  likeCount: number;
  liked: boolean;
  createdAt: string;
}

export interface MarketSeller {
  id: number;
  nickname: string;
  department: string | null;
}

export interface MarketItemDetail extends Omit<MarketItemSummary, "thumbnail"> {
  description: string;
  imageUrls: string[];
  viewCount: number;
  mine: boolean;
  seller: MarketSeller;
}

export interface MarketItemPage {
  items: MarketItemSummary[];
  page: number;
  size: number;
  hasNext: boolean;
}

export interface TradeRequestView {
  id: number;
  itemId: number;
  itemTitle: string;
  buyerId: number;
  buyerNickname: string;
  message: string | null;
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "CANCELED";
  createdAt: string;
}

export interface GroupBuySummary {
  id: number;
  title: string;
  unitPrice: number;
  targetQuantity: number;
  joinedQuantity: number;
  deadlineAt: string;
  pickupPlace: string | null;
  imageUrl: string | null;
  status: "RECRUITING" | "CLOSED" | "CANCELED";
  hostNickname: string;
  myQuantity: number;
  createdAt: string;
}

export interface GroupBuyDetail {
  summary: GroupBuySummary;
  description: string;
  mine: boolean;
  participants: number;
  /** 결제 후 참여(유료 모집이고 서버 결제 기능이 켜진 경우) */
  paymentRequired: boolean;
  /** 참가비(원). 결제가 필요 없으면 0. 물품 대금은 주최자와 직접 정산 */
  participationFee: number;
  /** 내 참여가 결제 완료 상태인지(결제 기능 도입 전 참여자는 false) */
  myPaid: boolean;
  /** 내가 실제 결제한 금액. 참여 취소 시 이 금액이 환불됨(참가비 도입 전 주문은 단가 × 수량) */
  myPaidAmount: number;
}

/** 결제위젯에 넘길 주문. 금액은 서버 계산 */
export interface PaymentOrder {
  orderId: string;
  amount: number;
  orderName: string;
}

/** 주최자 화면의 참여자별 결제 상태 */
export interface GroupParticipant {
  nickname: string;
  quantity: number;
  paid: boolean;
  joinedAt: string;
}

export interface GroupBuyPage {
  items: GroupBuySummary[];
  page: number;
  size: number;
  hasNext: boolean;
}

/* ---- 채팅 (중고거래 1:1 · 같이 사기 단체방) ---- */
export interface ChatRoom {
  id: number;
  type: "TRADE" | "GROUP";
  /** 거래 방은 물품명, 단체방은 모집명 */
  title: string;
  /** 거래 방의 상대 닉네임. 단체방은 null */
  partner: string | null;
  itemId: number | null;
  groupBuyId: number | null;
  /** 물품 첫 사진 또는 모집 사진 */
  thumbnail: string | null;
  /** 사진 없을 때 대체 표시용. 단체방은 null */
  category: MarketCategory | null;
  lastMessage: string | null;
  lastAt: string;
  unread: number;
}

export interface ChatMessage {
  id: number;
  roomId: number;
  senderId: number;
  senderName: string;
  content: string;
  createdAt: string;
}

export interface ChatReadState {
  userId: number;
  lastReadId: number;
}

export interface ChatMessagePage {
  /** 오래된 순 */
  messages: ChatMessage[];
  hasMore: boolean;
  reads: ChatReadState[];
}

export type ChatEvent =
  | { type: "message"; roomId: number; message: ChatMessage; read: null }
  | { type: "read"; roomId: number; message: null; read: ChatReadState }
  /** 새 방 생성(예: 판매자가 거래 수락). 목록만 재조회 */
  | { type: "room"; roomId: number; message: null; read: null };

export type CorrectionField = "DEADLINE" | "EVENT";
export type CorrectionStatus = "PENDING" | "APPLIED" | "REJECTED";

/** 크롤링 공지 날짜 교정 요청(운영자 검토 화면) */
export interface DateCorrection {
  id: number;
  field: CorrectionField;
  /** YYYY-MM-DD. 둘 다 null이면 "날짜 없음" 제안 */
  suggestedStart: string | null;
  suggestedEnd: string | null;
  memo: string | null;
  status: CorrectionStatus;
  createdAt: string;
  notice: {
    id: number;
    title: string;
    url: string;
    publishedAt: string;
    deadlineAt: string | null;
    eventStartAt: string | null;
    eventEndAt: string | null;
    dateEvidence: string | null;
    contentText: string | null;
  };
}

export type AdminApplicationStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface AdminApplication {
  id: number;
  organizationName: string;
  university: string;
  department: string;
  contactName: string;
  email: string;
  loginId: string;
  phone: string;
  channelUrl: string;
  reason: string;
  status: AdminApplicationStatus;
  rejectionReason: string | null;
  createdAt: string;
}

/** 메일을 보냈으면 setupLink는 null. 메일 설정이 없는 환경에서만 링크를 직접 받음 */
export interface SetupLinkIssued {
  mailSent: boolean;
  setupLink: string | null;
}
