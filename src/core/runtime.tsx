/* ==========================================================
   Core: 렌더 런타임
   원본은 4개의 영역(#app · #overlay-root · #toast-root · #proto-panel)을 서로 따로,
   그리고 동기적으로 다시 그렸습니다(render / renderOverlays / toast / renderProtoPanel).
   React에서도 영역마다 루트를 하나씩 두고 flushSync로 즉시 그려, 같은 시점·같은 범위만 갱신합니다.
   ========================================================== */
import type { FC } from 'react';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import { ST, curOrgOf, setCurOrg } from './state';
import { parseHash } from './router';
import { syncTip } from './tooltip';

export interface RootViews {
  App: FC;
  Overlays: FC;
  /** #toast-root: 토스트 + body에 붙는 행 메뉴·사용자 메뉴(portal) */
  Layers: FC;
  Panel: FC;
}
let V: RootViews | null = null;
const R: Partial<Record<keyof RootViews, Root>> = {};
const C: Partial<Record<keyof RootViews, HTMLElement>> = {};

export function mountRoots(views: RootViews) {
  V = views;
  C.App = document.getElementById('app')!;
  C.Overlays = document.getElementById('overlay-root')!;
  C.Layers = document.getElementById('toast-root')!;
  C.Panel = document.getElementById('proto-panel')!;
  (Object.keys(C) as (keyof RootViews)[]).forEach((k) => { R[k] = createRoot(C[k]!); });
}

/* ---------------- style 속성 정리 ----------------
   React는 재사용한 요소의 style 값을 모두 지워도 빈 style="" 속성을 남기지만, 원본 DOM 패치는 속성을 없앴습니다.
   반대로 원본 템플릿이 값과 관계없이 style 속성을 항상 쓰던 요소(예: 너비 없는 드로어)는 ref={keepStyleAttr}로 빈 속성을 유지합니다. */
const KEEP_STYLE = new WeakSet<Element>();
export const keepStyleAttr = (el: Element | null) => {
  if (!el) return;
  KEEP_STYLE.add(el);
  if (!el.hasAttribute('style')) el.setAttribute('style', '');
};
function tidyStyles(root: Element) {
  root.querySelectorAll('[style=""]').forEach((el) => { if (!KEEP_STYLE.has(el)) el.removeAttribute('style'); });
}

function flush(k: keyof RootViews) {
  const Comp = V![k];
  const root = R[k]!;
  flushSync(() => root.render(<Comp />));
  tidyStyles(C[k]!);
}

/* ---------------- 남는 요소는 마지막에 지우기 (두 번째 그리기) ----------------
   원본 DOM 패치는 자식 요소를 위치 순서대로 고친 뒤, 남는 뒤쪽 요소를 마지막에 지웠습니다. React는 지울 요소를 먼저 지우고
   나머지를 고치므로, 지워지는 요소에 포커스가 있으면(브라우저가 그 자리에서 레이아웃을 다시 계산) 스크롤 위치가 달라질 수 있습니다.
   목록이 줄어드는 화면은 이전 요소를 뒤에 남긴 채 한 번 그리고 requestSettlePass()로 한 번 더 그려 원본과 같은 순서로 지웁니다. */
let APP_SEQ = 0;
let SETTLE = false;
/** 지금 그리고 있는 #app 화면의 순번 (직전 그리기와 이어지는지 판단할 때 사용) */
export const appRenderSeq = () => APP_SEQ;
export const requestSettlePass = () => { SETTLE = true; };
export const flushApp = () => {
  APP_SEQ++; flush('App');
  if (SETTLE) { SETTLE = false; APP_SEQ++; flush('App'); }
};
export const flushOverlays = () => flush('Overlays');
export const flushLayers = () => flush('Layers');
export const flushPanel = () => flush('Panel');

/* ---------------- 포커스 보존 ---------------- */
export interface FocusSnap { id: string; s: number | null; e: number | null }
export function captureFocus(): FocusSnap | null {
  const a = document.activeElement as HTMLInputElement | null;
  if (!a || !a.id) return null;
  return { id: a.id, s: a.selectionStart ?? null, e: a.selectionEnd ?? null };
}
export function restoreFocus(f: FocusSnap | null) {
  if (!f) return;
  const el = document.getElementById(f.id) as HTMLInputElement | null;
  if (!el || el === document.activeElement) return; // 화면을 다시 그려도 입력 요소가 그대로 남아 있으면 다시 포커스하지 않음
  el.focus();
  try { if (f.s != null) el.setSelectionRange(f.s, f.e); } catch (e) { /* noop */ }
}

/* ---------------- 다음 render() 때 해제되는 임시 클래스 ----------------
   원본의 DOM 패치(morph)는 다시 그릴 때 속성을 템플릿 값으로 되돌렸습니다.
   (예: 사용자 메뉴를 열면 버튼에 on 클래스를 붙이고, 다음 render()에서 해제) */
const TRANSIENT: Array<[Element, string]> = [];
export function addTransientClass(el: Element, cls: string) { el.classList.add(cls); TRANSIENT.push([el, cls]); }

/* ---------------- 렌더 ---------------- */
export let AFTER: Array<() => void> = [];
let LAST_PATH: string | null = null;
export function render() {
  const { path } = parseHash();
  setCurOrg(curOrgOf(ST.persona));
  const f = captureFocus();
  flushApp();
  TRANSIENT.splice(0).forEach(([el, cls]) => { if (el.closest('#app')) el.classList.remove(cls); });
  if (path !== LAST_PATH) { LAST_PATH = path; document.querySelectorAll<HTMLElement>('#app .content').forEach((c) => { c.scrollTop = 0; }); }
  restoreFocus(f);
  syncTip();
  const fns = AFTER; AFTER = []; fns.forEach((fn) => fn());
  flushPanel();
}
