// iOS는 (글자 크기 × 화면 배율)이 16px 미만인 입력창에 초점이 가면 화면을 확대하고 되돌리지 않음.
// 화면 배율이 0.8이라 16px 입력창도 12.8px로 보여 모든 입력창에서 확대됨.
// maximum-scale을 모든 기기에 걸면 안드로이드는 두 손가락 확대까지 막히므로 iOS에서만 건다.
// (iOS는 maximum-scale이 있어도 두 손가락 확대는 계속 허용함)
//
// Next가 그리는 viewport 태그를 직접 고치면 hydration 불일치가 생기므로,
// 같은 설정에 maximum-scale만 더한 viewport 태그를 head 끝에 하나 더 붙인다(마지막 태그가 적용됨).
// 페이지 이동 시 Next가 viewport 태그를 다시 넣어 이 태그보다 뒤에 오므로, 그때마다 맨 뒤로 다시 옮긴다.

export const VIEWPORT_SCALE = 0.8;

const IOS_VIEWPORT = `width=device-width, initial-scale=${VIEWPORT_SCALE}, maximum-scale=${VIEWPORT_SCALE}, viewport-fit=cover`;

// iPadOS Safari는 Mac으로 자신을 알리므로 터치 지원 여부로 함께 판별
const script = `(function(){try{
var u=navigator.userAgent;
if(!(/iP(hone|ad|od)/.test(u)||(/Macintosh/.test(u)&&navigator.maxTouchPoints>1)))return;
var h=document.head,m=document.createElement("meta");
m.name="viewport";m.content=${JSON.stringify(IOS_VIEWPORT)};m.setAttribute("data-ios-zoom-lock","");
h.appendChild(m);
new MutationObserver(function(){
var all=h.querySelectorAll('meta[name="viewport"]');
if(all[all.length-1]!==m)h.appendChild(m);
}).observe(h,{childList:true});
}catch(e){}})();`;

export default function IosInputZoomLock() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
