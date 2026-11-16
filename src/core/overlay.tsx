/* ---------------- 오버레이 (모달 · 드로어) ---------------- */
import type { ReactNode } from 'react';
import { icon } from './icons';
import { ACT } from './registry';
import { act } from './events';
import { captureFocus, flushOverlays, keepStyleAttr, restoreFocus } from './runtime';
import { syncTip } from './tooltip';

/** view(state)가 돌려주는 화면 조각 */
export interface OverlayView {
  title?: ReactNode;
  /** 드로어: 제목 아래 보조 문구 */
  sub?: ReactNode;
  /** 드로어: 머리 영역 전체를 직접 구성 */
  head?: ReactNode;
  /** 모달: 제목 앞 아이콘 */
  icon?: string;
  iconType?: string;
  body?: ReactNode;
  foot?: ReactNode;
}
/** openOverlay에 넘기는 값 (원본과 같이 필요한 값을 자유롭게 더 넣을 수 있음) */
export interface OverlaySpec<S = any> {
  width?: number;
  drawer?: boolean;
  state?: S;
  view: (s: S) => OverlayView;
  onConfirm?: () => void;
  [extra: string]: unknown;
}
export interface Overlay<S = any> extends OverlaySpec<S> {
  state: S;
  _k?: number;
}

export const OV: { stack: Overlay[]; seq: number } = { stack: [], seq: 0 };
export function openOverlay<S = any>(spec: OverlaySpec<S>) {
  const o = spec as Overlay<S>;
  o.state = o.state || ({} as S); o._k = ++OV.seq; OV.stack.push(o); renderOverlays();
  setTimeout(() => { const el = document.querySelector<HTMLElement>('#overlay-root [autofocus]'); if (el) el.focus(); }, 0);
}
export function closeOverlay() { OV.stack.pop(); renderOverlays(); }
export function topOverlay(): Overlay | undefined { return OV.stack[OV.stack.length - 1]; }
export function refreshOverlay() { const f = captureFocus(); renderOverlays(); restoreFocus(f); }
export function renderOverlays() { flushOverlays(); syncTip(); }
/** 맨 위 오버레이의 상태 */
export const ovs = <S = any>(): S => topOverlay()!.state as S;

export function Overlays() {
  return (
    <>
      {OV.stack.map((o) => {
        const v = o.view(o.state);
        if (o.drawer) {
          return (
            <div className="ovl drawer-ovl" key={`ov-${o._k}`}><div className="drawer" ref={keepStyleAttr} style={o.width ? { width: `${o.width}px` } : undefined} role="dialog" aria-modal="true">
              <div className="drawer-h">{v.head || <div><h2>{v.title}</h2>{v.sub ? <div className="s">{v.sub}</div> : null}</div>}<button className="icon-btn x" onClick={act('closeOv')} aria-label="닫기">{icon('x')}</button></div>
              <div className="drawer-b">{v.body}</div>{v.foot ? <div className="drawer-f">{v.foot}</div> : null}</div></div>
          );
        }
        const iconHtml = v.icon ? <span className={`mi ${v.iconType || 'info'}`}>{icon(v.icon, 'lg')}</span> : null;
        return (
          <div className="ovl" key={`ov-${o._k}`}><div className={`modal ${o.width ? 'w' + o.width : ''}`} role="dialog" aria-modal="true">
            <div className="modal-h">{iconHtml}<div><h2>{v.title}</h2></div><button className="icon-btn x" onClick={act('closeOv')} aria-label="닫기">{icon('x')}</button></div>
            <div className="modal-b">{v.body}</div><div className="modal-f">{v.foot}</div></div></div>
        );
      })}
    </>
  );
}

export interface ConfirmOpts { title: ReactNode; body: ReactNode; confirmLabel?: string; danger?: boolean; icon?: string; onConfirm?: () => void; width?: number }
export function confirmModal({ title, body, confirmLabel = '확인', danger = false, icon: ic, onConfirm, width }: ConfirmOpts) {
  openOverlay({
    width,
    view: () => ({
      title, icon: ic || (danger ? 'alert' : 'info'), iconType: danger ? 'danger' : 'info', body,
      foot: <><button className="btn btn-secondary" onClick={act('closeOv')}>취소</button><button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={act('ovConfirm')}>{confirmLabel}</button></>,
    }),
    onConfirm,
  });
}

ACT.closeOv = () => closeOverlay();
ACT.ovConfirm = () => { const o = topOverlay()!; closeOverlay(); o.onConfirm && o.onConfirm(); };
