/* ==========================================================
   서비스 관리자 콘솔 · AI 모델 (SA-30 · 31 · 34) · 사용량·사용 금액 (SA-40 · 41 · 42) · 감사 로그 (SA-50 · 51)
   ========================================================== */
/* 포팅 메모: 원본에서 한 덩어리 문자열이던 글자는 템플릿 문자열 하나로 그림 — 텍스트 노드가 나뉘면 글자 위치가 미세하게 달라짐 */
import { Fragment, type ReactNode } from 'react';
import type { Change, Model, PriceKey, Promo, TierKey, TierPrice } from '../../types';
import { PROVIDERS, effPrice, nextPromo, nextVersion } from '../../data';
import {
  ACT, CH, IN, OV, ST, Check, Input, act, addAudit, ch, confirmModal, ctxK, fmt, icon, inp, josa, notice,
  openMenu, openOverlay, orgById, ovs, pageHead, refreshOverlay, render, renderOverlays, sel, toast, usdp,
  type Page, type SelOpt,
} from '../../core';
import { openModelDrawer } from './modelDrawer';

export const TIERS: [TierKey, string][] = [['short', 'Short'], ['long', 'Long']];
export const PRICE_ROWS: [PriceKey, string][] = [['in', '입력'], ['out', '출력'], ['cw', '캐시 쓰기'], ['cr', '캐시 읽기']];
export function modelByName(n: string): Model | undefined { return ST.models.find((x) => x.name === n); }
export function orgsUsing(name: string): string[] { return Object.entries(ST.orgModels).filter(([id, v]) => orgById(id) && v.on.includes(name)).map(([id]) => id); }
export function orgsDefault(name: string): string[] { return Object.entries(ST.orgModels).filter(([id, v]) => orgById(id) && v.def === name).map(([id]) => id); }
export function serviceDefault(): Model | undefined { return ST.models.find((m) => m.isDefault); }
export function tag(cls: string, text: ReactNode, tip?: string) { return <span className={`ptag ${cls}`} data-tip={tip ? tip : undefined}>{text}</span>; }
export function priceLines(m: { tiered: boolean; price: TierPrice }, keys: [PriceKey, string][], fmtFn: (n: number | null | undefined) => string) {
  // 원본: keys.map(([k, l]) => `${l} ${없음 표시 또는 단가}`).join(' · ') — 이어지는 글자는 한 텍스트 노드로
  const line = (t: TierKey) => {
    const out: ReactNode[] = []; let txt = '';
    keys.forEach(([k, l], i) => {
      txt += `${i > 0 ? ' · ' : ''}${l} `;
      if (m.price[t]![k] == null) { out.push(txt, <span className="faint">없음</span>); txt = ''; } else txt += fmtFn(m.price[t]![k]);
    });
    if (txt) out.push(txt);
    return out.map((x, j) => <Fragment key={j}>{x}</Fragment>);
  };
  if (!m.tiered) return <span>{line('short')}</span>;
  return <div className="price-cell"><span><span className="tier">S</span>{line('short')}</span><span><span className="tier long">L</span>{line('long')}</span></div>;
}
// 단가 요약(입력·출력) — 일정 표·툴팁용
export function priceSummary(v: { tiered: boolean; price: TierPrice }, all?: boolean): string {
  const one = (t: TierKey) => PRICE_ROWS.filter(([k]) => all || k === 'in' || k === 'out').map(([k, l]) => `${l} ${v.price[t]![k] == null ? '없음' : usdp(v.price[t]![k])}`).join(' · ');
  return v.tiered ? `S ${one('short')} / L ${one('long')}` : one('short');
}
export function promoSummary(p: Promo, base: { tiered: boolean }): string {
  const hrs = p.hours ? ` · 매일 ${p.hours[0]}~${p.hours[1]}` : '';
  if (p.mode === 'percent') return `${p.items!.map((k) => PRICE_ROWS.find((r) => r[0] === k)![1]).join('·')} ${p.rate}% 할인${hrs}`;
  return `할인 단가 ${priceSummary({ tiered: base.tiered, price: p.price! })}${hrs}`;
}
/** 원본은 .join('') 문자열 — 빈 항목('')은 빠지고, 모두 비면 빈 목록(호출하는 쪽에서 ptags 영역을 그리지 않음) */
export function priceTags(m: Model): ReactNode[] {
  const e = effPrice(m); const nv = nextVersion(m); const np = nextPromo(m);
  return [
    e.promo ? tag('promo', <>{icon('zap', 'sm')}{`할인 중 ~${e.promo.to.slice(5, 10)}`}</>, `${e.promo.title} · 할인 전 기본 단가: ${priceSummary(e.base)}`) : '',
    nv ? tag('sched', `${nv.from.slice(5, 10)} 단가 변경 예정`, `${nv.from}부터 ${priceSummary(nv)}`) : '',
    np && !e.promo ? tag('sched', `${np.from.slice(5, 10)} 할인 예정`, `${np.from} ~ ${np.to}`) : '',
  ].filter((x) => x !== '').map((x, i) => <Fragment key={i}>{x}</Fragment>);
}
export function pageModels(): Page {
  const u = ST.ui.models;
  const q = u.q.trim().toLowerCase();
  const list = ST.models.filter((m) => (u.provider === 'ALL' || m.provider === u.provider) && (!q || m.name.toLowerCase().includes(q) || (m.label || '').toLowerCase().includes(q)));
  const rows = list.map((m, i) => {
    const used = orgsUsing(m.name).length; const defs = orgsDefault(m.name).length;
    const e = effPrice(m); const ep = { tiered: e.tiered, price: e.price }; const tags = priceTags(m);
    return (
      <tr key={i} className={m.active ? '' : 'dim'}>
        {/* 원본: 이름 뒤 첫 공백은 이름과 한 텍스트 노드("이름 "), 그다음 배지 앞 공백은 배지 사이의 별도 텍스트 노드 */}
        <td><div className="two"><span className="p row" style={{ gap: '6px', flexWrap: 'wrap' }}>{`${m.label || m.name}${m.isDefault || !m.active || (m.retiresAt && m.active) ? ' ' : ''}`}{m.isDefault ? <span className="badge b-violet" style={{ height: '18px', fontSize: '11px' }}>{icon('star', 'sm')}서비스 기본</span> : null}{m.active ? null : <>{m.isDefault ? ' ' : null}<span className="badge b-gray" style={{ height: '18px', fontSize: '11px' }}>{`비활성 ${m.deactivatedAt ? m.deactivatedAt.slice(5) : ''}`}</span></>}{m.retiresAt && m.active ? <>{m.isDefault ? ' ' : null}{tag('retire', `지원 종료 ${m.retiresAt.slice(2).replace(/-/g, '.')}`, '공급자 지원 종료(deprecation) 예정일 · 그 전에 대체 모델로 전환·비활성화하세요')}</> : null}</span><span className={`s ${m.label ? 'mono' : ''}`}>{m.label ? m.name : `등록 ${m.createdAt}`}</span></div></td>
        <td>{m.provider}</td>
        <td className="num">{priceLines(ep, [['in', '입력'], ['out', '출력']], usdp)}{tags.length ? <div className="ptags">{tags}</div> : null}</td>
        <td className="num">{priceLines(ep, [['cw', '쓰기'], ['cr', '읽기']], usdp)}</td>
        <td className="num" data-tip={`${fmt(m.context)} 토큰`}><div className="two"><span className="p" style={{ fontWeight: '400' }}>{ctxK(m.context)}</span><span className="s">{e.tiered ? `Long: ${ctxK(e.threshold)} 초과` : '단일 단가'}</span></div></td>
        <td className="num"><div className="two"><span className="p" style={{ fontWeight: '400' }}>{`조직 ${used}곳${defs ? ' ' : ''}`}{defs ? <span className="faint">{`(기본 ${defs})`}</span> : null}</span><span className="s">{`활성 계획 ${m.activePlans}건`}</span></div></td>
        <td className="c"><button className={`switch ${m.active ? 'on' : ''}`} onClick={act('mdToggle', { id: m.id })} aria-label={`${m.name} 활성화`} aria-pressed={String(m.active) as 'true' | 'false'}></button></td>
        <td className="c"><button className="icon-btn" onClick={act('mdMenu', { id: m.id })} aria-label={`${m.name} 관리`}>{icon('more')}</button></td>
      </tr>
    );
  });
  const body = (
    <>
      {pageHead('cpu', 'AI 모델', '평가에 사용할 LLM 모델 등록과 단가(Short·Long 구간, 프롬프트 캐시, 단가 일정) 관리')}
      {notice(<>여기서 <b>활성화</b>한 모델을 각 조직의 조직 관리자가 <b>[조직 관리 › AI 모델]</b>에서 사용할지 선택합니다. 단가는 공급자 단가(USD · 1M 토큰당)이며, 요청마다 <b>그 시각</b>에 적용되는 단가로 사용 금액을 계산합니다(조직 화면의 사용 단가·사용 금액도 같은 값). 공급자의 가격 변경·기간 할인은 모델 수정의 <b>단가 일정</b>에서 등록합니다.</>, 'info')}
      <div className="filterbar mt12">{sel('pv', [['ALL', '전체 공급자'], ...PROVIDERS.map((p): SelOpt => [p, p])], u.provider, { onChange: ch('mdProv'), 'aria-label': '공급자' })}
        <div className="vsep"></div><div className="search">{icon('search')}<Input id="q-models" className="input" placeholder="모델 ID·이름으로 검색" value={u.q} onValue={inp('mdQ')} /></div><button className="btn btn-primary" onClick={act('mdCreate')}>{icon('plus')}모델 등록</button></div>
      <div className="tbl-meta">전체 <b>{list.length}</b>{`개 · 활성 ${ST.models.filter((m) => m.active).length}개`}<span className="ml-auto faint">현재 적용 단가: USD · 1M 토큰당 · <span className="tier">S</span>Short <span className="tier long">L</span>Long 구간 · 캐시 '없음'은 일반 입력 단가 적용</span></div>
      <div className="tbl-wrap"><table className="tbl"><colgroup><col style={{ width: '19%' }} /><col style={{ width: '8%' }} /><col style={{ width: '22%' }} /><col style={{ width: '18%' }} /><col style={{ width: '10%' }} /><col style={{ width: '11%' }} /><col style={{ width: '62px' }} /><col style={{ width: '52px' }} /></colgroup>
        <thead><tr><th>모델</th><th>공급자</th><th>입력 · 출력 단가</th><th>캐시 쓰기 · 읽기 단가</th><th>최대 컨텍스트</th><th>사용 현황</th><th className="c">활성</th><th className="c">관리</th></tr></thead>
        <tbody>{rows.length ? rows : <tr className="empty"><td colSpan={8}>등록된 모델이 없습니다.</td></tr>}</tbody></table></div>
    </>
  );
  return { crumbs: ['AI 모델'], body };
}
CH.mdProv = (v) => { ST.ui.models.provider = v; render(); };
IN.mdQ = (v) => { ST.ui.models.q = v; render(); };
ACT.mdToggle = (d) => {
  const m = ST.models.find((x) => x.id === d.id)!;
  if (!m.active) { m.active = true; (m as { deactivatedAt?: string | null }).deactivatedAt = null; addAudit(null, 'MODEL', '모델 활성화', m.name, [['활성', '아니오', '예']]); render(); toast(`${josa(m.name, '을/를')} 활성화했습니다. 조직 관리자가 사용 여부를 선택할 수 있습니다.`); return; }
  if (m.isDefault) { toast('서비스 기본 모델은 비활성화할 수 없습니다. 먼저 다른 모델을 서비스 기본 모델로 지정하세요.', 'warning'); return; }
  if (ST.models.filter((x) => x.active).length <= 1) { toast('활성 모델은 최소 1개 유지해야 합니다.', 'warning'); return; }
  openDeactivate(m);
};
interface DvState { mode: string; to: string }
export function openDeactivate(m: Model) {
  const alts = ST.models.filter((x) => x.active && x.id !== m.id);
  const used = orgsUsing(m.name); const defs = orgsDefault(m.name);
  const needs = m.activePlans > 0 || defs.length > 0;
  openOverlay<DvState>({
    width: 560,
    state: { mode: needs ? 'REPLACE' : 'PLAIN', to: serviceDefault()?.id || alts[0]?.id || '' },
    view: (s: DvState) => ({
      title: `${josa(m.name, '을/를')} 비활성화할까요?`, icon: 'pause', iconType: 'warn',
      // 원본 DOM 패치는 줄바꿈 공백 텍스트 노드까지 위치 기준으로 맞춤 — 템플릿과 같은 노드 순서(공백 텍스트 노드 포함)를 위치 기준 key로 그림.
      // 대체 모델 선택 상자가 사라지면 원본처럼 그 뒤의 '전환 없이' 항목·안내를 새로 만들어(눌렀던 라디오의 포커스가 풀림) 새 항목을 넣은 뒤 이전 항목을 지움 → 다음 Tab은 [취소]로
      body: [
        <div className="grid g3"><div className="stat" style={{ background: 'var(--canvas)' }}><span className="k">사용 중인 조직</span><span className="v">{used.length}<small>곳</small></span><span className="s">{`기본 모델로 지정 ${defs.length}곳`}</span></div><div className="stat" style={{ background: 'var(--canvas)' }}><span className="k">활성 평가 계획</span><span className="v">{m.activePlans}<small>건</small></span></div><div className="stat" style={{ background: 'var(--canvas)' }}><span className="k">예약 실행</span><span className="v">{m.schedules}<small>건</small></span></div></div>,
        '\n        ',
        ...(needs ? [
          <label className="radio"><Check type="radio" name="rg-dvMode" checked={s.mode === 'REPLACE'} onClick={act('dvMode', { v: 'REPLACE' })} /><span><b>대체 모델로 전환한 뒤 비활성화</b> (권장)<br /><span className="muted">평가 계획과 조직 기본 모델이 대체 모델로 바뀌고, 사용 중인 조직에는 대체 모델이 자동으로 켜집니다. 다음 실행부터 적용됩니다.</span></span></label>,
          ...(s.mode === 'REPLACE' ? ['\n        ', sel('to', alts.map((x): SelOpt => [x.id, `${x.label || x.name} (${x.provider})${x.isDefault ? ' · 서비스 기본' : ''}`]), s.to, { onChange: ch('dvTo'), style: { marginLeft: '24px', width: 'calc(100% - 24px)' } }), '\n        '] : ['\n        \n        ']),
          <label className="radio"><Check type="radio" name="rg-dvMode" checked={s.mode === 'PLAIN'} onClick={act('dvMode', { v: 'PLAIN' })} /><span><b>전환 없이 비활성화</b><br /><span className="muted">{`해당 평가 계획은 '모델 비활성' 상태가 되어 실행·예약 실행이 차단됩니다. 이 모델을 기본으로 쓰던 조직은 서비스 기본 모델(${serviceDefault()!.name})로 바뀝니다.`}</span></span></label>,
        ] : [<p>이 모델을 사용하는 활성 평가 계획과 기본 모델 지정이 없습니다.</p>]),
        '\n        ',
        notice('완료된 실행 이력에 기록된 모델·단가 정보와 이미 집계된 사용 금액은 그대로 보존됩니다. 조직 화면에서는 이 모델이 "서비스 관리자에 의해 비활성화됨"으로 표시되고 사용 설정을 켤 수 없습니다.', ''),
      ].map((x, i) => <Fragment key={i}>{x}</Fragment>),
      foot: <><button className="btn btn-secondary" onClick={act('closeOv')}>취소</button><button className="btn btn-danger" onClick={act('dvSubmit', { id: m.id })}>비활성화</button></>,
    }),
  });
}
ACT.dvMode = (d) => { ovs<DvState>().mode = d.v; refreshOverlay(); };
CH.dvTo = (v) => { ovs<DvState>().to = v; };
ACT.dvSubmit = (d) => {
  const m = ST.models.find((x) => x.id === d.id)!; const s = ovs<DvState>();
  const to = s.mode === 'REPLACE' ? ST.models.find((x) => x.id === s.to) : null;
  const fallback = serviceDefault()!;
  const chg: Change[] = [['활성', '예', '아니오']];
  let orgCnt = 0;
  Object.values(ST.orgModels).forEach((v) => {
    if (!v.on.includes(m.name)) return;
    orgCnt += 1;
    v.on = v.on.filter((x) => x !== m.name);
    const target = to || fallback;
    const plans = v.plans[m.name] || 0; delete v.plans[m.name];
    if (to && plans) v.plans[to.name] = (v.plans[to.name] || 0) + plans;
    if (v.def === m.name) { v.def = target.name; if (!v.on.includes(target.name)) v.on.push(target.name); }
    if (to && !v.on.includes(to.name)) v.on.push(to.name);
    if (!v.on.length) { v.on.push(fallback.name); v.def = fallback.name; }
  });
  if (to) { chg.push(['대체 모델', '-', `${to.name} (평가 계획 ${m.activePlans}건 · 조직 ${orgCnt}곳 전환)`]); to.activePlans += m.activePlans; to.schedules += m.schedules; }
  m.active = false; m.deactivatedAt = '2026-11-11'; m.activePlans = 0; m.schedules = 0;
  addAudit(null, 'MODEL', '모델 비활성화', m.name, chg);
  OV.stack = []; renderOverlays(); render(); toast(`${josa(m.name, '을/를')} 비활성화했습니다.`, 'warning');
};
ACT.mdMenu = (d, el) => {
  const m = ST.models.find((x) => x.id === d.id)!;
  // 조직 기본 모델이거나 활성 평가 계획에서 쓰는 모델은 삭제 불가 — 지우면 그 조직의 기본 모델·계획이 사라진 모델을 가리킴(비활성화는 대체 처리됨)
  const defs = orgsDefault(m.name).length; const plans = (m.activePlans || 0) + Object.entries(ST.orgModels).filter(([id]) => orgById(id)).reduce((a, [, v]) => a + ((v.plans || {})[m.name] || 0), 0);
  openMenu(el!, [
    { label: '수정 · 단가 일정', icon: 'pencil', run: () => openModelDrawer(m) },
    { label: '서비스 기본 모델로 지정', icon: 'star', disabled: !m.active || m.isDefault, hint: m.isDefault ? '현재 서비스 기본 모델입니다' : !m.active ? '활성 모델만 지정할 수 있습니다' : '', run: () => { const before = serviceDefault()?.name || '-'; ST.models.forEach((x) => (x.isDefault = false)); m.isDefault = true; addAudit(null, 'MODEL', '서비스 기본 모델 변경', m.name, [['서비스 기본 모델', before, m.name]]); render(); toast(`새 조직의 기본 모델을 ${josa(m.name, '으로/로')} 변경했습니다.`); } },
    '-',
    { label: '삭제', icon: 'trash', danger: true, disabled: m.hasHistory || m.isDefault || defs > 0 || plans > 0, hint: m.hasHistory ? '실행 이력이 있는 모델은 삭제할 수 없습니다 · 비활성화하세요' : m.isDefault ? '서비스 기본 모델은 삭제할 수 없습니다' : defs > 0 ? `조직 기본 모델로 쓰는 조직이 있어 삭제할 수 없습니다(${defs}곳) · 비활성화하세요` : plans > 0 ? `활성 평가 계획에서 쓰고 있어 삭제할 수 없습니다(${plans}건) · 비활성화하세요` : '', run: () => confirmModal({ title: `${josa(m.name, '을/를')} 삭제할까요?`, danger: true, icon: 'trash', body: <p>실행 이력이 없는 모델이므로 목록에서 완전히 삭제됩니다. 조직의 사용 설정에서도 제거됩니다.</p>, confirmLabel: '삭제', onConfirm: () => { ST.models = ST.models.filter((x) => x.id !== m.id); Object.values(ST.orgModels).forEach((v) => { v.on = v.on.filter((x) => x !== m.name); }); addAudit(null, 'MODEL', '모델 삭제', m.name); render(); toast(`${josa(m.name, '을/를')} 삭제했습니다.`, 'warning'); } }) },
  ]);
};
