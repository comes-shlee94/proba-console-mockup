/* ---------- OA-30 활동 로그 ---------- */
import type { AuditCat } from '../../types';
import { AUDIT_CATS } from '../../data';
import {
  ACT, CH, CUR_ORG, IN, ST, Input, act, ch, icon, inp, josa, notice, orgById, pageHead, pageSizeSel, pager, paginate, planBadge, render, sel,
  type Page, type SelOpt,
} from '../../core';
import { applyCustomRange, auditTable, filterAudit, pickRange, rangeBar, rangeLabel } from '../admin/audit';

export function pageActivity(): Page {
  const f = ST.ui.activity;
  const list = filterAudit({ ...f, org: CUR_ORG, result: 'ALL' }, CUR_ORG);
  const cats: AuditCat[] = ['MEMBER', 'PERM', 'MODEL', 'EXEC', 'DATA', 'AUTH', 'ACCOUNT', 'ORG', 'SUPPORT'];
  const pg = paginate(list, f);
  const body = (
    <>
      {pageHead('activity', '활동 로그', '멤버·권한·실행·데이터 변경 이력 (조직 범위 감사 로그)')}
      {rangeBar(f, { act: 'acRange', from: 'acFrom', to: 'acTo', id: 'ac' })}
      <div className="filterbar">{sel('c', [['ALL', '전체 분류'], ...cats.map((c): SelOpt => [c, AUDIT_CATS[c]])], f.cat, { onChange: ch('acCat'), 'aria-label': '분류' })}<div className="vsep"></div>
        <div className="search">{icon('search')}<Input id="q-activity" className="input" placeholder="행위자·행위·대상으로 검색" value={f.q} onValue={inp('acQ')} /></div></div>
      <div className="tbl-meta">전체 <b>{list.length}</b>{`건 · ${rangeLabel(f)} · 최신순`}<span className="ml-auto faint">서비스 관리자의 지원 접속·조직 관리자 지정도 함께 표시됩니다</span>{pageSizeSel('activity', pg.size)}</div>
      {auditTable(pg.view, { hideOrg: true, org: true })}{pager(list.length, f.page, pg.size, 'activity')}
      <div className="mt12">{notice(<>행을 누르면 변경 전·후 값과 접속 정보(IP · User-Agent)를 볼 수 있습니다. 화면에서는 최근 6개월까지 조회할 수 있으며, 로그는 수정·삭제할 수 없습니다. 조직 활동 로그는 <b>Enterprise 플랜</b>에서 제공됩니다.</>, '')}</div>
    </>
  );
  return { crumbs: ['활동 로그'], body };
}
// 기간: 감사 로그와 같은 기간 버튼·직접 입력(v0.12 요청 4)
ACT.acRange = (d) => pickRange(ST.ui.activity, d.v);
CH.acFrom = (v) => { ST.ui.activity.cFrom = v; applyCustomRange(ST.ui.activity); };
CH.acTo = (v) => { ST.ui.activity.cTo = v; applyCustomRange(ST.ui.activity); };
CH.acCat = (v) => { ST.ui.activity.cat = v; ST.ui.activity.page = 1; render(); };
IN.acQ = (v) => { ST.ui.activity.q = v; ST.ui.activity.page = 1; render(); };

export function pageActivityLocked(): Page {
  const o = orgById(CUR_ORG);
  const body = (
    <>
      {pageHead('activity', '활동 로그', '멤버·권한·실행·데이터 변경 이력')}
      <div className="card lock-page"><span className="bi" style={{ display: 'inline-grid', placeItems: 'center', width: '52px', height: '52px', borderRadius: '14px', background: 'var(--admin-soft)', color: 'var(--admin)' }}>{icon('lock', 'lg')}</span>
        <h2 style={{ margin: '14px 0 6px', fontSize: '18px' }}>Enterprise 플랜 전용 기능입니다</h2>
        <p className="muted" style={{ lineHeight: '1.7', margin: '0' }}>현재 <b>{josa(o.name, '은/는')}</b> {planBadge(o.plan)} 플랜을 사용 중입니다. 조직 활동 로그(멤버·권한·AI 모델 설정 변경, 실행·데이터 삭제, 로그인 이력과 접속 정보)는 <b>Enterprise 플랜</b>에서 조회할 수 있습니다.<br />활동 기록은 플랜과 관계없이 계속 저장되며, [조직 정보]에서 Enterprise로 플랜을 변경하면 바로 확인할 수 있습니다.</p>
        <div className="row mt16" style={{ justifyContent: 'center', gap: '8px' }}><button className="btn btn-primary" onClick={act('oiPlan')}>{icon('swap', 'sm')}플랜 변경</button><button className="btn btn-secondary" onClick={act('nav', { href: '/org/info' })}>조직 정보 보기</button></div></div>
    </>
  );
  return { crumbs: ['활동 로그'], body };
}
