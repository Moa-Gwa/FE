/* eslint-disable @next/next/no-img-element */
export default function Logo({ showName = true }: { showName?: boolean }) {
  return (
    <div className="logo">
      <img src="/moa-gwa-logo.png" alt="" />
      {showName && <span>모아과</span>}
    </div>
  );
}
