/* ==========================================================
   Core: 유틸 (포맷 · 조사 · 날짜)
   ========================================================== */
import { NOW } from '../data/constants';

export const $ = <T extends Element = HTMLElement>(s: string, el: ParentNode = document) => el.querySelector<T>(s);
/** 원본의 HTML 이스케이프. React는 텍스트를 자동으로 이스케이프하므로, 원본이 이스케이프된 문자열을
 *  다시 이스케이프하는 곳(화면에 &amp; 등이 그대로 보이는 경우)을 똑같이 재현할 때만 사용 */
export const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);
export const fmt = (n: number | null | undefined) => (n == null || Number.isNaN(n) ? '-' : Math.round(n).toLocaleString('ko-KR'));
export const fmt1 = (n: number | null | undefined) => (n == null ? '-' : (Math.round(n * 10) / 10).toLocaleString('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }));
export const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100; // 센트 단위 반올림
export const usd = (n: number) => '$' + r2(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
// 단가 표기: 소수 2자리 기본, 필요한 경우 4자리까지 (예: $0.125, $0.005)
export const usdp = (n: number | null | undefined) => { if (n == null) return '-'; const v = Math.round(n * 10000) / 10000; const t = v.toFixed(4).replace(/0{1,2}$/, '').replace(/(\.\d\d)0$/, '$1'); return '$' + t; };
export const ctxK = (n: number | null | undefined) => (!n ? '-' : n >= 1000000 ? +(n / 1000000).toFixed(2) + 'M' : Math.round(n / 1000) + 'K');
export const EMAIL_RE = /^[^\s@,]+@[^\s@,]+\.[A-Za-z]{2,}$/;
export const NAME_RE = /^[가-힣A-Za-z0-9]+( [가-힣A-Za-z0-9]+)*$/;

/* 조사 처리: 을/를, 이/가, 은/는, 으로/로 (영문·숫자 끝은 발음 기준 근사) */
export function hasJong(word: string): boolean {
  const w = String(word).trim();
  const last = w.charCodeAt(w.length - 1);
  if (last >= 0xac00 && last <= 0xd7a3) return (last - 0xac00) % 28 !== 0;
  const ch = w[w.length - 1].toLowerCase();
  if ('0136789'.includes(ch)) return true; // 영·일·삼·육·칠·팔·구(구는 X → 예외 처리)
  return 'lmn'.includes(ch);
}
export function josa(word: string, pair: string): string {
  const [a, b] = pair.split('/');
  const w = String(word).trim();
  if (pair === '으로/로') {
    const c = w.charCodeAt(w.length - 1);
    const jong = c >= 0xac00 && c <= 0xd7a3 ? (c - 0xac00) % 28 : -1;
    return word + (jong === 0 || jong === 8 || (jong === -1 && !hasJong(w)) ? '로' : '으로');
  }
  const j = /9$/.test(w) ? false : hasJong(w);
  return word + (j ? a : b);
}

const NOW_MS = NOW.getTime(); // 기준 시각 2026-11-11 10:45 (KST)
export function ddayOf(dateStr: string): number { return Math.round((new Date(dateStr.slice(0, 10) + 'T00:00:00+09:00').getTime() - new Date('2026-11-11T00:00:00+09:00').getTime()) / 86400000); }
let CLOCK = 0;
export function nowStr(): string { const d = new Date(NOW_MS + (++CLOCK) * 60000); const p = (x: number) => String(x).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`; }
export function addDays(dateStr: string, n: number): string { const d = new Date(dateStr.slice(0, 10) + 'T12:00:00+09:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }
// 남은 시간 (초대 유효기간 1일 기준 표기)
export function leftOf(s: string): string {
  const m = (new Date(s.replace(' ', 'T') + '+09:00').getTime() - NOW_MS) / 60000;
  if (m <= 0) return '만료됨';
  if (m < 60) return Math.ceil(m) + '분 남음';
  if (m < 2880) return Math.floor(m / 60) + '시간 남음';
  return Math.floor(m / 1440) + '일 남음';
}
export const minsLeft = (s: string) => (new Date(s.replace(' ', 'T') + '+09:00').getTime() - NOW_MS) / 60000;
export function relTime(s: string | null | undefined): string {
  if (!s) return '-';
  const diff = (NOW_MS - new Date(s.replace(' ', 'T') + '+09:00').getTime()) / 60000;
  if (diff < 1) return '방금 전';
  if (diff < 60) return Math.round(diff) + '분 전';
  if (diff < 1440) return Math.round(diff / 60) + '시간 전';
  if (diff < 1440 * 7) return Math.round(diff / 1440) + '일 전';
  return s.slice(0, 10);
}

export const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));
