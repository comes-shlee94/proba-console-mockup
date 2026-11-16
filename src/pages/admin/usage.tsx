/* ---------- 사용량 계산 ----------
   사용 금액: 조직·월·모델 단위(요청별 토큰 × 요청 시각의 단가, 기간 할인·Short/Long·캐시 단가 반영) → 센트 반올림
   조직 합계·전체 합계는 반올림된 모델별 금액의 합 */
import { Fragment, type ReactNode } from 'react';
import type { MonthDef, Org, PlanKey, UsageRec } from '../../types';
import { EXTRA_NOV, MONTHS, MONTH_FACTOR, NOW_KEY, ORG_STATUS, PLANS, USAGE_BASE } from '../../data';
import {
  ACT, CH, ST, act, addAudit, badge, ch, closeOverlay, confirmModal, fmt, fmt1, go, icon, notice, openOverlay, orgById, pageHead, r2, render, sel, toast, usd,
  type Page, type SelOpt,
} from '../../core';
import { modelByName } from './models';

/* usageOf()가 돌려주는 값 (원본은 객체를 만든 뒤 models · billUsd를 덧붙임) */
export interface UsageModelBill { name: string; bill: number }
export interface Usage { lqaRuns: number; lqaCases: number; fqaRuns: number; runnerH: number; loadRuns: number; workerH: number; appRuns: number; deviceH: number; models: UsageModelBill[]; billUsd: number }
export type UsageNumKey = Exclude<keyof Usage, 'models'>;

export function usageOf(orgId: string, month: string): Usage {
  const b: UsageRec = USAGE_BASE[orgId] || { lqa: [0, 0], fqa: [0, 0], load: [0, 0], app: [0, 0], llm: {} };
  const mf = MONTH_FACTOR[month] || { default: 0 };
  const ex = month === '2026-11' && EXTRA_NOV[orgId];
  const src = ex || b; const k = ex ? 1 : (mf[orgId] ?? mf.default);
  const u = { lqaRuns: Math.round(src.lqa[0] * k), lqaCases: Math.round(src.lqa[1] * k), fqaRuns: Math.round(src.fqa[0] * k), runnerH: src.fqa[1] * k, loadRuns: Math.round(src.load[0] * k), workerH: src.load[1] * k, appRuns: Math.round(src.app[0] * k), deviceH: src.app[1] * k } as Usage;
  u.models = Object.entries(src.llm || {}).map(([name, c]) => ({ name, bill: r2(c * k) })).filter((x) => x.bill > 0).sort((a, b2) => b2.bill - a.bill);
  u.billUsd = r2(u.models.reduce((a, x) => a + x.bill, 0));
  return u;
}
export const DOM_COLORS: Record<string, string> = { lqa: '#6155f5', fqa: '#00a3ae', load: '#e0752d', app: '#3c7be0' };
/* [표시명, 값, 표기, 막대 색(DOM_COLORS 키)] */
export type Metric = [string, (u: Usage) => number, (v: number) => string, string];
export const METRICS: Record<string, Metric> = { bill: ['사용 금액', (u) => u.billUsd, usd, 'lqa'], lqa: ['AI 평가', (u) => u.lqaRuns, fmt, 'lqa'], fqa: ['기능 실행', (u) => u.fqaRuns, fmt, 'fqa'], runner: ['러너 시간', (u) => u.runnerH, (v) => fmt1(v) + 'h', 'fqa'], worker: ['워커 시간', (u) => u.workerH, (v) => fmt1(v) + 'h', 'load'], device: ['단말 시간', (u) => u.deviceH, (v) => fmt1(v) + 'h', 'app'] };

