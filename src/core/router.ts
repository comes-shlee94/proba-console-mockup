/* ---------------- 라우터 (해시 기반) ---------------- */
import { render } from './runtime';

export function parseHash() {
  const h = location.hash.slice(1) || '/workspace';
  const [path, qs] = h.split('?');
  return { path, q: Object.fromEntries(new URLSearchParams(qs || '')) };
}
export function go(path: string) { if (location.hash.slice(1) === path) render(); else location.hash = path; }
