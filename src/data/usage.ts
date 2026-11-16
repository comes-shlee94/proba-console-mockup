import type { BadgeDef, MonthDef, UsageRec } from '../types';

/* ---------------- 사용량 ----------------
   lqa: [평가 회차, 채점 건수]  fqa: [실행 회차, 러너 h]  load: [측정 회차, 워커 h]  app: [측정 회차, 단말 h]
   llm: 모델별 사용 금액(USD, 10월 기준값 — 요청 시각의 단가(기간 할인 포함) · Short/Long 구간 · 캐시 단가가 반영된 금액) */
export const USAGE_BASE: Record<string, UsageRec> = {
  'ORG-1': { lqa: [312, 4860], fqa: [1140, 286.5], load: [14, 31.2], app: [46, 78.0], llm: { 'claude-haiku-5-5': 3.12, 'gpt-6-luna': 0.98, 'gemini-3.1-pro-preview': 86.40, 'gpt-5.6-sol': 18.40 } },
  'ORG-2': { lqa: [96, 1420], fqa: [520, 131.0], load: [6, 12.5], app: [0, 0], llm: { 'gpt-6-luna': 2.86, 'claude-haiku-5-5': 1.94 } },
  'ORG-3': { lqa: [41, 610], fqa: [233, 58.2], load: [0, 0], app: [12, 20.4], llm: { 'claude-haiku-5-5': 1.18 } },
  'ORG-4': { lqa: [188, 2950], fqa: [410, 102.4], load: [8, 18.0], app: [0, 0], llm: { 'gpt-4o': 152.30, 'gemini-3.1-pro-preview': 118.60, 'claude-haiku-5-5': 1.42, 'gpt-5.6-sol': 26.80 } },
  'ORG-5': { lqa: [77, 1150], fqa: [0, 0], load: [0, 0], app: [0, 0], llm: { 'claude-haiku-5-5': 1.05, 'gpt-6-luna': 1.02 } },
  'ORG-6': { lqa: [18, 260], fqa: [34, 7.5], load: [0, 0], app: [0, 0], llm: { 'claude-haiku-5-5': 0.48 } },
  'ORG-7': { lqa: [0, 0], fqa: [0, 0], load: [0, 0], app: [0, 0], llm: {} },
  'ORG-8': { lqa: [120, 1800], fqa: [260, 66.0], load: [4, 9.6], app: [22, 36.5], llm: { 'gpt-4o': 61.20, 'gpt-6-luna': 2.14 } },
  'ORG-9': { lqa: [25, 370], fqa: [60, 14.0], load: [0, 0], app: [0, 0], llm: { 'gpt-6-luna': 0.61 } },
  'ORG-10': { lqa: [30, 450], fqa: [310, 77.8], load: [2, 4.4], app: [30, 51.0], llm: { 'claude-haiku-5-5': 0.74 } },
  'ORG-11': { lqa: [4, 56], fqa: [8, 1.6], load: [0, 0], app: [0, 0], llm: { 'claude-haiku-5-5': 0.09 } },
  'ORG-12': { lqa: [12, 180], fqa: [88, 20.3], load: [0, 0], app: [0, 0], llm: { 'gpt-6-luna': 0.31, 'gpt-5-nano': 0.09 } },
};
export const MONTHS: MonthDef[] = [
  { key: '2026-11', label: '2026년 11월', status: 'OPEN', note: '2026-11-11 10:45 기준 · 5분마다 갱신' },
  { key: '2026-10', label: '2026년 10월', status: 'CLOSED', note: '2026-11-01 06:00 마감' },
  { key: '2026-09', label: '2026년 9월', status: 'CLOSED', note: '2026-10-01 06:00 마감' },
];
export const MONTH_STATUS: Record<string, BadgeDef> = { OPEN: ['진행 중', 'b-blue'], CLOSED: ['마감', 'b-teal'] };
export const MONTH_FACTOR: Record<string, Record<string, number>> = {
  '2026-11': { default: 0.36, 'ORG-6': 0.62, 'ORG-8': 0.03, 'ORG-9': 0.12, 'ORG-4': 0.33 },
  '2026-10': { default: 1 },
  '2026-09': { default: 0.88, 'ORG-6': 0, 'ORG-12': 0.55, 'ORG-11': 0 },
};
export const EXTRA_NOV: Record<string, UsageRec> = { 'ORG-7': { lqa: [2, 24], fqa: [0, 0], load: [0, 0], app: [0, 0], llm: { 'claude-haiku-5-5': 0.04 } }, 'ORG-11': { lqa: [6, 84], fqa: [12, 2.8], load: [0, 0], app: [0, 0], llm: { 'claude-haiku-5-5': 0.13 } } };
