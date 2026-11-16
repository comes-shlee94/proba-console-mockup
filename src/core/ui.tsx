/* ---------------- 공통 UI 조각 ---------------- */
import type { ReactNode } from 'react';
import type { Account, Membership, Org, PlanKey } from '../types';
import { ACCT_STATUS, MEM_STATUS, ORG_STATUS, PLANS } from '../data';
import { icon } from './icons';
import { ST } from './state';
import { ddayOf } from './util';
import { ACT, CH } from './registry';
import { act, ch } from './events';
import { Select, type SelectProps } from './form';
import { render } from './runtime';

export const badge = (t: string, v: string, dot?: boolean | number) => <span className={`badge ${v}${dot ? ' dot' : ''}`}>{t}</span>;
export const planBadge = (p: PlanKey) => <span className={`plan ${p.toLowerCase()}`}>{PLANS[p].label}</span>;
export const orgStatusBadge = (o: Org) => badge(ORG_STATUS[o.status][0], ORG_STATUS[o.status][1], true);
export const acctBadge = (a: Account) => (a.status === 'LOCKED' ? <span className="badge b-amber">{icon('lock', 'sm')}잠김</span> : badge(ACCT_STATUS[a.status][0], ACCT_STATUS[a.status][1], true));
export const memBadge = (m: Membership) => badge(MEM_STATUS[m.status][0], MEM_STATUS[m.status][1], true);
export const initials = (n: string | null | undefined) => String(n || '?').slice(0, 1);
export const AV_COLORS = ['#6155f5', '#00a3ae', '#e0752d', '#3c7be0', '#c2457a', '#5a8f29', '#7d5bd0', '#2f9e8f'];
export const avatar = (a: Pick<Account, 'id' | 'name'> | null | undefined, cls = '') => {
  const id = a?.id || 'x';
  return <span className={`avatar ${cls}`} style={{ background: AV_COLORS[id.charCodeAt(id.length - 1) % AV_COLORS.length] }}>{initials(a?.name)}</span>;
};
export function userCell(a: Account, self?: boolean) {
  return <div className="row" style={{ gap: '10px', minWidth: '0' }}>{avatar(a, 'sm')}<div className="two"><span className="p">{a.name}{self ? <span className="self-tag">(본인)</span> : null}</span><span className="s">{a.email}</span></div></div>;
}

// Trial 만료일 표시: 남은 일수(D-n, 7일 이하 빨강) 또는 만료됨
export const trialDday = (o: Org, pre = '') => { const d = ddayOf(o.trialEndsAt!); return d < 0 ? <span className="dday red">만료됨</span> : <span className={`dday ${d <= 7 ? 'red' : ''}`}>{`${pre}D-${d}`}</span>; };

/* ---------------- select ----------------
   원본 sel(name, opts, val, attrs): class="select" 고정 · val과 같은 옵션을 selected로 표시 (name은 사용하지 않음) */
export type SelOpt = [string | number, string];
export type SelAttrs = Omit<SelectProps, 'value' | 'children' | 'className'>;
export function sel(name: string, opts: SelOpt[], val: unknown, attrs: SelAttrs = {}) {
  void name;
  return (
    <Select {...attrs} className="select" value={val == null ? null : String(val)}>
      {opts.map(([v, l], i) => <option key={i} value={String(v)}>{l}</option>)}
    </Select>
  );
}

// 목록 페이지네이션(v0.7): 페이지 크기 선택(20·50·100개씩)은 표 위 목록 메타 오른쪽, 페이지 이동은 표 아래 가운데
// 상태는 목록마다 ST.ui[key].page · size — 필터·검색·페이지 크기가 바뀌면 1페이지로
export const PAGE_SIZES = [20, 50, 100];
export interface Paged { page: number; size: number }
export function paginate<T>(list: T[], u: Paged) {
  const size = PAGE_SIZES.includes(u.size) ? u.size : PAGE_SIZES[0];
  const pages = Math.max(1, Math.ceil(list.length / size));
  if (!(u.page >= 1)) u.page = 1;
  if (u.page > pages) u.page = pages;
  return { size, pages, view: list.slice((u.page - 1) * size, u.page * size) };
}
export const pageSizeSel = (key: string, size: number) => <span className="pgsize">{sel('ps', PAGE_SIZES.map((n): SelOpt => [n, `${n}개씩 보기`]), size, { onChange: ch('pgSize', { k: key }), 'aria-label': '페이지당 행 수' })}</span>;
export function pager(total: number, page: number, size: number, key: string) {
  const pages = Math.max(1, Math.ceil(total / size));
  return <div className="pager"><div className="pill"><button onClick={act('pgGo', { k: key, p: String(page - 1) })} disabled={page <= 1} aria-label="이전 페이지">{icon('left')}</button><span className="pg">{`${page} / ${pages}`}</span><button onClick={act('pgGo', { k: key, p: String(page + 1) })} disabled={page >= pages} aria-label="다음 페이지">{icon('right')}</button></div></div>;
}
const pagedUi = (k: string) => (ST.ui as unknown as Record<string, Paged>)[k];
// 페이지 이동: 표 위쪽이 화면 밖이면 목록 메타가 보이도록 스크롤
ACT.pgGo = (d) => { pagedUi(d.k).page = Number(d.p); render(); const m = document.querySelector('.tbl-meta'); if (m && m.getBoundingClientRect().top < 0) m.scrollIntoView({ block: 'start' }); };
CH.pgSize = (v, _el, _e, d) => { const u = pagedUi(d!.k); u.size = Number(v); u.page = 1; render(); };

export const notice = (html: ReactNode, type = '', ic = 'info') => <div className={`notice ${type}`}>{icon(ic === 'alert' ? 'alert' : 'info')}<div>{html}</div></div>;
export interface FieldOpts { req?: boolean | number; help?: ReactNode; err?: string | null | false; cls?: string }
export const field = (label: ReactNode, input: ReactNode, { req, help, err, cls = '' }: FieldOpts = {}) => (
  <div className={`field ${err ? 'invalid' : ''} ${cls}`}><label>{label}{req ? <span className="req">*</span> : null}</label>{input}{err ? <span className="err">{icon('alert', 'sm')}{err}</span> : help ? <span className="help">{help}</span> : null}</div>
);
