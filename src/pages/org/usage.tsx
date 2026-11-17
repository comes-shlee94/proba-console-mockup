/* ---------- OA-50 사용량·사용 금액 (조직) ---------- */
import type { ReactNode } from 'react';
import { MONTHS } from '../../data';
import { CH, CUR_ORG, ST, ch, fmt, fmt1, notice, orgById, pageHead, render, sel, usd, type Page, type SelOpt } from '../../core';
import { DOM_COLORS, dailySeries, modelShareTable, usageOf, type UsageNumKey } from '../admin/usage';

export function pageOrgUsage(): Page {
  const o = orgById(CUR_ORG); const f = ST.ui.orgUsage;
  const mo = MONTHS.find((x) => x.key === f.month)!; const us = usageOf(o.id, f.month);
  const prevKey = MONTHS[MONTHS.findIndex((x) => x.key === f.month) + 1]?.key;
  const prev = prevKey ? usageOf(o.id, prevKey) : null; const ratio = mo.status === 'OPEN' ? 11 / 31 : 1;
  const delta = (k: UsageNumKey): ReactNode => { if (!prev || !prev[k]) return '-'; const dd = (us[k] / (prev[k] * ratio) - 1) * 100; return <span className="delta flat">{`${dd >= 0 ? '▲' : '▼'} ${Math.abs(dd).toFixed(1)}%`}</span>; };
  const cmpLabel = mo.status === 'OPEN' ? '전월 동기 대비' : '전월 대비';
  // `${cmpLabel} ${delta(k)}`: delta가 '-'이면 문구와 한 텍스트로 (텍스트 노드가 나뉘면 글자 위치가 미세하게 달라짐)
  const cmp = (dv: ReactNode) => (typeof dv === 'string' ? `${cmpLabel} ${dv}` : <>{`${cmpLabel} `}{dv}</>);
  const trend = MONTHS.slice().reverse().map((m) => ({ m, v: usageOf(o.id, m.key).billUsd }));
  const tmax = Math.max(...trend.map((t) => t.v), 1);
  const daily = dailySeries(o, mo); const dmax = Math.max(...daily);
  const stat = (dom: string, l: string, v: ReactNode, s2: string, k: UsageNumKey) => <div className="stat"><span className="k"><i className="dom-dot" style={{ background: DOM_COLORS[dom] }}></i>{l}</span><span className="v">{v}</span><span className="s">{s2}</span><span className="s">{cmp(delta(k))}</span></div>;
  const body = (
    <>
      {pageHead('chart', '사용량·사용 금액', '월간 사용량과 AI 모델 사용 금액')}
      <div className="filterbar">{sel('m', MONTHS.map((m): SelOpt => [m.key, m.label]), f.month, { onChange: ch('ouMonth'), 'aria-label': '기준 월' })}<span className="faint" style={{ fontSize: '12px' }}>{mo.note}</span></div>{/* v0.17: 플랜 배지·좌석 사용 수 삭제(플랜·좌석은 조직 정보·멤버 관리 화면에서 확인) */}
      <div className="grid g5">
        {stat('lqa', 'AI 품질', <>{fmt(us.lqaRuns)}<small>회</small></>, `채점 ${fmt(us.lqaCases)}건`, 'lqaRuns')}
        {stat('fqa', '기능 QA', <>{fmt(us.fqaRuns)}<small>회</small></>, `러너 ${fmt1(us.runnerH)}h`, 'fqaRuns')}
        {stat('load', '부하 QA', <>{fmt(us.loadRuns)}<small>회</small></>, `워커 ${fmt1(us.workerH)}h`, 'loadRuns')}
        {stat('app', '앱 성능 QA', <>{fmt(us.appRuns)}<small>회</small></>, `단말 ${fmt1(us.deviceH)}h`, 'appRuns')}
        <div className="stat" data-kpi="bill"><span className="k">사용 금액</span><span className="v">{usd(us.billUsd)}</span><span className="s">AI 모델 사용분 · USD</span><span className="s">{cmp(delta('billUsd'))}</span></div></div>
      <div className="grid mt12" style={{ gridTemplateColumns: '3fr 2fr' }}>
        <div className="card"><div className="card-h"><h3>모델별 사용 금액</h3><span className="sub">{mo.label}</span></div>{modelShareTable(us)}</div>
        <div className="card"><div className="card-h"><h3>월별 사용 금액</h3><span className="sub">최근 3개월</span></div>
          <div className="spark" style={{ height: '96px' }}>{trend.map((t, i) => <i key={i} className={t.m.key === f.month ? 'cur' : ''} style={{ height: `${(t.v / tmax) * 100}%` }} data-tip={`${t.m.label} ${usd(t.v)}`}></i>)}</div>
          <div className="row mt8" style={{ justifyContent: 'space-around', fontSize: '11px', color: 'var(--faint)' }}>{trend.map((t, i) => <span key={i}>{`${t.m.key.slice(5)}월${t.m.status === 'OPEN' ? '(진행 중)' : ''}`}</span>)}</div>
          <div className="divider"></div><div className="col" style={{ fontSize: '12px', gap: '4px' }}>{trend.map((t, i) => <div key={i} className="row"><span className="muted">{t.m.label}</span><span className="ml-auto num">{usd(t.v)}</span></div>)}</div></div></div>
      <div className="card mt12"><div className="card-h"><h3>일별 AI 평가·기능 실행 추이</h3><span className="sub">{mo.label}</span></div><div className="spark" style={{ height: '80px' }}>{daily.map((v, i) => <i key={i} className={i === daily.length - 1 ? 'cur' : ''} style={{ height: `${(v / dmax) * 100}%` }} data-tip={`${f.month}-${String(i + 1).padStart(2, '0')}`}></i>)}</div><div className="row" style={{ justifyContent: 'space-between', fontSize: '11px', color: 'var(--faint)' }}><span>{`${f.month}-01`}</span><span>{`${f.month}-${String(daily.length).padStart(2, '0')}`}</span></div></div>
      <div className="mt12">{notice(<>사용 금액은 <b>AI 모델 사용분</b>으로, 요청마다 그 시각의 사용 단가([AI 모델] 화면의 단가 · 기간 할인 포함)로 계산합니다(USD, 모델별 센트 단위 반올림 후 합산). 진행 중인 달은 <b>5분마다 갱신</b>되며 매월 1일 06:00에 전월분이 마감됩니다. 러너·워커·단말 시간은 사용량만 표시하며 사용 금액에 포함되지 않습니다.</>, '')}</div>
    </>
  );
  return { crumbs: ['사용량·사용 금액'], body };
}
CH.ouMonth = (v) => { ST.ui.orgUsage.month = v; render(); };
