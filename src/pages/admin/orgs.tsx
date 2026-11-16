/* ==========================================================
   서비스 관리자 콘솔 · 조직 관리 (SA-10 ~ SA-16)
   v0.4: 플랜 변경(구 SA-13)과 조직 정보 수정은 조직 관리자 기능으로 이동 → pages_org.js (OA-60 ~ OA-62)
   ========================================================== */
import type { ReactNode } from 'react';
import type { Account, Org, PlanKey } from '../../types';
import { MEM_STATUS, ORG_STATUS, PLANS, ROLES, USAGE_BASE } from '../../data';
import {
  ACT, CH, EMAIL_RE, IN, NAME_RE, ST, acct, act, addAudit, addDays, ch, Check, closeOverlay, confirmModal, ddayOf, field, go, icon, inp, Input,
  isPlatformMember, josa, me, memBadge, memOf, membersOf, nextId, notice, openMenu, openOverlay, orgById, orgFlags, orgStatusBadge, ovs,
  pageHead, pageSizeSel, pager, paginate, planBadge, refreshOverlay, render, seatFullText, seatLimit, seatsLeft, seatsUsed, sel, Textarea,
  toast, trialDday, trialSuspended, usd,
  type MenuEntry, type Page, type SelOpt,
} from '../../core';
import { usageOf } from './usage';

