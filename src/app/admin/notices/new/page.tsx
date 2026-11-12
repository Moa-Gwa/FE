"use client";

import NoticeForm from "@/components/NoticeForm";
import TopBar from "@/components/TopBar";

export default function NewNoticePage() {
  return (
    <>
      <TopBar title="새 공지 작성" sub="학생에게 전달할 소식을 작성해 주세요." />
      <NoticeForm initial={null} />
    </>
  );
}
