export type Source = "MANUAL" | "CRAWLED";
export type OrgType = "UNIVERSITY" | "DEPARTMENT" | "STUDENT_GOVERNMENT";
export type DisplayStatus = "UPCOMING" | "ONGOING" | "DEADLINE_SOON" | "CLOSED" | "ENDED";
export type NoticeStatus = "DRAFT" | "SCHEDULED" | "PUBLISHED" | "CLOSED";

export interface OrgRef {
  id: number;
  name: string;
  type: OrgType;
}

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
  description: string;
  categoryIds: number[];
  imageUrls: string[];
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
  organization?: OrgRef;
}
