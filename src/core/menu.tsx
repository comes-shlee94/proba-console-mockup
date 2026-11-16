/* ---------------- 행 메뉴 · 사용자 메뉴 (body에 띄우는 팝업) ---------------- */
import { Fragment, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { icon } from './icons';
import { flushLayers } from './runtime';

export interface MenuItem { label: string; icon?: string; run?: () => void; disabled?: boolean; danger?: boolean; hint?: string }
/** '-' = 구분선 */
export type MenuEntry = MenuItem | '-';

let SEQ = 0;
let MENU: { items: MenuEntry[]; seq: number } | null = null;
let UMENU: { node: ReactNode; seq: number } | null = null;
let menuEl: HTMLDivElement | null = null;
let umenuEl: HTMLDivElement | null = null;

export const isMenuOpen = () => !!MENU;
export function openMenu(anchor: Element, items: MenuEntry[]) {
  closeMenu();
  const r = anchor.getBoundingClientRect();
  MENU = { items, seq: ++SEQ };
  flushLayers();
  const el = menuEl!;
  const w = el.offsetWidth; const h = el.offsetHeight;
  let top = r.bottom + 4; if (top + h > window.innerHeight - 8) top = r.top - h - 4;
  el.style.top = top + 'px'; el.style.left = Math.max(8, r.right - w) + 'px';
}
export function closeMenu() { if (MENU || UMENU) { MENU = null; UMENU = null; flushLayers(); } }

/** 사용자 메뉴(.umenu) — 내용은 열 때 한 번 만든 그대로 표시, 위치는 기준 요소의 오른쪽 아래 */
export function openUserMenu(anchor: Element, content: ReactNode) {
  const r = anchor.getBoundingClientRect();
  UMENU = { node: content, seq: ++SEQ };
  flushLayers();
  const box = umenuEl!;
  box.style.top = r.bottom + 8 + 'px'; box.style.left = r.right - box.offsetWidth + 'px';
}

export function MenuLayer() {
  return (
    <>
      {MENU ? createPortal(
        <div className="menu" ref={(el) => { menuEl = el; }}>
          {MENU.items.map((it, i) => (it === '-' ? <hr key={i} /> : (
            <Fragment key={i}>
              <button disabled={!!it.disabled} className={it.danger ? 'danger' : ''} onClick={() => { closeMenu(); it.run && it.run(); }}>{it.icon ? icon(it.icon, 'sm') : <span style={{ width: '14px' }}></span>}{it.label}</button>
              {it.hint ? <div className="hint">{it.hint}</div> : null}
            </Fragment>
          )))}
        </div>, document.body, `menu-${MENU.seq}`) : null}
      {UMENU ? createPortal(<div className="umenu" role="menu" ref={(el) => { umenuEl = el; }}>{UMENU.node}</div>, document.body, `umenu-${UMENU.seq}`) : null}
    </>
  );
}
