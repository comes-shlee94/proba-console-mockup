/* ---------------- 툴팁: body에 띄워 표·스크롤 영역에 잘리지 않게 ----------------
   [data-tip] 요소에 마우스를 올리거나 포커스하면 #tip 상자를 띄웁니다.
   React 트리 밖의 단일 DOM 요소로, 원본과 같은 방식(텍스트 · 위치 계산)으로 동작합니다. */
const TIP: { el: HTMLDivElement | null; target: Element | null } = { el: null, target: null };
function tipBox() {
  if (!TIP.el) { TIP.el = document.createElement('div'); TIP.el.id = 'tip'; TIP.el.setAttribute('role', 'tooltip'); document.body.appendChild(TIP.el); }
  return TIP.el;
}
export function showTip(t: Element) {
  const text = t.getAttribute('data-tip');
  if (!text) { hideTip(); return; }
  const el = tipBox();
  TIP.target = t; el.textContent = text; el.classList.add('on');
  const r = t.getBoundingClientRect(); const w = el.offsetWidth; const h = el.offsetHeight; const m = 8;
  let top = r.top - h - 8;
  if (top < m) top = r.bottom + 8;
  const left = Math.max(m, Math.min(r.left + r.width / 2 - w / 2, window.innerWidth - w - m));
  el.style.top = `${Math.round(top)}px`; el.style.left = `${Math.round(left)}px`;
}
export function hideTip() { TIP.target = null; if (TIP.el) TIP.el.classList.remove('on'); }
export function syncTip() { if (TIP.target) { if (document.contains(TIP.target)) showTip(TIP.target); else hideTip(); } }

export function installTooltip() {
  document.addEventListener('mouseover', (e) => {
    const tg = e.target as Element;
    const t = tg.closest ? tg.closest('[data-tip]') : null;
    if (t === TIP.target) return;
    if (t) showTip(t); else hideTip();
  });
  document.addEventListener('mouseout', (e) => { if (!e.relatedTarget) hideTip(); });
  document.addEventListener('focusin', (e) => { const tg = e.target as Element; const t = tg.closest && tg.closest('[data-tip]'); if (t) showTip(t); });
  document.addEventListener('focusout', () => hideTip());
  document.addEventListener('mousedown', () => hideTip(), true);
  window.addEventListener('scroll', () => hideTip(), true);
}
