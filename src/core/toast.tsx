/* ---------------- 토스트 ---------------- */
import { icon } from './icons';
import { flushLayers } from './runtime';

let TOASTS: { id: number; msg: string; type: string }[] = [];
let TSEQ = 0;
export function toast(msg: string, type = 'success') {
  const id = ++TSEQ;
  TOASTS = [...TOASTS, { id, msg, type }];
  flushLayers();
  setTimeout(() => { TOASTS = TOASTS.filter((t) => t.id !== id); flushLayers(); }, type === 'error' ? 5000 : 3200);
}
export function Toasts() {
  return <>{TOASTS.map((t) => <div key={t.id} className={'toast ' + t.type}>{icon(t.type === 'success' ? 'check' : t.type === 'info' ? 'info' : 'alert')}<span>{t.msg}</span></div>)}</>;
}
