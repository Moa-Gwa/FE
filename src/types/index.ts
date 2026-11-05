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
  | { type: "IMAGES"; images: string[]; layout: BlockLayout };

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
}

export interface ScheduleEntry {
  type: "EVENT" | "DEADLINE";
  at: string;
  source: Source;
  noticeId: number;
  title: string;
  organizationName: string;
  location: string | null;
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
  source: Source;
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
  token: string;
  name: string;
  onboarded?: boolean;
  /** 학교 메일로 재학생 인증을 마쳤는지. 생활 탭이 이 값을 확인한다. */
  verified?: boolean;
  organization?: OrgRef;
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
}

export interface GroupBuyPage {
  items: GroupBuySummary[];
  page: number;
  size: number;
  hasNext: boolean;
}