/* ---------- SA-40 사용량·사용 금액 ---------- */
export function pageUsage(): Page {
  const u = ST.ui.usage;
  const mo = MONTHS.find((x) => x.key === u.month)!;
  const prevKey = MONTHS[MONTHS.findIndex((x) => x.key === u.month) + 1]?.key;
  const orgsF = ST.orgs.filter((o) => (u.org === 'ALL' || o.id === u.org) && (u.plan === 'ALL' || o.plan === u.plan));
  const rows = orgsF.map((o) => ({ o, us: usageOf(o.id, u.month) }));
  const sum = (key: UsageNumKey) => rows.reduce((a, r) => a + r.us[key], 0);
  const sumM = (key: UsageNumKey) => r2(sum(key));
  const prevSum = (key: UsageNumKey) => (prevKey ? orgsF.reduce((a, o) => a + usageOf(o.id, prevKey)[key], 0) * (mo.status === 'OPEN' ? 11 / 31 : 1) : 0);
  // 원본: 전월 값이 없으면 '' (→ 호출하는 쪽의 || '-')
  const delta = (key: UsageNumKey) => { const p = prevSum(key); if (!p) return null; const dd = (sum(key) / p - 1) * 100; return <span className="delta flat">{`${dd >= 0 ? '▲' : '▼'} ${Math.abs(dd).toFixed(1)}%`}</span>; };
  const cmpLabel = mo.status === 'OPEN' ? '전월 동기 대비' : '전월 대비';
  // `${cmpLabel} ${delta || '-'}`: 원본과 같이 문구와 '-'는 한 텍스트로 (텍스트 노드가 나뉘면 글자 위치가 미세하게 달라짐)
  const cmp = (dv: ReactNode) => (dv ? <>{`${cmpLabel} `}{dv}</> : `${cmpLabel} -`);
  const kpi = (dom: string, title: string, main: string, unit: string, sub: string, key: UsageNumKey) => <div className="stat"><span className="k"><i className="dom-dot" style={{ background: DOM_COLORS[dom] || '#999' }}></i>{title}</span><span className="v">{main}<small>{unit}</small></span><span className="s">{sub}</span><span className="s">{cmp(delta(key))}</span></div>;
  const metric = METRICS[u.metric];
  const top = [...rows].sort((a, b) => metric[1](b.us) - metric[1](a.us)).slice(0, 8);
  const max = Math.max(1e-9, ...top.map((r) => metric[1](r.us)));
  const bars = top.map((r, i) => { const v = metric[1](r.us); return <Fragment key={i}><span className="lab">{r.o.name}</span><span className="bar"><i style={{ width: `${(v / max) * 100}%`, background: DOM_COLORS[metric[3]] }}></i></span><span className="val">{metric[2](v)}</span></Fragment>; });
  const trend = MONTHS.slice().reverse().map((m) => ({ m, v: r2(orgsF.reduce((a, o) => a + usageOf(o.id, m.key).billUsd, 0)) }));
  const tmax = Math.max(...trend.map((t) => t.v), 1);
  const sorted = [...rows].sort((a, b) => (METRICS[u.sort] ? METRICS[u.sort][1](b.us) - METRICS[u.sort][1](a.us) : 0));
  const th = (label: string, key: string, cls = 'r') => <th className={`${cls} sortable`} onClick={act('usgSort', { v: key })}><span className="sort">{label}{u.sort === key ? icon('down', 'sm') : null}</span></th>;
  const trs = sorted.map(({ o, us }, i) => <tr key={i} className="click" onClick={act('usgOrg', { id: o.id })}><td><div className="two"><span className="p">{o.name}</span><span className="s">{`${PLANS[o.plan].label}${o.status !== 'ACTIVE' ? ' · ' + ORG_STATUS[o.status][0] : ''}`}</span></div></td><td className="r num">{fmt(us.lqaRuns)}</td><td className="r num">{fmt(us.lqaCases)}</td><td className="r num">{fmt(us.fqaRuns)}</td><td className="r num">{fmt1(us.runnerH)}</td><td className="r num">{fmt(us.loadRuns)}</td><td className="r num">{fmt1(us.workerH)}</td><td className="r num">{fmt(us.appRuns)}</td><td className="r num">{fmt1(us.deviceH)}</td><td className="r num"><b>{usd(us.billUsd)}</b></td><td className="c faint">{icon('right', 'sm')}</td></tr>);
  const body = (
    <>
      {pageHead('chart', '사용량·사용 금액', '조직·도메인별 월간 사용량과 AI 모델 사용 금액 조회 · 엑셀 내보내기')}
      <div className="filterbar">{sel('m', MONTHS.map((m): SelOpt => [m.key, m.label]), u.month, { onChange: ch('usgMonth'), 'aria-label': '기준 월' })}
        <span className="faint" style={{ fontSize: '12px' }}>{mo.note}</span>
        <div className="vsep"></div>{sel('o', [['ALL', '전체 조직'], ...ST.orgs.map((o): SelOpt => [o.id, o.name])], u.org, { onChange: ch('usgOrgF'), 'aria-label': '조직' })}{sel('p', [['ALL', '전체 플랜'], ['TRIAL', 'Trial'], ['TEAM', 'Team'], ['ENTERPRISE', 'Enterprise']], u.plan, { onChange: ch('usgPlan'), 'aria-label': '플랜' })}
        <span className="ml-auto"></span><button className="btn btn-secondary" onClick={act('usgExport')}>{icon('download', 'sm')}엑셀 다운로드</button></div>
      <div className="grid g5">
        {kpi('lqa', 'AI 품질', fmt(sum('lqaRuns')), '회', `채점 ${fmt(sum('lqaCases'))}건`, 'lqaRuns')}
        {kpi('fqa', '기능 QA', fmt(sum('fqaRuns')), '회', `러너 ${fmt1(sum('runnerH'))}h`, 'fqaRuns')}
        {kpi('load', '부하 QA', fmt(sum('loadRuns')), '회', `워커 ${fmt1(sum('workerH'))}h`, 'loadRuns')}
        {kpi('app', '앱 성능 QA', fmt(sum('appRuns')), '회', `단말 ${fmt1(sum('deviceH'))}h`, 'appRuns')}
        <div className="stat" data-kpi="bill"><span className="k">사용 금액</span><span className="v">{usd(sumM('billUsd'))}</span><span className="s">AI 모델 사용분 · USD</span><span className="s">{cmp(delta('billUsd'))}</span></div></div>
      <div className="grid mt12" style={{ gridTemplateColumns: '2fr 1fr' }}>
        <div className="card"><div className="card-h"><h3>조직별 TOP 8</h3><span className="r"><div className="seg" style={{ background: 'var(--canvas)' }}>{Object.entries(METRICS).map(([k, m], i) => <button key={i} className={u.metric === k ? 'on' : ''} onClick={act('usgMetric', { v: k })}>{m[0]}</button>)}</div></span></div><div className="hbar">{bars}</div></div>
        <div className="card"><div className="card-h"><h3>월별 사용 금액</h3><span className="sub">최근 3개월</span></div>
          <div className="spark" style={{ height: '110px' }}>{trend.map((t, i) => <i key={i} className={t.m.key === u.month ? 'cur' : ''} style={{ height: `${(t.v / tmax) * 100}%` }} data-tip={`${t.m.label} ${usd(t.v)}`}></i>)}</div>
          <div className="row mt8" style={{ justifyContent: 'space-around', fontSize: '11px', color: 'var(--faint)' }}>{trend.map((t, i) => <span key={i}>{`${t.m.key.slice(5)}월${t.m.status === 'OPEN' ? '(진행 중)' : ''}`}</span>)}</div>
          <div className="divider"></div><div className="col" style={{ fontSize: '12px', gap: '4px' }}>{trend.map((t, i) => <div key={i} className="row"><span className="muted">{t.m.label}</span><span className="ml-auto num">{usd(t.v)}</span></div>)}</div></div></div>
      <div className="tbl-meta mt16">조직 <b>{rows.length}</b>곳 · 행을 누르면 조직별 상세(모델별 사용 금액, 일별 추이)를 볼 수 있습니다</div>
      <div className="tbl-wrap"><table className="tbl"><colgroup><col style={{ width: '14%' }} /><col /><col /><col /><col /><col /><col /><col /><col /><col style={{ width: '11%' }} /><col style={{ width: '48px' }} /></colgroup>
        <thead><tr className="grp"><th rowSpan={2}>조직</th><th colSpan={2} className="c">AI 품질</th><th colSpan={2} className="c">기능 QA</th><th colSpan={2} className="c">부하 QA</th><th colSpan={2} className="c">앱 성능 QA</th><th rowSpan={2} className="r sortable" onClick={act('usgSort', { v: 'bill' })}>사용 금액{u.sort === 'bill' ? icon('down', 'sm') : null}</th><th rowSpan={2}></th></tr>
        <tr className="sub">{th('평가(회)', 'lqa')}<th className="r">채점(건)</th>{th('실행(회)', 'fqa')}{th('러너(h)', 'runner')}<th className="r">측정(회)</th>{th('워커(h)', 'worker')}<th className="r">측정(회)</th>{th('단말(h)', 'device')}</tr></thead>
        <tbody>{trs}<tr className="total"><td>합계</td><td className="r num">{fmt(sum('lqaRuns'))}</td><td className="r num">{fmt(sum('lqaCases'))}</td><td className="r num">{fmt(sum('fqaRuns'))}</td><td className="r num">{fmt1(sum('runnerH'))}</td><td className="r num">{fmt(sum('loadRuns'))}</td><td className="r num">{fmt1(sum('workerH'))}</td><td className="r num">{fmt(sum('appRuns'))}</td><td className="r num">{fmt1(sum('deviceH'))}</td><td className="r num">{usd(sumM('billUsd'))}</td><td></td></tr></tbody></table></div>
      <div className="mt12">{notice(<><b>사용 금액</b>은 AI 모델 사용분으로, 요청마다 그 시각에 적용된 모델 단가(기본 단가 또는 기간 할인 · Short/Long 구간 · 캐시 쓰기/읽기)로 계산합니다. 금액은 USD이며 조직·모델별로 센트 단위 반올림 후 합산합니다. 진행 중인 달은 <b>5분마다 갱신</b>되고 매월 1일 06:00에 전월분을 마감합니다. 러너·워커·단말 시간은 사용량만 집계합니다.</>, '')}</div>
    </>
  );
  return { crumbs: ['사용량·사용 금액'], body };
}
CH.usgMonth = (v) => { ST.ui.usage.month = v; render(); };
CH.usgOrgF = (v) => { ST.ui.usage.org = v; render(); };
CH.usgPlan = (v) => { ST.ui.usage.plan = v; render(); };
ACT.usgMetric = (d) => { ST.ui.usage.metric = d.v; render(); };
ACT.usgSort = (d) => { ST.ui.usage.sort = d.v; render(); };
ACT.usgExport = () => {
  const u = ST.ui.usage; const mo = MONTHS.find((x) => x.key === u.month)!;
  confirmModal({
    title: '사용량·사용 금액을 엑셀로 내려받을까요?', icon: 'download',
    body: <><div className="kv"><span className="k">기준 월</span><span className="v">{`${mo.label} (${mo.note})`}</span><span className="k">대상</span><span className="v">{`${u.org === 'ALL' ? '전체 조직' : orgById(u.org).name} · ${u.plan === 'ALL' ? '전체 플랜' : PLANS[u.plan as PlanKey].label}`}</span><span className="k">시트 구성</span><span className="v">① 조직별 요약(사용량 · 사용 금액) ② 조직 × 모델별 사용 금액 ③ 일별 추이</span><span className="k">파일명</span><span className="v mono">{`proba_usage_${u.month}.xlsx`}</span></div>{notice('내려받기 행위는 감사 로그에 기록됩니다. 진행 중인 달은 내려받는 시점 기준 값입니다.', '')}</>,
    confirmLabel: '다운로드',
    onConfirm: () => { addAudit(null, 'EXPORT', '사용량 내보내기', `${mo.label} · ${u.org === 'ALL' ? '전체 조직' : orgById(u.org).name}`, [['파일', '-', `proba_usage_${u.month}.xlsx`]]); toast('엑셀 파일을 만들었습니다. (프로토타입: 실제 파일은 생성되지 않음)'); },
  });
};

