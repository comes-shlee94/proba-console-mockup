/* ==========================================================
   Core: 이벤트 — 원본의 문서 단위 이벤트 위임 규칙을 요소별 React 핸들러로 재현
   ========================================================== */
import type { MouseEvent as ReactMouseEvent } from 'react';
import { ACT, CH, IN, type Data } from './registry';
import { closeMenu } from './menu';

// 한글 등 IME 조합 중에는 상태 갱신·다시 그리기를 하지 않고, 조합이 끝났을 때 한 번 처리 (자음·모음 분리 방지)
let COMPOSING = false;
export const isComposing = () => COMPOSING;
export const setComposing = (v: boolean) => { COMPOSING = v; };

/**
 * 클릭 동작 (원본 data-act="name" + data-*).
 * 원본 규칙: 클릭한 곳에서 가장 가까운 data-act 요소 하나만 처리하고 문서 클릭 처리(메뉴 닫기 등)로 넘어가지 않음 ·
 * 비활성 요소는 무시 · 요소 안의 입력칸·선택 상자를 누른 경우는 무시 · 라디오·체크박스가 아니면 기본 동작을 막음 ·
 * 행 메뉴 밖의 동작이면 먼저 메뉴를 닫음
 */
export function act(name: string, d: Data = {}) {
  return (e: ReactMouseEvent<Element>) => {
    const t = e.currentTarget as HTMLElement;
    e.stopPropagation();
    if ((t as HTMLButtonElement).disabled || t.classList.contains('disabled')) return;
    const target = e.target as Element;
    const inner = target.closest ? target.closest('select, input, textarea') : null;
    if (target !== t && inner && t.contains(inner)) return;
    const fn = ACT[name];
    if (!fn) return;
    // 라디오·체크박스는 기본 동작(선택 표시)을 막지 않음 — 막으면 처리 후 브라우저가 선택을 되돌려 선택 표시가 사라지거나 이전 항목이 다시 선택됨
    if (!t.matches('input[type="radio"], input[type="checkbox"]')) e.preventDefault();
    if (!t.closest('.menu')) closeMenu();
    fn(d, t, e.nativeEvent);
  };
}

/** 입력 동작 (원본 data-in="name") — <Input onValue={inp('name')} /> */
export function inp(name: string, d: Data = {}) {
  return (v: string, el?: HTMLInputElement | HTMLTextAreaElement, e?: Event) => { const fn = IN[name]; if (fn) fn(v, el, e, d); };
}

/** 선택 변경 동작 (원본 data-ch="name") — <Select onChange={ch('name')} /> · 날짜 입력은 <Input onCommit={ch('name')} /> */
export function ch(name: string, d: Data = {}) {
  return (v: string, el?: HTMLSelectElement | HTMLInputElement, e?: Event) => { const fn = CH[name]; if (fn) fn(v, el, e, d); };
}

/** Enter 키 동작 (원본 data-enter="name") — <Input onEnter={enter('name')} /> */
export function enter(name: string, d: Data = {}) {
  return (el: HTMLElement, e: KeyboardEvent) => { const fn = ACT[name]; if (fn) { e.preventDefault(); fn(d, el, e); } };
}