// 플랜 설명은 목록(·)으로 표시
export function planFeats(k: PlanKey): ReactNode { return <span className="d plan-feats">{PLANS[k].feats.map((f, i) => <span key={i} className="li">{f}</span>)}</span>; }
function usageNow(orgId: string) { return usageOf(orgId, '2026-11'); }
function orgAdminsCell(o: Org): ReactNode {
  const admins = membersOf(o.id).filter((m) => m.role === 'ORG_ADMIN');
  if (!admins.length) return <span className="faint">-</span>;
  const first = admins.find((m) => m.status === 'ACTIVE') || admins[0];
  const a = acct(first.userId);
  const more = admins.length > 1 ? <>{' '}<span className="faint">{`외 ${admins.length - 1}명`}</span></> : null;
  const st = first.status !== 'ACTIVE' ? <>{' '}{memBadge(first)}</> : null;
  return <div className="two"><span className="p">{a.name}{more}{st}</span><span className="s">{a.email}</span></div>;
}
function flagIcons(o: Org): ReactNode {
  const fl = orgFlags(o);
  return fl.map((f, i) => <span key={i} className="warn-ic" data-tip={f.tip}>{icon('alert', 'sm')}</span>);
}
function orgStatusCell(o: Org): ReactNode {
  if (o.status === 'SUSPENDED') return <div className="two">{orgStatusBadge(o)}<span className="s">{o.suspendReason}</span></div>;
  if (o.status === 'PENDING_DELETION') return <div className="two">{orgStatusBadge(o)}<span className="s dday red">{`D-${ddayOf(o.purgeAt!)} 영구 삭제`}</span></div>;
  return orgStatusBadge(o);
}
// key: 두 모양(제한 없음 · 사용/한도)이 같은 칸에서 바뀌면 요소를 새로 만듦 — React는 style이 빠진 요소에 빈 style=""을 남기지만 원본 DOM 패치는 속성을 지웠음
function seatCell(o: Org): ReactNode {
  const used = seatsUsed(o.id); const lim = seatLimit(o);
  if (lim == null) return <div key="two" className="two"><span className="p num" style={{ fontWeight: '400' }}>{`${used}명`}</span><span className="s">제한 없음</span></div>;
  const r = used / lim;
  return <div key="col" className="col" style={{ gap: '4px' }}><span className="num">{`${used} `}<span className="faint">{`/ ${lim}`}</span></span><div className={`progress ${r >= 0.8 ? 'warn' : ''}`} style={{ width: '72px' }}><i style={{ width: `${Math.min(100, r * 100)}%` }}></i></div></div>;
}
export function pageOrgs(): Page {
  const u = ST.ui.orgs;
  const all = ST.orgs;
  const cnt = (s: string) => all.filter((o) => s === 'ALL' || o.status === s).length;
  const attnDefs = [['trial', 'Trial 만료 임박'], ['adminPending', '관리자 미가입'], ['adminMissing', '관리자 부재'], ['seats', '좌석 부족']];
  const attnCnt = (k: string) => all.filter((o) => orgFlags(o).some((f) => f.k === k)).length;
  const q = u.q.trim().toLowerCase();
  const list = all.filter((o) => (u.status === 'ALL' || o.status === u.status) && (u.plan === 'ALL' || o.plan === u.plan)
    && (!u.attn || orgFlags(o).some((f) => f.k === u.attn))
    && (!q || o.name.toLowerCase().includes(q) || membersOf(o.id).some((m) => m.role === 'ORG_ADMIN' && (acct(m.userId).name.includes(q) || acct(m.userId).email.includes(q)))));
  const tabs = [['ALL', '전체'], ['ACTIVE', '운영'], ['SUSPENDED', '정지'], ['PENDING_DELETION', '삭제 예정']]
    .map(([k, l], i) => <button key={i} className={u.status === k ? 'on' : ''} onClick={act('orgStatus', { v: k })}>{l}<span className="n">{cnt(k)}</span></button>);
  const attn = attnDefs.filter(([k]) => attnCnt(k)).map(([k, l], i) => <button key={i} className={`attn-chip ${u.attn === k ? 'on' : ''}`} onClick={act('orgAttn', { v: k })}>{icon('alert', 'sm')}{l} <b>{attnCnt(k)}</b></button>);
  const pg = paginate(list, u);
  const rows = pg.view.map((o, i) => {
    const us = usageNow(o.id);
    const trial = o.plan === 'TRIAL' && o.trialEndsAt ? trialDday(o, '만료 ') : null;
    // 관리 버튼의 data-act · data-id는 캡처·시연용 API(PROTO.open('orgMenu'))가 버튼을 찾을 때 사용
    return (
      <tr key={i} className={`click ${o.status === 'PENDING_DELETION' ? 'dim' : ''}`} onClick={act('openOrg', { id: o.id })}>
        <td><div className="two"><span className="p row" style={{ gap: '4px' }}>{o.name} {flagIcons(o)}</span><span className="s">{o.id}</span></div></td>
        <td><div className="col" style={{ gap: '3px', alignItems: 'flex-start' }}>{planBadge(o.plan)}{trial}</div></td>
        <td>{seatCell(o)}</td>
        <td>{orgAdminsCell(o)}</td>
        <td className="r num">{usd(us.billUsd)}</td>
        <td className="num">{o.createdAt}</td>
        <td>{orgStatusCell(o)}</td>
        <td className="c"><button className="icon-btn" data-act="orgMenu" data-id={o.id} onClick={act('orgMenu', { id: o.id })} aria-label={`${o.name} 관리`}>{icon('more')}</button></td></tr>
    );
  });
  const body = (
    <>
      {pageHead('building', '조직 관리', '서비스에 등록된 전체 조직의 생성·정지·삭제와 조직 관리자 지정 · 플랜·조직 정보는 각 조직의 조직 관리자가 변경')}
      <div className="toolbar"><div className="seg">{tabs}</div><div className="attn"><span>주의 필요</span>{attn.length ? attn : <span className="faint">없음</span>}</div></div>
      <div className="filterbar">{sel('plan', [['ALL', '전체 플랜'], ['TRIAL', 'Trial'], ['TEAM', 'Team'], ['ENTERPRISE', 'Enterprise']], u.plan, { onChange: ch('orgPlan'), 'aria-label': '플랜 필터' })}
        <div className="vsep"></div><div className="search">{icon('search')}<Input id="q-orgs" className="input" placeholder="조직명, 조직 관리자 이름·이메일로 검색" value={u.q} onValue={inp('orgQ')} /></div>
        <button className="btn btn-primary" onClick={act('orgCreate')}>{icon('plus')}조직 추가</button></div>
      <div className="tbl-meta">전체 <b>{list.length}</b>{u.status !== 'ALL' || u.plan !== 'ALL' || u.attn || u.q ? <>{' · '}<button className="link" onClick={act('orgReset')}>필터 초기화</button></> : null}<span className="ml-auto faint">이번 달 사용 금액은 11-11 10:45 기준 (5분마다 갱신)</span>{pageSizeSel('orgs', pg.size)}</div>
      <div className="tbl-wrap"><table className="tbl"><colgroup><col style={{ width: '19%' }} /><col style={{ width: '10%' }} /><col style={{ width: '10%' }} /><col style={{ width: '21%' }} /><col style={{ width: '15%' }} /><col style={{ width: '9%' }} /><col style={{ width: '11%' }} /><col style={{ width: '56px' }} /></colgroup>
        <thead><tr><th>조직명</th><th>플랜</th><th>좌석</th><th>조직 관리자</th><th className="r">이번 달 사용 금액</th><th>생성일</th><th>상태</th><th className="c">관리</th></tr></thead>
        <tbody>{rows.length ? rows : <tr className="empty"><td colSpan={8}>검색 결과가 없습니다.<br /><button className="link mt8" onClick={act('orgReset')}>필터 초기화</button></td></tr>}</tbody></table></div>
      {pager(list.length, u.page, pg.size, 'orgs')}
    </>
  );
  return { crumbs: ['조직 관리'], body };
}
ACT.noop = () => {};
ACT.orgStatus = (d) => { ST.ui.orgs.status = d.v; ST.ui.orgs.page = 1; render(); };
ACT.orgAttn = (d) => { ST.ui.orgs.attn = ST.ui.orgs.attn === d.v ? null : d.v; ST.ui.orgs.page = 1; render(); };
CH.orgPlan = (v) => { ST.ui.orgs.plan = v; ST.ui.orgs.page = 1; render(); };
IN.orgQ = (v) => { ST.ui.orgs.q = v; ST.ui.orgs.page = 1; render(); };
ACT.orgReset = () => { Object.assign(ST.ui.orgs, { status: 'ALL', plan: 'ALL', q: '', attn: null, page: 1 }); render(); };
ACT.openOrg = (d) => { ST.ui.orgDetail.tab = 'info'; go('/admin/organizations/' + d.id); };
ACT.orgMenu = (d, el) => openMenu(el!, orgMenuItems(orgById(d.id)));
export function orgMenuItems(o: Org, inDetail?: boolean): MenuEntry[] {
  const items: MenuEntry[] = [];
  if (!inDetail) items.push({ label: '상세 보기', icon: 'ext', run: () => ACT.openOrg({ id: o.id }) });
  if (o.status !== 'PENDING_DELETION') {
    if (o.status === 'ACTIVE') items.push({ label: '조직 관리자 지정', icon: 'crown', run: () => openAssignAdmin(o) });
    items.push('-');
    if (o.status === 'ACTIVE') items.push({ label: '조직 정지', icon: 'pause', run: () => openSuspend(o) });
    // Trial 만료 정지는 조직 관리자가 플랜을 Team·Enterprise로 바꾸면 해제 (Trial 연장 없음)
    if (o.status === 'SUSPENDED') items.push(trialSuspended(o) ? { label: '정지 해제', icon: 'play', disabled: true, hint: 'Trial 만료 정지는 조직 관리자가 플랜을 변경하면 해제됩니다' } : { label: '정지 해제', icon: 'play', run: () => openResume(o) });
    items.push({ label: '조직 삭제', icon: 'trash', danger: true, run: () => openDelete(o) });
  } else {
    items.push('-', { label: '삭제 취소(복구)', icon: 'undo', run: () => openRestore(o) });
  }
  return items;
}

