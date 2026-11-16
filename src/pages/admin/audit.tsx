/* ---------- SA-50 감사 로그 ---------- */
import type { ReactNode } from 'react';
import type { AuditCat, AuditEntry, RangeFilter } from '../../types';
import { AUDIT_CATS } from '../../data';
import {
  ACT, CH, IN, ST, Check, Input, act, addAudit, badge, ch, closeOverlay, icon, inp, notice, openOverlay, orgById, ovs,
  pageHead, pageSizeSel, pager, paginate, refreshOverlay, render, roleOfActor, sel, toast,
  type Page, type SelOpt,
} from '../../core';

// 조회 기간: 미리 정한 기간(최근 7·30·90·180일) 또는 직접 입력(시작일~종료일, 최근 180일 안에서 자유롭게)
// 로그 보존(v0.8): 총 1년 — 화면 조회 범위가 지난 로그는 보관 저장소(아카이브)로 옮겨 보관한 뒤, 기록일로부터 1년이 지나면 파기
// v0.10: 조회 범위 전체를 볼 수 있도록 기간 버튼 추가 · 직접 입력의 '최대 90일' 한도 삭제(내보내기 31일 한도는 유지)
// v0.11: [오늘] 삭제 · 기간 표기를 일 단위로 통일('최근 6개월' → '최근 180일'). 화면 맨 아래 안내 문구만 '최근 6개월'로 표기
export const AUDIT_TODAY = '2026-11-11'; export const AUDIT_MIN = '2026-05-16'; // 화면 조회 범위: 최근 180일(오늘 포함)
export const RANGES: Record<string, [string, string | null]> = { '7d': ['최근 7일', '2026-11-05'], '30d': ['최근 30일', '2026-10-13'], '90d': ['최근 90일', '2026-08-14'], '180d': ['최근 180일', AUDIT_MIN], custom: ['직접 입력', null] };
const EXPORT_MAX_DAYS = 31;
const dayDiff = (a: string, b: string) => Math.round((new Date(b + 'T00:00:00').getTime() - new Date(a + 'T00:00:00').getTime()) / 86400000);
const rangeOf = (f: RangeFilter): [string, string] => (f.range === 'custom' ? [f.from, f.to] : [RANGES[f.range][1] as string, AUDIT_TODAY]);
const rangeDays = (f: RangeFilter) => { const [a, b] = rangeOf(f); return dayDiff(a, b) + 1; };
export function rangeLabel(f: RangeFilter): string { const [a, b] = rangeOf(f); return f.range === 'custom' ? `${a} ~ ${b} (${rangeDays(f)}일)` : RANGES[f.range][0]; }
function checkRange(from: string, to: string) {
  if (!from || !to) return '시작일과 종료일을 모두 선택해주세요.';
  if (from > to) return '시작일은 종료일보다 늦을 수 없습니다.';
  if (to > AUDIT_TODAY) return `종료일은 오늘(${AUDIT_TODAY})까지 선택할 수 있습니다.`;
  if (from < AUDIT_MIN) return `최근 180일(${AUDIT_MIN} 이후)까지만 조회할 수 있습니다. 그 이전 로그는 운영팀에 추출을 요청하세요.`;
  return '';
}
// 기간 영역(감사 로그·활동 로그 공통 — v0.12): 기간 버튼 + 선택 기간 표시, 또는 직접 입력(시작일~종료일)과 안내·오류 문구
// (포팅) 오류 문구·안내 문구 span의 key: 원본 DOM 패치는 바뀐 span의 style 속성을 지우지만 React는 같은 span을 고쳐 쓰며 빈 style=""을 남기므로 새로 만듦
// (포팅) 문자열과 값이 이어진 글자는 원본처럼 텍스트 노드 하나가 되도록 템플릿 문자열로 씀 (노드가 나뉘면 글자 렌더링이 미세하게 달라짐)
export function rangeBar(f: RangeFilter, { act: actName, from, to, id }: { act: string; from: string; to: string; id: string }): ReactNode {
  return (
    <div className="filterbar" style={{ flexWrap: 'wrap' }}><div className="seg" style={{ background: 'var(--canvas)' }}>{Object.entries(RANGES).map(([k, r], i) => <button key={i} className={f.range === k ? 'on' : ''} onClick={act(actName, { v: k })}>{r[0]}</button>)}</div>
      {f.range === 'custom'
        ? <><span className="date-range">{icon('calendar', 'sm')}<Input id={`f-${id}-from`} type="date" className="input" min={AUDIT_MIN} max={AUDIT_TODAY} value={f.cFrom} onCommit={ch(from)} aria-label="시작일" /><span className="faint">~</span><Input id={`f-${id}-to`} type="date" className="input" min={AUDIT_MIN} max={AUDIT_TODAY} value={f.cTo} onCommit={ch(to)} aria-label="종료일" /></span>{f.cErr ? <span key="err" className="err-line" role="alert">{icon('alert', 'sm')}{f.cErr}</span> : <span key="hint" className="faint" style={{ fontSize: '12px' }}>최근 180일 이내</span>}</>
        : <span className="faint mono" style={{ fontSize: '12px' }}>{icon('calendar', 'sm')}{` ${rangeOf(f)[0]} ~ ${rangeOf(f)[1]}`}</span>}</div>
  );
}
// 기간 버튼 선택: [직접 입력]은 직전 직접 입력 기간으로 채움
export function pickRange(f: RangeFilter & { page: number }, v: string) { f.range = v; f.page = 1; if (v === 'custom') { f.cFrom = f.from; f.cTo = f.to; f.cErr = ''; } render(); }
// 직접 입력: 날짜를 바꿀 때마다 검사 — 올바르면 바로 조회, 아니면 오류를 보여 주고 직전 조회 기간 유지
export function applyCustomRange(f: RangeFilter & { page: number }) { f.cErr = checkRange(f.cFrom, f.cTo); if (!f.cErr) { f.from = f.cFrom; f.to = f.cTo; f.page = 1; } render(); }
/** filterAudit의 조회 조건 (감사 로그: ST.ui.audit · 활동 로그: ST.ui.activity + org · result) */
type AuditFilter = RangeFilter & { org?: string | null; cat: string; result?: string; q?: string };
export function filterAudit(f: AuditFilter, orgFixed?: string | null) {
  const [from, to] = rangeOf(f);
  const q = (f.q || '').trim().toLowerCase();
  return ST.audit.filter((a) => a.at.slice(0, 10) >= from && a.at.slice(0, 10) <= to
    && (orgFixed ? a.orgId === orgFixed : (f.org === 'ALL' || (f.org === 'PLATFORM' ? !a.orgId : a.orgId === f.org)))
    && (f.cat === 'ALL' || a.cat === f.cat) && (!f.result || f.result === 'ALL' || a.result === f.result)
    && (!q || [a.action, a.target, a.actor.name, a.actor.email].some((x) => String(x).toLowerCase().includes(q))));
}
export function auditTable(list: AuditEntry[], { hideOrg, hideIp, org }: { hideOrg?: boolean; hideIp?: boolean; org?: boolean } = {}): ReactNode {
  const rows = list.map((a, i) => (
    <tr key={i} className="click" onClick={act('openAudit', { id: a.id, org: org ? '1' : '' })}>
      <td><div className="two"><span className="p mono" style={{ fontWeight: '400', color: '#444' }}>{a.at.slice(0, 10)}</span><span className="s mono">{a.at.slice(11)}</span></div></td>
      {hideOrg ? null : <td>{a.orgId ? (orgById(a.orgId)?.name || a.orgId) : <span className="faint">플랫폼</span>}</td>}
      <td><div className="two"><span className="p">{a.actor.name}</span><span className="s">{a.actor.role === 'SYSTEM' ? '자동 처리' : roleOfActor(a.actor.role)}</span></div></td>
      <td>{badge(AUDIT_CATS[a.cat], a.cat === 'AUTH' ? 'b-gray' : a.cat === 'PERM' || a.cat === 'ACCOUNT' ? 'b-violet' : a.cat === 'ORG' ? 'b-blue' : 'b-outline')}</td>
      <td>{a.action}</td><td style={{ whiteSpace: 'nowrap' }} title={a.target}>{a.target}</td>
      <td>{a.result === 'SUCCESS' ? badge('성공', 'b-teal') : badge('실패', 'b-red')}</td>
      {hideIp ? null : <td className="mono faint">{a.ip || '-'}</td>}
    </tr>
  ));
  const cols = hideOrg ? (hideIp ? <><col style={{ width: '112px' }} /><col style={{ width: '15%' }} /><col style={{ width: '10%' }} /><col style={{ width: '17%' }} /><col /><col style={{ width: '72px' }} /></> : <><col style={{ width: '112px' }} /><col style={{ width: '13%' }} /><col style={{ width: '9%' }} /><col style={{ width: '15%' }} /><col /><col style={{ width: '72px' }} /><col style={{ width: '112px' }} /></>)
    : <><col style={{ width: '112px' }} /><col style={{ width: '10%' }} /><col style={{ width: '12%' }} /><col style={{ width: '9%' }} /><col style={{ width: '14%' }} /><col /><col style={{ width: '72px' }} /><col style={{ width: '112px' }} /></>;
  return (
    <div className="tbl-wrap"><table className="tbl"><colgroup>{cols}</colgroup><thead><tr><th>시각</th>{hideOrg ? null : <th>조직</th>}<th>행위자</th><th>분류</th><th>행위</th><th>대상</th><th>결과</th>{hideIp ? null : <th>IP</th>}</tr></thead>
      <tbody>{rows.length ? rows : <tr className="empty"><td colSpan={8}>조건에 맞는 로그가 없습니다.</td></tr>}</tbody></table></div>
  );
}
export function pageAudit(): Page {
  const f = ST.ui.audit;
  const list = filterAudit(f);
  const { size, view } = paginate(list, f);
  const body = (
    <>
      {pageHead('clipboard', '감사 로그', '로그인·권한 변경·실행·삭제 등 주요 행위의 시각·행위자·변경 내용 조회 (수정·삭제 불가)')}
      {rangeBar(f, { act: 'auRange', from: 'auFrom', to: 'auTo', id: 'au' })}
      <div className="filterbar">{sel('o', [['ALL', '전체 조직'], ['PLATFORM', '플랫폼(조직 없음)'], ...ST.orgs.map((o): SelOpt => [o.id, o.name])], f.org, { onChange: ch('auOrg'), 'aria-label': '조직' })}
        {sel('c', [['ALL', '전체 분류'], ...Object.entries(AUDIT_CATS)], f.cat, { onChange: ch('auCat'), 'aria-label': '분류' })}
        {sel('r', [['ALL', '전체 결과'], ['SUCCESS', '성공'], ['FAILURE', '실패']], f.result, { onChange: ch('auRes'), 'aria-label': '결과' })}<div className="vsep"></div>
        <div className="search">{icon('search')}<Input id="q-audit" className="input" placeholder="행위자 이름·이메일, 행위, 대상으로 검색" value={f.q} onValue={inp('auQ')} /></div><button className="btn btn-secondary" onClick={act('auExport')}>{icon('download', 'sm')}내보내기</button></div>
      <div className="tbl-meta">전체 <b>{list.length}</b>{`건 · ${rangeLabel(f)} · 최신순${f.org !== 'ALL' || f.cat !== 'ALL' || f.result !== 'ALL' || f.q ? ' · ' : ''}`}{f.org !== 'ALL' || f.cat !== 'ALL' || f.result !== 'ALL' || f.q ? <button className="link" onClick={act('auReset')}>필터 초기화</button> : null}<span className="ml-auto faint">행을 누르면 변경 전·후 값과 접속 정보를 볼 수 있습니다</span>{pageSizeSel('audit', size)}</div>
      {auditTable(view)}{pager(list.length, f.page, size, 'audit')}
      <div className="mt12">{notice(<>감사 로그는 <b>추가만 가능(append-only)</b>하며 화면 어디에서도 수정·삭제할 수 없습니다. <b>보존 기간 총 1년</b>: 화면에서는 최근 6개월까지 조회할 수 있고, 6개월이 지난 로그는 보관 저장소(아카이브)로 옮겨 6개월 더 보관한 뒤 파기합니다(보관분은 요청 시 운영팀이 추출). 비밀번호·시크릿 값은 기록하지 않거나 마스킹합니다.</>, '')}</div>
    </>
  );
  return { crumbs: ['감사 로그'], body };
}
ACT.auRange = (d) => pickRange(ST.ui.audit, d.v);
CH.auFrom = (v) => { ST.ui.audit.cFrom = v; applyCustomRange(ST.ui.audit); };
CH.auTo = (v) => { ST.ui.audit.cTo = v; applyCustomRange(ST.ui.audit); };
CH.auOrg = (v) => { ST.ui.audit.org = v; ST.ui.audit.page = 1; render(); };
CH.auCat = (v) => { ST.ui.audit.cat = v; ST.ui.audit.page = 1; render(); };
CH.auRes = (v) => { ST.ui.audit.result = v; ST.ui.audit.page = 1; render(); };
IN.auQ = (v) => { ST.ui.audit.q = v; ST.ui.audit.page = 1; render(); };
ACT.auReset = () => { Object.assign(ST.ui.audit, { org: 'ALL', cat: 'ALL', result: 'ALL', q: '', page: 1 }); render(); };
/** 감사 로그 내보내기 모달 상태 */
interface AuExportState { fmt: string }
ACT.auExport = () => {
  const f = ST.ui.audit; const n = filterAudit(f).length; const [a, b] = rangeOf(f); const days = rangeDays(f); const over = days > EXPORT_MAX_DAYS;
  openOverlay<AuExportState>({
    state: { fmt: 'xlsx' },
    view: (s: AuExportState) => ({
      title: '감사 로그 내보내기', icon: 'download',
      body: (
        <>
          <div className="kv"><span className="k">조회 기간</span><span className="v">{`${a} ~ ${b} `}<span className="muted">{`(${days}일${f.range !== 'custom' ? ` · ${RANGES[f.range][0]}` : ''})`}</span></span><span className="k">조회 조건</span><span className="v">{`${f.org === 'ALL' ? '전체 조직' : f.org === 'PLATFORM' ? '플랫폼' : orgById(f.org).name} · ${f.cat === 'ALL' ? '전체 분류' : AUDIT_CATS[f.cat as AuditCat]}`}</span><span className="k">대상 건수</span><span className="v">{`${n}건`}</span></div>
          <div className="row" style={{ gap: '16px' }}><label className="radio"><Check type="radio" name="rg-aeFmt" checked={s.fmt === 'xlsx'} onClick={act('aeFmt', { v: 'xlsx' })} />Excel (.xlsx)</label><label className="radio"><Check type="radio" name="rg-aeFmt" checked={s.fmt === 'csv'} onClick={act('aeFmt', { v: 'csv' })} />CSV (UTF-8)</label></div>
          {over ? notice(`조회 기간(${days}일)이 내보내기 한도(${EXPORT_MAX_DAYS}일)를 넘습니다. [직접 입력]으로 기간을 ${EXPORT_MAX_DAYS}일 이내로 줄인 뒤 내보내세요.`, 'danger', 'alert') : null}
          {notice(<>한 번에 최대 <b>{`${EXPORT_MAX_DAYS}일 · 50,000건`}</b>까지 내보낼 수 있습니다. 내보내기 행위 자체도 감사 로그에 기록되며, 파일에는 변경 전·후 값이 마스킹된 상태로 포함됩니다.</>, '')}
        </>
      ),
      foot: <><button className="btn btn-secondary" onClick={act('closeOv')}>취소</button><button className="btn btn-primary" onClick={act('aeGo')} disabled={over}>내보내기</button></>,
    }),
  });
};
ACT.aeFmt = (d) => { ovs<AuExportState>().fmt = d.v; refreshOverlay(); };
ACT.aeGo = () => { const s = ovs<AuExportState>(); const f = ST.ui.audit; const [a, b] = rangeOf(f); closeOverlay(); addAudit(null, 'EXPORT', '감사 로그 내보내기', `${a} ~ ${b} · ${filterAudit(f).length}건`, [['형식', '-', s.fmt.toUpperCase()], ['조회 기간', '-', `${a} ~ ${b} (${rangeDays(f)}일)`]]); render(); toast('내보내기 파일을 만들었습니다. (프로토타입: 실제 파일은 생성되지 않음)'); };
ACT.openAudit = (d) => {
  const a = ST.audit.find((x) => x.id === d.id)!;
  const diff = (a.changes || []).length ? <table className="diff"><thead><tr><th style={{ width: '34%' }}>항목</th><th>변경 전</th><th>변경 후</th></tr></thead><tbody>{a.changes!.map(([k, b, n], i) => <tr key={i}><td>{k}</td><td className="old">{b}</td><td className="new">{n}</td></tr>)}</tbody></table> : <p className="faint">변경 항목이 없는 이벤트입니다.</p>;
  openOverlay({
    drawer: true,
    view: () => ({
      title: a.action, sub: `${a.id} · ${a.at}`,
      body: (
        <>
          {/* (포팅) 행위자: 이메일이 없으면('-') 원본처럼 '이름 + 공백 + 빈 문자열 + " · " + 역할'이 텍스트 노드 하나 */}
          <div><p className="sec-t">요약</p><div className="kv"><span className="k">시각</span><span className="v mono">{`${a.at} (KST)`}</span><span className="k">조직</span><span className="v">{a.orgId ? orgById(a.orgId)?.name : '플랫폼'}</span>
            <span className="k">행위자</span><span className="v">{a.actor.email !== '-' ? <>{`${a.actor.name} `}<span className="faint">{a.actor.email}</span>{` · ${roleOfActor(a.actor.role)}`}</> : `${a.actor.name}  · ${roleOfActor(a.actor.role)}`}</span><span className="k">분류 · 행위</span><span className="v">{`${AUDIT_CATS[a.cat]} · ${a.action}`}</span>
            <span className="k">대상</span><span className="v">{a.target}</span><span className="k">결과</span><span className="v">{a.result === 'SUCCESS' ? badge('성공', 'b-teal') : badge('실패', 'b-red')}</span>{a.reason ? <><span className="k">사유</span><span className="v">{a.reason}</span></> : null}</div></div>
          <div><p className="sec-t">변경 내용</p>{diff}</div>
          <div><p className="sec-t">접속 정보</p>{a.ip ? <div className="kv"><span className="k">IP</span><span className="v mono">{a.ip}</span><span className="k">User-Agent</span><span className="v">{a.ua || '-'}</span></div> : <p className="faint">시스템 자동 처리 이벤트로 접속 정보가 없습니다.</p>}</div>
        </>
      ),
      foot: <><span className="faint" style={{ marginRight: 'auto', fontSize: '12px' }}>로그는 수정·삭제할 수 없습니다.</span><button className="btn btn-secondary" onClick={act('closeOv')}>닫기</button></>,
    }),
  });
};
