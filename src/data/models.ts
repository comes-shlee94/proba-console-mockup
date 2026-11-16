import type { Model, ModelSeed, OrgModelSet, PriceKey, PriceVersion, Promo, Px, TierKey, TierPrice } from '../types';
import { NOW_KEY } from './constants';

/* ---------------- AI 모델 (플랫폼 카탈로그) ----------------
   단가: USD / 1M 토큰. in 입력 · out 출력 · cw 캐시 쓰기 · cr 캐시 읽기(null = 별도 단가 없음 → 일반 입력 단가 적용)
   tiered: Short/Long 구간 단가 사용 여부, threshold: Long 기준(요청 입력 토큰 수 초과, 캐시 토큰 포함)
   단가 일정: versions(기본 단가 — 적용 시작 시각별 이력·예약) + promos(기간 할인 — 시작~종료, 할인율 또는 할인 단가)
   단가·컨텍스트는 각 공급자 공식 가격표 기준(2026-11-12 확인) · 캐시 쓰기는 PROBA 기본 유지 시간(Anthropic 5분, OpenAI 30분) 단가 */
export const PROVIDERS: string[] = ['OpenAI', 'Anthropic', 'Google'];
export const PX = (i: number | null, o: number | null, cw: number | null, cr: number | null): Px => ({ in: i, out: o, cw, cr });
export const models: ModelSeed[] = [
  { id: 'MDL-1', name: 'claude-haiku-5-5', label: 'Claude Haiku 5.5', provider: 'Anthropic', context: 1000000, active: true, isDefault: true, activePlans: 14, schedules: 6, createdAt: '2026-10-28', hasHistory: true,
    versions: [{ id: 'PV-1', from: '2026-10-28 09:00', tiered: true, threshold: 100000, price: { short: PX(0.10, 0.50, 0.125, 0.01), long: PX(0.50, 2.50, 0.625, 0.05) }, note: '최초 등록 · Anthropic 가격표(프롬프트 100K 토큰 초과 시 Long 단가)', by: '이서연' }], promos: [] },
  { id: 'MDL-2', name: 'gpt-6-luna', label: 'GPT-6 Luna', provider: 'OpenAI', context: 1050000, active: true, isDefault: false, activePlans: 9, schedules: 4, createdAt: '2026-10-13', hasHistory: true,
    versions: [{ id: 'PV-2', from: '2026-10-13 10:00', tiered: true, threshold: 272000, price: { short: PX(0.10, 0.50, 0.125, 0.01), long: PX(0.20, 0.75, 0.25, 0.02) }, note: '최초 등록 · OpenAI 가격표(272K 토큰 초과 시 입력·캐시 2배, 출력 1.5배)', by: '이서연' }], promos: [] },
  { id: 'MDL-3', name: 'gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro (Preview)', provider: 'Google', context: 1048576, active: true, isDefault: false, activePlans: 5, schedules: 2, createdAt: '2026-09-15', hasHistory: true,
    versions: [{ id: 'PV-3', from: '2026-09-15 14:00', tiered: true, threshold: 200000, price: { short: PX(2.00, 12.00, null, 0.20), long: PX(4.00, 18.00, null, 0.40) }, note: '최초 등록 · Google 가격표(프롬프트 200K 토큰 초과 시 Long 단가)', by: '한지민' }], promos: [] },
  { id: 'MDL-4', name: 'gpt-4o', label: 'GPT-4o', provider: 'OpenAI', context: 128000, active: false, isDefault: false, activePlans: 0, schedules: 0, createdAt: '2026-03-10', hasHistory: true, deactivatedAt: '2026-11-09', retiresAt: '2027-01-14',
    versions: [{ id: 'PV-4', from: '2026-03-10 10:00', tiered: false, threshold: null, price: { short: PX(2.50, 10.00, null, 1.25) }, note: '최초 등록', by: '이서연' }], promos: [] },
  { id: 'MDL-5', name: 'gpt-5-nano', label: 'GPT-5 nano', provider: 'OpenAI', context: 400000, active: true, isDefault: false, activePlans: 1, schedules: 0, createdAt: '2026-03-10', hasHistory: true, retiresAt: '2026-12-11',
    versions: [{ id: 'PV-5', from: '2026-03-10 10:00', tiered: false, threshold: null, price: { short: PX(0.05, 0.40, null, 0.005) }, note: '최초 등록', by: '이서연' }], promos: [] },
  { id: 'MDL-6', name: 'gpt-5.6-sol', label: 'GPT-5.6 Sol', provider: 'OpenAI', context: 1050000, active: true, isDefault: false, activePlans: 3, schedules: 1, createdAt: '2026-07-20', hasHistory: true,
    versions: [{ id: 'PV-6', from: '2026-07-20 10:00', tiered: true, threshold: 272000, price: { short: PX(5.00, 30.00, 6.25, 0.50), long: PX(10.00, 45.00, 12.50, 1.00) }, note: '최초 등록 · OpenAI 가격표(정가)', by: '이서연' }],
    promos: [{ id: 'PR-1', title: 'OpenAI 기간 한정 가격', from: '2026-08-21 00:00', to: '2026-11-30 23:59', hours: null, mode: 'fixed', price: { short: PX(4.00, 20.00, 5.00, 0.40), long: PX(8.00, 30.00, 10.00, 0.80) }, note: 'OpenAI 공지 — 입력 20%·출력 33% 인하, 2026-11-30까지', by: '이서연', createdAt: '2026-08-21 09:30' }] },
];
// ---- 단가 일정 계산 (요청 시각 t 기준) ----
export const PRICE_KEYS: PriceKey[] = ['in', 'out', 'cw', 'cr'];
export const r4 = (n: number): number => Math.round(n * 10000) / 10000;
export function baseAt(m: ModelSeed, t: string = NOW_KEY): PriceVersion { // t 시점에 적용되는 기본 단가 버전(가장 최근에 시작된 것)
  const vs = m.versions.filter((v) => !v.canceled && v.from <= t).sort((a, b) => (a.from < b.from ? 1 : -1));
  return vs[0] || m.versions.filter((v) => !v.canceled)[0];
}
export function inHours(p: Promo, t: string): boolean { if (!p.hours) return true; const hm = t.slice(11, 16); const [a, b] = p.hours; return a <= b ? hm >= a && hm < b : hm >= a || hm < b; }
// 기간 할인: from ≤ t ≤ to (분 단위, 종료 분 포함) · 조기 종료(endedAt) 시각부터는 미적용
export function promoAt(m: ModelSeed, t: string = NOW_KEY): Promo | undefined { return (m.promos || []).find((p) => !p.canceled && p.from <= t && t <= p.to && (!p.endedAt || t < p.endedAt) && inHours(p, t)); }
export function applyPromo(base: PriceVersion, p: Promo | undefined): TierPrice {
  const out: Record<string, Record<string, number | null>> = {};
  (Object.keys(base.price) as TierKey[]).forEach((t) => {
    out[t] = {};
    PRICE_KEYS.forEach((k) => {
      const b = base.price[t]![k];
      if (!p) out[t][k] = b;
      else if (p.mode === 'fixed') out[t][k] = p.price![t] && p.price![t]![k] != null ? p.price![t]![k] : b;
      else out[t][k] = b == null ? null : p.items!.includes(k) ? r4(b * (1 - p.rate! / 100)) : b;
    });
  });
  return out as TierPrice;
}
export function effPrice(m: ModelSeed, t: string = NOW_KEY) { const base = baseAt(m, t); const p = promoAt(m, t); return { tiered: base.tiered, threshold: base.threshold, price: applyPromo(base, p), base, promo: p }; }
export function syncModel(m: Model): void { const b = baseAt(m); m.tiered = b.tiered; m.threshold = b.threshold; m.price = b.price; }
export const nextVersion = (m: ModelSeed): PriceVersion | undefined => m.versions.filter((v) => !v.canceled && v.from > NOW_KEY).sort((a, b) => (a.from > b.from ? 1 : -1))[0];
export const nextPromo = (m: ModelSeed): Promo | undefined => (m.promos || []).filter((p) => !p.canceled && p.from > NOW_KEY).sort((a, b) => (a.from > b.from ? 1 : -1))[0];