/* ---------- SA-11 조직 추가 ---------- */
// Trial 기간: 생성일부터 14일 고정(서비스 관리자가 정하지 않음 · 연장 없음 — BR-ORG-10, v0.14)
const TRIAL_DAYS = 14; const TRIAL_END_NEW = addDays('2026-11-11', TRIAL_DAYS);
interface OrgCreateState { name: string; plan: PlanKey; adminName: string; adminEmail: string; memo: string; err: { name?: string; adminName?: string; adminEmail?: string } }
ACT.orgCreate = () => openOverlay<OrgCreateState>({
  width: 640,
  state: { name: '', plan: 'TEAM', adminName: '', adminEmail: '', memo: '', err: {} },
  view: (s: OrgCreateState) => {
    const cards = Object.entries(PLANS).map(([k, p], i) => <button key={i} className={`radio-card ${s.plan === k ? 'on' : ''}`} onClick={act('ocPlan', { v: k })}><span className="t">{planBadge(k as PlanKey)}</span>{planFeats(k as PlanKey)}</button>);
    const ready = s.name.trim() && s.adminName.trim() && s.adminEmail.trim();
    return {
      title: '조직 추가',
      body: (
        <>
          <div className="form-grid">
            {field('조직명', <Input id="f-oc-name" className="input" maxLength={50} placeholder="조직명을 입력해주세요." value={s.name} onValue={inp('ocName')} autoFocus />, { req: 1, help: '2~50자 · 다른 조직과 같은 이름은 사용할 수 없습니다', err: s.err.name, cls: 'full' })}
            <div className="field full"><span className="lbl">플랜<span className="req">*</span></span><div className="radio-cards c3">{cards}</div></div>
            {field('조직 관리자 이름', <Input id="f-oc-an" className="input" maxLength={30} placeholder="이름을 입력해주세요." value={s.adminName} onValue={inp('ocAName')} />, { req: 1, err: s.err.adminName })}
            {field('조직 관리자 이메일', <Input id="f-oc-ae" className="input" maxLength={254} placeholder="name@company.com" value={s.adminEmail} onValue={inp('ocAEmail')} />, { req: 1, err: s.err.adminEmail })}
            {field('메모', <Textarea id="f-oc-memo" className="textarea" maxLength={200} placeholder="예: PoC 진행 중, 도입 부서" value={s.memo} onValue={inp('ocMemo')} />, { help: '선택 · 200자 이내 · 조직 관리자에게도 보이며, 생성 후에는 조직 관리자가 수정합니다', cls: 'full' })}
          </div>
          {s.plan === 'TRIAL' ? notice(<><b>Trial</b>은 생성일부터 <b>14일</b> 뒤인 <b>{TRIAL_END_NEW}</b>에 끝나며, 만료일은 정하거나 연장할 수 없습니다. 만료 7일 전·1일 전 조직 관리자에게 안내 메일을 보내고, 만료되면 자동으로 정지됩니다.</>, 'info') : null}
          {notice(<>조직을 만들면 조직 관리자에게 <b>초대 메일</b>이 발송됩니다(유효기간 1일). 조직 관리자는 해당 조직에서 <b>조직 정보·플랜 변경, 멤버 초대·역할 변경, 메뉴별 권한, AI 모델 설정</b>을 할 수 있습니다. 생성 후 조직명·메모·플랜은 서비스 관리자가 바꿀 수 없습니다. 새 조직은 <b>서비스 기본 모델</b>만 사용하도록 설정된 상태로 시작합니다.</>, 'info')}
        </>
      ),
      foot: <><button className="btn btn-secondary" onClick={act('closeOv')}>취소</button><button className="btn btn-primary" onClick={act('ocSubmit')} disabled={!ready}>조직 추가</button></>,
    };
  },
});
// ovs() = 맨 위 오버레이의 상태 (core/overlay에 정의)
ACT.ocPlan = (d) => { ovs<OrgCreateState>().plan = d.v as PlanKey; refreshOverlay(); };
IN.ocName = (v) => { ovs<OrgCreateState>().name = v; ovs<OrgCreateState>().err.name = ''; refreshOverlay(); };
IN.ocAName = (v) => { ovs<OrgCreateState>().adminName = v; ovs<OrgCreateState>().err.adminName = ''; refreshOverlay(); };
IN.ocAEmail = (v) => { ovs<OrgCreateState>().adminEmail = v; ovs<OrgCreateState>().err.adminEmail = ''; refreshOverlay(); };
IN.ocMemo = (v) => { ovs<OrgCreateState>().memo = v; };
ACT.ocSubmit = () => {
  const s = ovs<OrgCreateState>(); const err: OrgCreateState['err'] = {};
  const name = s.name.trim().replace(/\s+/g, ' ');
  if (name.length < 2) err.name = '조직명은 2자 이상 입력해주세요.';
  else if (ST.orgs.some((o) => o.name.toLowerCase() === name.toLowerCase())) err.name = '이미 사용 중인 조직명입니다.';
  if (!NAME_RE.test(s.adminName.trim())) err.adminName = '이름은 한글, 영문, 숫자만 입력할 수 있습니다.';
  if (!EMAIL_RE.test(s.adminEmail.trim())) err.adminEmail = '이메일 형식에 맞게 입력해주세요.';
  else {
    const ex = ST.accounts.find((x) => x.email.toLowerCase() === s.adminEmail.trim().toLowerCase());
    if (isPlatformMember(ex)) err.adminEmail = '서비스 관리자(플랫폼 멤버) 계정은 조직에 소속될 수 없습니다. 다른 이메일을 입력해주세요.';
    else if (ex && ex.status === 'DISABLED') err.adminEmail = '비활성화된 계정입니다. 계정을 먼저 활성화하거나 다른 이메일을 입력해주세요.';
  }
  if (Object.keys(err).length) { s.err = err; refreshOverlay(); return; }
  const id = nextId(ST.orgs, 'ORG-');
  const email = s.adminEmail.trim();
  let a = ST.accounts.find((x) => x.email.toLowerCase() === email.toLowerCase());
  if (!a) { a = { id: nextId(ST.accounts, 'U-'), name: s.adminName.trim(), email, status: 'INVITED', invitedAt: '2026-11-11 10:46', expiresAt: '2026-11-12 10:46' }; ST.accounts.push(a); }
  ST.orgs.push({ id, name, plan: s.plan, status: 'ACTIVE', createdAt: '2026-11-11', createdBy: me().name, trialEndsAt: s.plan === 'TRIAL' ? TRIAL_END_NEW : undefined, memo: s.memo });
  ST.memberships.push({ id: nextId(ST.memberships, 'MB-'), orgId: id, userId: a.id, role: 'ORG_ADMIN', status: 'PENDING', since: '2026-11-11', invitedBy: me().name, invitedAt: '2026-11-11 10:46', expiresAt: '2026-11-12 10:46' });
  USAGE_BASE[id] = { lqa: [0, 0], fqa: [0, 0], load: [0, 0], app: [0, 0], llm: {} };
  const defModel = ST.models.find((m) => m.isDefault)!.name;
  ST.orgModels[id] = { on: [defModel], def: defModel, plans: {} };
  addAudit(id, 'ORG', '조직 생성', name, [['플랜', '-', PLANS[s.plan].label], ['조직 관리자 초대', '-', email]]);
  closeOverlay(); render();
  toast(`${josa(name, '을/를')} 만들고 ${email}로 초대 메일을 보냈습니다.`);
};

