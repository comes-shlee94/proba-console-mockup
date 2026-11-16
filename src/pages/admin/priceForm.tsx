/* ---------- 단가 입력 공통 (등록 · 단가 변경 · 기간 할인) ---------- */
import type { ReactNode } from 'react';
import type { Change, PriceKey, PriceVersion, TierKey, TierPrice } from '../../types';
import { Check, Input, act, ctxK, field, inp, usdp } from '../../core';
import { PRICE_ROWS, TIERS } from './models';

/** 단가 입력칸 값 (문자열 · 빈 값 = 별도 단가 없음) */
export type PF = Record<PriceKey, string>;
/** 단가 입력 오류: price = { 'short.in': 1, … } (빨간 칸) · priceMsg = 표 아래 문구 · threshold = Long 구간 기준 */
export type PriceErr = { price?: Record<string, number>; priceMsg?: string; threshold?: string };
/** 단가 입력 공통 상태 (모델 등록 · 단가 변경 · 기간 할인 오버레이 상태에 포함) */
export interface PriceForm { tiered: boolean; threshold: string; p: Record<TierKey, PF>; err: PriceErr }

export function priceStr(v: number | null | undefined) { return v == null ? '' : String(v); }
export function emptyP(): PF { return { in: '', out: '', cw: '', cr: '' }; }
export function pfOf(v: PriceVersion, t: TierKey): PF { return v.price[t] ? { in: priceStr(v.price[t]!.in), out: priceStr(v.price[t]!.out), cw: priceStr(v.price[t]!.cw), cr: priceStr(v.price[t]!.cr) } : emptyP(); }
// 원본은 여기서 `let PV_SEQ = 100; let PR_SEQ = 100;`을 선언 — 값을 바꾸는 modelDrawer.tsx로 옮김 (import한 바인딩은 읽기 전용)
export function tierFields(s: PriceForm, idp: string, tierAct: string, thIn: string): ReactNode {
  return (
    <>
      <div className="row" style={{ gap: '18px', marginBottom: '10px' }}><label className="radio"><Check type="radio" name={`rg-${tierAct}`} checked={!s.tiered} onClick={act(tierAct, { v: '0' })} /><span><b>단일 단가</b><br /><span className="muted">요청 길이와 관계없이 같은 단가</span></span></label>
        <label className="radio"><Check type="radio" name={`rg-${tierAct}`} checked={s.tiered} onClick={act(tierAct, { v: '1' })} /><span><b>컨텍스트 길이별 단가 (Short · Long)</b><br /><span className="muted">긴 요청에 다른 단가를 적용하는 모델</span></span></label></div>
      {s.tiered ? field('Long 구간 기준', <div className="row" style={{ gap: '8px' }}><span className="muted" style={{ whiteSpace: 'nowrap' }}>요청 입력 토큰 수가</span><Input id={`f-${idp}-th`} className="input num" style={{ width: '140px' }} inputMode="numeric" value={s.threshold} onValue={inp(thIn)} /><span className="muted" style={{ whiteSpace: 'nowrap' }}>초과이면 Long 단가</span></div>, { req: 1, err: s.err.threshold, help: '공급자 가격표의 기준값(예: Claude Haiku 5.5 100K, GPT-6 Luna 272K, Gemini 3.1 Pro 200K) · 캐시 쓰기·읽기 토큰 포함' }) : null}
    </>
  );
}
export function priceGridHtml(s: PriceForm, idp: string, inAct: string, tieredOverride?: boolean): ReactNode {
  const tiered = tieredOverride ?? s.tiered;
  const tiers: [TierKey, string][] = tiered ? TIERS : [['short', '단가']];
  const bad = (t: TierKey, k: PriceKey) => s.err.price && s.err.price[`${t}.${k}`];
  const th = Number(s.threshold) || 0;
  return (
    <table className="price-grid"><thead><tr><th style={{ width: '110px' }}>구분</th>{tiers.map(([t, l], i) => <th key={i}>{t === 'short' && tiered ? <><span className="tier">S</span>Short <span className="faint">{`(≤ ${ctxK(th)})`}</span></> : t === 'long' ? <><span className="tier long">L</span>Long <span className="faint">{`(> ${ctxK(th)})`}</span></> : l}</th>)}</tr></thead><tbody>
      {PRICE_ROWS.map(([k, l], i) => <tr key={i}><td className="lab">{l}{idp !== 'pr' && (k === 'in' || k === 'out') ? <span className="req" style={{ color: 'var(--red-line)' }}>*</span> : idp !== 'pr' ? <small>선택</small> : null}</td>{tiers.map(([t], j) => <td key={j}><Input id={`f-${idp}-${t}-${k}`} className={`input num ${bad(t, k) ? 'err' : ''}`} inputMode="decimal" placeholder={k === 'cw' || k === 'cr' ? '없음' : '0.00'} value={s.p[t][k]} onValue={inp(inAct, { t, k })} /></td>)}</tr>)}</tbody></table>
  );
}
export function validatePrices(s: PriceForm, required = true): PriceErr & { price: Record<string, number> } {
  const err: PriceErr & { price: Record<string, number> } = { price: {} }; const tiers: TierKey[] = s.tiered ? ['short', 'long'] : ['short'];
  tiers.forEach((t) => PRICE_ROWS.forEach(([k]) => { const v = s.p[t][k]; if (required && (k === 'in' || k === 'out') && v === '') err.price[`${t}.${k}`] = 1; else if (v !== '' && !/^\d+(\.\d{1,4})?$/.test(v)) err.price[`${t}.${k}`] = 1; }));
  if (Object.keys(err.price).length) err.priceMsg = '단가는 0 이상의 숫자(소수 넷째 자리까지)로 입력해주세요. 입력·출력 단가는 필수입니다.';
  if (s.tiered && !(Number(s.threshold) > 0)) err.threshold = 'Long 구간 기준 토큰 수를 입력해주세요.';
  return err;
}
export function hasErr(err: PriceErr): boolean { return Object.keys(err).some((k) => (k === 'price' ? Object.keys(err.price!).length : !!err[k as keyof PriceErr])); }
export function buildPrice(s: PriceForm): TierPrice { const tiers: TierKey[] = s.tiered ? ['short', 'long'] : ['short']; const num = (v: string) => (v === '' ? null : Number(v)); const price: TierPrice = {}; tiers.forEach((t) => { price[t] = { in: num(s.p[t].in), out: num(s.p[t].out), cw: num(s.p[t].cw), cr: num(s.p[t].cr) }; }); return price; }
export function diffPrices(a: Pick<PriceVersion, 'tiered' | 'threshold' | 'price'>, b: Pick<PriceVersion, 'tiered' | 'threshold' | 'price'>): Change[] {
  const chg: Change[] = [];
  if (a.tiered !== b.tiered) chg.push(['단가 구간', a.tiered ? 'Short·Long' : '단일', b.tiered ? 'Short·Long' : '단일']);
  if (b.tiered && a.threshold !== b.threshold) chg.push(['Long 구간 기준', a.threshold ? ctxK(a.threshold) : '-', ctxK(b.threshold)]);
  ((b.tiered ? ['short', 'long'] : ['short']) as TierKey[]).forEach((t) => PRICE_ROWS.forEach(([k, l]) => { const x = a.price[t] ? a.price[t]![k] : undefined; const y = b.price[t]![k]; if (x !== y) chg.push([`${b.tiered ? (t === 'short' ? 'Short ' : 'Long ') : ''}${l} 단가`, x == null ? '없음' : usdp(x), y == null ? '없음' : usdp(y)]); }));
  return chg;
}