/* ---------- SA-41 조직 사용량 상세 (드로어) ---------- */
export function dailySeries(o: Org, mo: MonthDef): number[] {
  const [yy, mm] = mo.key.split('-').map(Number);
  const days = mo.status === 'OPEN' ? Number(NOW_KEY.slice(8, 10)) : new Date(yy, mm, 0).getDate(); // 진행 중인 달은 오늘까지, 마감된 달은 그 달의 날수(10월 31일 · 9월 30일)
  return Array.from({ length: days }, (_, i) => 0.6 + ((i * 37 + o.id.charCodeAt(o.id.length - 1)) % 9) / 10 * (i % 7 === 5 || i % 7 === 6 ? 0.4 : 1));
}
export function modelShareTable(us: Usage): ReactNode {
  const total = us.billUsd;
  const rows = us.models.map((x, i) => { const md = modelByName(x.name); const v = x.bill; return <tr key={i}><td>{md?.label || x.name}{md && !md.active ? <> {badge('비활성', 'b-gray')}</> : null}</td><td className="r num"><b>{usd(x.bill)}</b></td><td><div className="share"><span className="bar"><i style={{ width: `${total ? (v / total) * 100 : 0}%` }}></i></span><span className="num faint" style={{ width: '44px', textAlign: 'right' }}>{`${total ? Math.round((v / total) * 100) : 0}%`}</span></div></td></tr>; });
  // 원본: rows(빈 문자열이면 빈 행) — 모델 사용 내역이 없을 때만 빈 행, 있을 때만 합계 행
  return <div className="tbl-wrap" style={{ border: '1px solid var(--hairline)' }}><table className="tbl"><colgroup><col style={{ width: '40%' }} /><col /><col style={{ width: '34%' }} /></colgroup><thead><tr><th>모델</th><th className="r">사용 금액</th><th>비중</th></tr></thead><tbody>{rows.length ? rows : <tr className="empty"><td colSpan={3}>이번 달 AI 모델 사용 내역이 없습니다.</td></tr>}{rows.length ? <tr className="total"><td>합계</td><td className="r num">{usd(us.billUsd)}</td><td></td></tr> : null}</tbody></table></div>;
}
ACT.usgOrg = (d) => {
  const o = orgById(d.id); const u = ST.ui.usage; const mo = MONTHS.find((x) => x.key === u.month)!; const us = usageOf(o.id, u.month);
  const daily = dailySeries(o, mo); const dmax = Math.max(...daily); const days = daily.length;
  openOverlay({
    drawer: true, width: 680,
    view: () => ({
      title: `${o.name} · ${mo.label} 사용량·사용 금액`, sub: `${PLANS[o.plan].label} · ${mo.note}`,
      body: (
        <>
          <div className="grid g4">{[['lqa', 'AI 평가', fmt(us.lqaRuns) + '회', '채점 ' + fmt(us.lqaCases) + '건'], ['fqa', '기능 실행', fmt(us.fqaRuns) + '회', '러너 ' + fmt1(us.runnerH) + 'h'], ['load', '부하 측정', fmt(us.loadRuns) + '회', '워커 ' + fmt1(us.workerH) + 'h'], ['app', '앱 성능 측정', fmt(us.appRuns) + '회', '단말 ' + fmt1(us.deviceH) + 'h']].map(([k, l, v, s2], i) => <div key={i} className="stat" style={{ background: 'var(--canvas)' }}><span className="k"><i className="dom-dot" style={{ background: DOM_COLORS[k] }}></i>{l}</span><span className="v" style={{ fontSize: '18px' }}>{v}</span><span className="s">{s2}</span></div>)}</div>
          <div className="stat" style={{ background: 'var(--canvas)' }}><span className="k">사용 금액</span><span className="v" style={{ fontSize: '20px' }}>{usd(us.billUsd)}</span><span className="s">{`AI 모델 사용분 · USD · 모델 ${us.models.length}개`}</span></div>
          <div><p className="sec-t">모델별 사용 금액</p>{modelShareTable(us)}</div>
          <div><p className="sec-t">일별 AI 평가·기능 실행 추이</p><div className="spark" style={{ height: '90px' }}>{daily.map((v, i) => <i key={i} className={i === days - 1 ? 'cur' : ''} style={{ height: `${(v / dmax) * 100}%` }} data-tip={`${u.month}-${String(i + 1).padStart(2, '0')}`}></i>)}</div><div className="row" style={{ justifyContent: 'space-between', fontSize: '11px', color: 'var(--faint)' }}><span>{`${u.month}-01`}</span><span>{`${u.month}-${String(days).padStart(2, '0')}`}</span></div></div>
          {notice(<>조직 관리자는 [조직 관리 › 사용량·사용 금액]에서 같은 사용량과 <b>사용 금액</b>을 확인합니다.</>, '')}
        </>
      ),
      foot: <><button className="btn btn-secondary" onClick={act('closeOv')}>닫기</button><button className="btn btn-primary" onClick={act('usgGoOrg', { id: o.id })}>조직 상세로 이동</button></>,
    }),
  });
};
ACT.usgGoOrg = (d) => { closeOverlay(); ST.ui.orgDetail.tab = 'usage'; go('/admin/organizations/' + d.id); };