// 조직별 모델 사용 설정 (사용 모델 · 조직 기본 모델 · 모델별 활성 평가 계획 수)
export const ORG_MODELS: Record<string, OrgModelSet> = {
  'ORG-1': { on: ['claude-haiku-5-5', 'gpt-6-luna', 'gemini-3.1-pro-preview', 'gpt-5.6-sol'], def: 'claude-haiku-5-5', plans: { 'claude-haiku-5-5': 6, 'gpt-6-luna': 2, 'gemini-3.1-pro-preview': 3, 'gpt-5.6-sol': 1 } },
  'ORG-2': { on: ['gpt-6-luna', 'claude-haiku-5-5'], def: 'gpt-6-luna', plans: { 'gpt-6-luna': 3, 'claude-haiku-5-5': 1 } },
  'ORG-3': { on: ['claude-haiku-5-5'], def: 'claude-haiku-5-5', plans: { 'claude-haiku-5-5': 2 } },
  'ORG-4': { on: ['gemini-3.1-pro-preview', 'claude-haiku-5-5', 'gpt-5.6-sol'], def: 'gemini-3.1-pro-preview', plans: { 'gemini-3.1-pro-preview': 2, 'claude-haiku-5-5': 3, 'gpt-5.6-sol': 2 } },
  'ORG-5': { on: ['claude-haiku-5-5', 'gpt-6-luna'], def: 'claude-haiku-5-5', plans: { 'claude-haiku-5-5': 1, 'gpt-6-luna': 1 } },
  'ORG-6': { on: ['claude-haiku-5-5'], def: 'claude-haiku-5-5', plans: { 'claude-haiku-5-5': 1 } },
  'ORG-7': { on: ['claude-haiku-5-5'], def: 'claude-haiku-5-5', plans: {} },
  'ORG-8': { on: ['gpt-6-luna'], def: 'gpt-6-luna', plans: { 'gpt-6-luna': 2 } },
  'ORG-9': { on: ['gpt-6-luna'], def: 'gpt-6-luna', plans: { 'gpt-6-luna': 1 } },
  'ORG-10': { on: ['claude-haiku-5-5'], def: 'claude-haiku-5-5', plans: {} },
  'ORG-11': { on: ['claude-haiku-5-5'], def: 'claude-haiku-5-5', plans: {} },
  'ORG-12': { on: ['gpt-6-luna', 'gpt-5-nano'], def: 'gpt-6-luna', plans: { 'gpt-5-nano': 1 } },
};