/* ---------- SA-14 정지 / 정지 해제 ---------- */
interface SuspendState { reasonType: string; reason: string; running: string }
export function openSuspend(o: Org) {
  openOverlay<SuspendState>({
    width: 560,
    state: { reasonType: '', reason: '', running: 'WAIT' },
    view: (s: SuspendState) => {
      const actN = membersOf(o.id).filter((m) => m.status === 'ACTIVE').length; // 원본 변수명 act — core의 act()와 겹쳐 이름만 바꿈
      return {
        title: `${josa(o.name, '을/를')} 정지할까요?`, icon: 'pause', iconType: 'warn',
        body: (
          <>
            <div className="notice warn">{icon('alert')}<div>정지하면 다음과 같이 처리됩니다.<ul><li>멤버 <b>{`${actN}명`}</b>{`의 ${o.name} 접근 차단 (다른 조직 이용에는 영향 없음)`}</li><li>예약 실행 <b>5건</b> 일시 중지 · 대기 중 실행 <b>2건</b> 취소</li><li>CI 웹훅 등 외부 실행 요청 거부 (응답: 403 ORG_SUSPENDED)</li><li>데이터는 그대로 보존되며 언제든 정지를 해제할 수 있습니다</li></ul></div></div>
            <div className="field"><span className="lbl">실행 중인 작업 처리</span>
              <label className="radio"><Check type="radio" name="run" checked={s.running === 'WAIT'} onClick={act('suRun', { v: 'WAIT' })} /><span><b>완료될 때까지 기다린 후 정지</b><br /><span className="muted">현재 실행 중 3건 · 최대 실행 시간(타임아웃) 이내에 종료</span></span></label>
              <label className="radio mt8"><Check type="radio" name="run" checked={s.running === 'STOP'} onClick={act('suRun', { v: 'STOP' })} /><span><b>즉시 중지</b><br /><span className="muted">실행 중 작업을 '취소'로 기록하고 자원을 회수</span></span></label></div>
            {field('정지 사유', sel('r', [['', '사유를 선택해주세요'], ['CONTRACT', '계약 만료·갱신 대기'], ['PAYMENT', '이용료 미납'], ['SECURITY', '보안 이슈'], ['REQUEST', '고객 요청'], ['ETC', '기타']], s.reasonType, { id: 'f-su-type', onChange: ch('suType') }), { req: 1 })}
            {field('상세 내용', <Textarea id="f-su-reason" className="textarea" placeholder="조직 관리자 안내 메일과 감사 로그에 함께 기록됩니다." value={s.reason} onValue={inp('suReason')} />, {})}
          </>
        ),
        foot: <><button className="btn btn-secondary" onClick={act('closeOv')}>취소</button><button className="btn btn-danger" onClick={act('suSubmit', { id: o.id })} disabled={!s.reasonType}>조직 정지</button></>,
      };
    },
  });
}
ACT.suRun = (d) => { ovs<SuspendState>().running = d.v; refreshOverlay(); };
CH.suType = (v) => { ovs<SuspendState>().reasonType = v; refreshOverlay(); };
IN.suReason = (v) => { ovs<SuspendState>().reason = v; };
ACT.suSubmit = (d) => {
  const o = orgById(d.id); const s = ovs<SuspendState>();
  const label = ({ CONTRACT: '계약 만료·갱신 대기', PAYMENT: '이용료 미납', SECURITY: '보안 이슈', REQUEST: '고객 요청', ETC: '기타' } as Record<string, string>)[s.reasonType];
  Object.assign(o, { status: 'SUSPENDED', suspendType: 'MANUAL', suspendedAt: '2026-11-11 10:47', suspendReason: label, suspendedBy: me().name });
  addAudit(o.id, 'ORG', '조직 정지', o.name, [['조직 상태', '운영', '정지'], ['실행 중 작업', '-', s.running === 'WAIT' ? '완료 후 정지' : '즉시 중지']], { reason: label + (s.reason ? ' · ' + s.reason : '') });
  closeOverlay(); render();
  toast(`${josa(o.name, '을/를')} 정지했습니다. 조직 관리자에게 안내 메일을 보냈습니다.`, 'warning');
};
export function openResume(o: Org) {
  confirmModal({
    title: `${o.name} 정지를 해제할까요?`, icon: 'play',
    body: <><p>멤버 로그인과 예약 실행이 다시 허용됩니다.</p>{notice(<>정지 기간 중 건너뛴 예약 실행은 <b>자동으로 재실행되지 않습니다.</b> 필요하면 조직에서 수동으로 실행해야 합니다.</>, '')}</>,
    confirmLabel: '정지 해제',
    onConfirm: () => { o.status = 'ACTIVE'; delete o.suspendType; addAudit(o.id, 'ORG', '정지 해제', o.name, [['조직 상태', '정지', '운영']]); render(); toast(`${o.name} 정지를 해제했습니다.`); },
  });
}

