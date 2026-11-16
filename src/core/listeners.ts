/* ---------------- 문서 단위 이벤트 (원본 이벤트 위임 중 요소에 속하지 않는 부분) ---------------- */
import { closeMenu, isMenuOpen } from './menu';
import { OV, closeOverlay, renderOverlays, topOverlay } from './overlay';
import { setComposing } from './events';
import { render } from './runtime';

export function installGlobalListeners() {
  window.addEventListener('hashchange', () => { closeMenu(); OV.stack = []; renderOverlays(); render(); });
  // act()로 처리된 클릭은 여기까지 전파되지 않음 → 동작이 없는 곳을 누른 경우만 처리
  document.addEventListener('click', (e) => {
    const tg = e.target as Element;
    if (!tg.closest('.menu') && !tg.closest('.umenu')) closeMenu();
    const ov = tg.closest('.ovl');
    if (ov && tg === ov && topOverlay()?.drawer) closeOverlay(); // 드로어만 바깥 클릭으로 닫힘 (모달은 입력 보호)
  });
  document.addEventListener('compositionstart', () => { setComposing(true); });
  document.addEventListener('compositionend', () => { setComposing(false); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { if (isMenuOpen() || document.querySelector('.umenu')) closeMenu(); else if (OV.stack.length) closeOverlay(); }
  });
}
