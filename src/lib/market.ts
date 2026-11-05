import type { GroupBuySummary, MarketCategory, MarketStatus, TradeRequestView } from "@/types";

export const CATEGORY_LABEL: Record<MarketCategory, string> = {
  BOOK: "도서",
  ELECTRONICS: "전자기기",
  LIVING: "생활용품",
  CLOTHES: "의류",
  ETC: "기타",
};

export const CATEGORY_ORDER: MarketCategory[] = ["BOOK", "ELECTRONICS", "LIVING", "CLOTHES", "ETC"];

export const STATUS_LABEL: Record<MarketStatus, string> = {
  ON_SALE: "판매 중",
  RESERVED: "예약 중",
  SOLD: "판매 완료",
};

export const REQUEST_LABEL: Record<TradeRequestView["status"], string> = {
  PENDING: "답변 대기",
  ACCEPTED: "수락됨",
  REJECTED: "거절됨",
  CANCELED: "취소됨",
};

export const GROUP_STATUS_LABEL: Record<GroupBuySummary["status"], string> = {
  RECRUITING: "모집 중",
  CLOSED: "모집 마감",
  CANCELED: "취소됨",
};

export const won = (n: number) => (n === 0 ? "나눔" : `${n.toLocaleString("ko-KR")}원`);

/** "10분 전", "3시간 전", "어제", "10.05" */
export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "방금 전";
  if (min < 60) return `${min}분 전`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour}시간 전`;
  const day = Math.floor(hour / 24);
  if (day === 1) return "어제";
  if (day < 7) return `${day}일 전`;
  const d = new Date(iso);
  return `${d.getMonth() + 1}.${String(d.getDate()).padStart(2, "0")}`;
}

/** 마감까지 남은 시간: "2일 남음", "5시간 남음", "마감" */
export function remaining(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return "마감";
  const hour = Math.floor(diff / 3_600_000);
  if (hour < 1) return `${Math.max(1, Math.floor(diff / 60_000))}분 남음`;
  if (hour < 48) return `${hour}시간 남음`;
  return `${Math.floor(hour / 24)}일 남음`;
}