/* ---------- SA-15 삭제 / 삭제 취소 ---------- */
interface DeleteState { typed: string; reason: string }
export function openDelete(o: Org) {
  openOverlay<DeleteState>({
    width: 560,
    state: { typed: '', reason: '' },
    view: (s: DeleteState) => ({
      title: `${josa(o.name, '을/를')} 삭제할까요?`, icon: 'trash', iconType: 'danger',
      body: (
        <>
          <div className="notice danger">{icon('alert')}<div>삭제를 요청하면 즉시 <b>'삭제 예정'</b> 상태가 되어 모든 멤버의 접근이 차단됩니다.<ul><li><b>{`30일 후(${addDays('2026-11-11', 30)})`}</b> 대상·케이스·계획·실행 이력·결함·산출물이 영구 삭제됩니다</li><li>유예 기간 중에는 <b>삭제 취소</b>로 복구할 수 있습니다</li><li>감사 로그는 보존 정책에 따라 삭제 후에도 유지됩니다</li><li>사용자 계정은 삭제되지 않으며 이 조직의 멤버십만 해제됩니다</li></ul></div></div>
          {field(<>확인을 위해 조직명 <b>{o.name}</b>을(를) 입력하세요</>, <Input id="f-del-name" className="input" placeholder={o.name} value={s.typed} onValue={inp('delTyped')} autoFocus />, { req: 1 })}
          {field('삭제 사유', <Input id="f-del-reason" className="input" placeholder="예: 고객 요청(서비스 해지)" value={s.reason} onValue={inp('delReason')} />, { help: '선택 · 감사 로그에 기록' })}
        </>
      ),
      foot: <><button className="btn btn-secondary" onClick={act('closeOv')}>취소</button><button className="btn btn-danger" onClick={act('delSubmit', { id: o.id })} disabled={s.typed !== o.name}>삭제 요청</button></>,
    }),
  });
}
IN.delTyped = (v) => { ovs<DeleteState>().typed = v; refreshOverlay(); };
IN.delReason = (v) => { ovs<DeleteState>().reason = v; };
ACT.delSubmit = (d) => {
  const o = orgById(d.id); const s = ovs<DeleteState>(); const before = ORG_STATUS[o.status][0];
  Object.assign(o, { status: 'PENDING_DELETION', deleteRequestedAt: '2026-11-11 10:48', purgeAt: addDays('2026-11-11', 30), deleteReason: s.reason || '-', deletedBy: me().name });
  addAudit(o.id, 'ORG', '삭제 요청', o.name, [['조직 상태', before, '삭제 예정'], ['영구 삭제 예정일', '-', o.purgeAt!]], { reason: s.reason });
  closeOverlay(); render();
  toast(`${josa(o.name, '을/를')} 삭제 예정으로 변경했습니다. ${o.purgeAt}에 영구 삭제됩니다.`, 'warning');
};
export function openRestore(o: Org) {
  confirmModal({
    title: `${o.name} 삭제를 취소할까요?`, icon: 'undo',
    body: <p>조직이 <b>'정지'</b> 상태로 복구됩니다. 멤버 접근을 다시 허용하려면 복구 후 <b>정지 해제</b>를 진행하세요.</p>,
    confirmLabel: '삭제 취소',
    onConfirm: () => {
      const trialOver = o.plan === 'TRIAL' && o.trialEndsAt && ddayOf(o.trialEndsAt) < 0;
      Object.assign(o, trialOver ? { status: 'SUSPENDED', suspendType: 'TRIAL_EXPIRED', suspendReason: 'Trial 만료', suspendedAt: '2026-11-11 10:49' } : { status: 'SUSPENDED', suspendType: 'MANUAL', suspendReason: '삭제 취소 후 확인 대기', suspendedAt: '2026-11-11 10:49' });
      addAudit(o.id, 'ORG', '삭제 취소', o.name, [['조직 상태', '삭제 예정', trialOver ? '정지(Trial 만료)' : '정지']]); render(); toast(`${o.name} 삭제를 취소했습니다. 현재 '정지' 상태입니다.`);
    },
  });
}

/* ---------- SA-16 조직 관리자 지정 ---------- */
interface AssignAdminState { mode: string; userId: string; name: string; email: string; err: { name?: string; email?: string } }
export function openAssignAdmin(o: Org) {
  const cands = membersOf(o.id).filter((m) => m.status === 'ACTIVE' && m.role !== 'ORG_ADMIN' && acct(m.userId).status === 'ACTIVE');
  openOverlay<AssignAdminState>({
    width: 560,
    state: { mode: cands.length ? 'member' : 'invite', userId: cands[0]?.userId || '', name: '', email: '', err: {} },
    view: (s: AssignAdminState) => ({
      title: `${o.name} 조직 관리자 지정`, icon: 'crown',
      body: (
        <>
          {notice(<>조직 관리자가 없거나 연락할 수 없을 때 사용하는 <b>운영 기능</b>입니다. 지정 결과는 조직 활동 로그·감사 로그에 기록되고 대상자에게 안내 메일이 발송됩니다.</>, 'info')}
          <label className="radio"><Check type="radio" name="rg-aaMode" checked={s.mode === 'member'} disabled={!cands.length} onClick={act('aaMode', { v: 'member' })} /><span><b>기존 멤버를 조직 관리자로 지정</b>{cands.length ? null : <><br /><span className="faint">지정 가능한 활성 멤버가 없습니다</span></>}</span></label>
          {s.mode === 'member' && cands.length ? field('멤버 선택', sel('u', cands.map((m): SelOpt => [m.userId, `${acct(m.userId).name} (${acct(m.userId).email}) · 현재 ${ROLES[m.role]}`]), s.userId, { id: 'f-aa-user', onChange: ch('aaUser') }), {}) : null}
          {/* key: 원본 DOM 패치는 [멤버 선택] 칸이 빠질 때(기존 멤버 → 새 사용자) 이 라벨을 새로 만들어 누른 라디오의 포커스가 사라졌음 — 모드가 바뀌면 새로 만들어 같은 포커스 동작을 재현 */}
          <label key={s.mode} className="radio"><Check type="radio" name="rg-aaMode" checked={s.mode === 'invite'} onClick={act('aaMode', { v: 'invite' })} /><span><b>새 사용자를 조직 관리자로 초대</b></span></label>
          {s.mode === 'invite' ? <><div className="form-grid">{field('이름', <Input id="f-aa-n" className="input" value={s.name} onValue={inp('aaName')} />, { req: 1, err: s.err.name })}{field('이메일', <Input id="f-aa-e" className="input" value={s.email} onValue={inp('aaEmail')} />, { req: 1, err: s.err.email })}</div>{aaInviteNotice(o, s)}</> : null}
        </>
      ),
      foot: <><button className="btn btn-secondary" onClick={act('closeOv')}>취소</button><button className="btn btn-primary" onClick={act('aaSubmit', { id: o.id })}>지정</button></>,
    }),
  });
}
// 초대 칸 아래 안내: 이미 이 조직에 초대된 이메일이면 무엇이 바뀌는지, 좌석이 꽉 찼으면 새 초대 불가
const pendingMemOf = (o: Org, email: string) => { const ex = ST.accounts.find((x) => x.email.toLowerCase() === email.trim().toLowerCase()); const m = ex && memOf(o.id, ex.id); return m && (m.status === 'PENDING' || m.status === 'EXPIRED') ? m : null; };
function aaInviteNotice(o: Org, s: AssignAdminState): ReactNode {
  const pm = EMAIL_RE.test(s.email.trim()) && pendingMemOf(o, s.email);
  if (pm) return notice(<><b>{acct(pm.userId).name}</b>님은 이 조직에 <b>{ROLES[pm.role]}</b>(으)로 초대된 상태입니다({MEM_STATUS[pm.status][0]}). [지정]을 누르면 역할을 <b>조직 관리자</b>로 바꿔 초대를 다시 보냅니다(이전 초대 링크 무효).{pm.status === 'EXPIRED' && seatsLeft(o.id) <= 0 ? ' 단, 좌석이 부족해 지금은 다시 보낼 수 없습니다.' : null}</>, 'info');
  if (seatsLeft(o.id) <= 0) return notice(`좌석이 모두 찼습니다(${seatFullText(o.id)}). 새 사용자를 초대할 수 없으니 기존 멤버를 지정하거나, 조직 관리자에게 플랜 변경·멤버 정리를 요청하세요.`, 'warn', 'alert');
  return null;
}
ACT.aaMode = (d) => { ovs<AssignAdminState>().mode = d.v; refreshOverlay(); };
CH.aaUser = (v) => { ovs<AssignAdminState>().userId = v; };
IN.aaName = (v) => { ovs<AssignAdminState>().name = v; };
IN.aaEmail = (v) => { ovs<AssignAdminState>().email = v; refreshOverlay(); };
ACT.aaSubmit = (d) => {
  const o = orgById(d.id); const s = ovs<AssignAdminState>();
  if (s.mode === 'member') {
    const m = memOf(o.id, s.userId)!; const before = ROLES[m.role]; m.role = 'ORG_ADMIN';
    addAudit(o.id, 'MEMBER', '조직 관리자 지정', `${acct(m.userId).name}(${acct(m.userId).email})`, [['역할', before, '조직 관리자']], { reason: '서비스 관리자 지정' });
    closeOverlay(); render(); toast(`${acct(m.userId).name}님을 ${o.name}의 조직 관리자로 지정했습니다.`);
  } else {
    const err: AssignAdminState['err'] = {};
    if (!NAME_RE.test(s.name.trim())) err.name = '이름은 한글, 영문, 숫자만 입력할 수 있습니다.';
    const ex = ST.accounts.find((x) => x.email.toLowerCase() === s.email.trim().toLowerCase());
    const mem = ex && memOf(o.id, ex.id); // 이 조직의 기존 멤버십(초대 대기·만료 포함)
    const reinvite = mem && (mem.status === 'PENDING' || mem.status === 'EXPIRED');
    if (!EMAIL_RE.test(s.email.trim())) err.email = '이메일 형식에 맞게 입력해주세요.';
    else if (isPlatformMember(ex)) err.email = '서비스 관리자(플랫폼 멤버) 계정은 조직에 소속될 수 없습니다.';
    else if (ex && ex.status === 'DISABLED') err.email = '비활성화된 계정입니다. 계정을 먼저 활성화해주세요.';
    else if (mem && mem.status === 'ACTIVE' && mem.role === 'ORG_ADMIN') err.email = '이미 이 조직의 조직 관리자입니다.';
    else if (mem && mem.status === 'ACTIVE' && ex!.status === 'LOCKED') err.email = '잠긴 계정입니다. [사용자 관리]에서 잠금을 해제한 뒤 [기존 멤버를 조직 관리자로 지정]을 이용하세요.';
    else if (mem && mem.status === 'ACTIVE') err.email = '이미 이 조직의 멤버입니다. [기존 멤버를 조직 관리자로 지정]을 이용하세요.';
    else if (mem && mem.status === 'INACTIVE') err.email = '이 조직에서 비활성 상태인 멤버입니다. 조직 관리자가 멤버를 활성화한 뒤 [기존 멤버를 조직 관리자로 지정]을 이용하세요.';
    else if ((!mem || mem.status === 'EXPIRED') && seatsLeft(o.id) <= 0) err.email = `좌석이 부족해 초대할 수 없습니다. (${seatFullText(o.id)})`;
    if (Object.keys(err).length) { s.err = err; refreshOverlay(); return; }
    if (reinvite) { // 초대 대기·만료 멤버: 역할을 조직 관리자로 바꿔 초대를 다시 보냄
      const beforeRole = ROLES[mem!.role]; const beforeSt = MEM_STATUS[mem!.status][0];
      mem!.role = 'ORG_ADMIN'; mem!.status = 'PENDING'; mem!.invitedBy = me().name; mem!.invitedAt = '2026-11-11 10:50'; mem!.expiresAt = '2026-11-12 10:50';
      if (ex!.status === 'EXPIRED' || ex!.status === 'INVITED') { ex!.status = 'INVITED'; ex!.expiresAt = mem!.expiresAt; }
      addAudit(o.id, 'MEMBER', '조직 관리자 초대', `${ex!.name}(${ex!.email})`, [['역할', beforeRole, '조직 관리자'], ['멤버 상태', beforeSt, '초대 대기'], ['이전 초대 링크', '유효', '무효화']]);
      closeOverlay(); render(); toast(`${ex!.name}님의 초대를 조직 관리자 초대로 바꿔 ${ex!.email}로 다시 보냈습니다. 이전 초대 링크는 무효가 됩니다.`);
      return;
    }
    // 이미 PROBA 계정이 있으면(다른 조직 소속 등) 그 계정으로 초대 — 한 계정이 여러 조직에 소속될 수 있음
    const a: Account = ex || { id: nextId(ST.accounts, 'U-'), name: s.name.trim(), email: s.email.trim(), status: 'INVITED', invitedAt: '2026-11-11 10:50', expiresAt: '2026-11-12 10:50' };
    if (!ex) ST.accounts.push(a);
    ST.memberships.push({ id: nextId(ST.memberships, 'MB-'), orgId: o.id, userId: a.id, role: 'ORG_ADMIN', status: 'PENDING', since: '2026-11-11', invitedBy: me().name, invitedAt: '2026-11-11 10:50', expiresAt: '2026-11-12 10:50' });
    addAudit(o.id, 'MEMBER', '조직 관리자 초대', `${a.name}(${a.email})`, [['역할', '-', '조직 관리자']]);
    closeOverlay(); render(); toast(`${a.email}로 조직 관리자 초대 메일을 보냈습니다.`);
  }
};
