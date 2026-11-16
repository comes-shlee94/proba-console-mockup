/* ---------- OA-10 멤버 관리 ---------- */
// (원본에는 이 부분 바로 앞에 별도 구분 주석이 없음 — 이름은 원본 '조직 관리 콘솔' 머리 주석의 OA-10 멤버 관리)
import type { Account, Membership, RoleKey } from '../../types';
import { ACCT_STATUS, MEM_STATUS, ORG_ROLES, PLANS, ROLES, ROLE_DESC } from '../../data';
import {
  ACT, CH, CUR_ORG, EMAIL_RE, IN, Input, NAME_RE, ST, Textarea,
  act, acct, activeAdmins, addAudit, allMembershipsOf, avatar, badge, ch, closeOverlay, confirmModal, enter, field, icon, inp,
  isPlatformMember, josa, leftOf, me, memBadge, memOf, membersOf, minsLeft, nextId, notice, openMenu, openOverlay, orgById, ovs,
  pageHead, pageSizeSel, pager, paginate, refreshOverlay, relTime, render, seatLimit, seatsLeft, seatsUsed, sel, toast, userCell,
  type MenuEntry, type Page, type SelOpt,
} from '../../core';
import { isLastAdmin, orgName } from './info';

export function pageMembers(): Page {
  const u = ST.ui.members;
  const o = orgById(CUR_ORG);
  const all = membersOf(CUR_ORG);
  const cnt = (s: string) => all.filter((m) => s === 'ALL' || m.status === s).length;
  const q = u.q.trim().toLowerCase();
  const list = all.filter((m) => { const a = acct(m.userId); return (u.status === 'ALL' || m.status === u.status) && (u.role === 'ALL' || m.role === u.role) && (!q || a.name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q)); });
  const used = seatsUsed(CUR_ORG!); const lim = seatLimit(o);
  const pend = all.filter((m) => m.status === 'PENDING');
  const soon = pend.filter((m) => minsLeft(m.expiresAt!) <= 360).length;
  const admins = activeAdmins(CUR_ORG!).map((m) => acct(m.userId).name);
  const tabs = ([['ALL', '전체'], ['ACTIVE', '활성'], ['PENDING', '초대 대기'], ['EXPIRED', '초대 만료'], ['INACTIVE', '비활성']] as [string, string][])
    .map(([k, l], i) => <button key={i} className={u.status === k ? 'on' : ''} onClick={act('mmStatus', { v: k })}>{l}<span className="n">{cnt(k)}</span></button>);
  const pg = paginate(list, u);
  const rows = pg.view.map((m, i) => {
    const a = acct(m.userId); const self = a.id === me().id;
    // (key: 상태가 바뀌어 다른 모양의 span이 같은 자리에 오면 새로 만듦 — 재사용하면 React가 빈 style=""을 남김. 원본 DOM 패치는 style 속성을 지움)
    // (문자열 보간은 원본처럼 텍스트 노드 하나로 — 나뉘면 글자 위치가 미세하게 달라짐)
    const st = m.status === 'PENDING' ? <span key="p" className={`dday ${minsLeft(m.expiresAt!) <= 360 ? 'red' : ''}`}>{leftOf(m.expiresAt!)}</span>
      : m.status === 'EXPIRED' ? <span key="e" className="faint" style={{ fontSize: '12px' }}>{`${m.expiresAt!.slice(5, 10)} 만료`}</span>
        : m.status === 'INACTIVE' ? <span key="i" className="faint" style={{ fontSize: '12px' }} data-tip={m.inactiveReason ? inactiveNote(m) : undefined}>{`${(m.inactiveAt || '').slice(5, 10)} · ${(m.inactiveBy || '').split('(')[0]}`}</span>
          : a.status !== 'ACTIVE' ? <span key="a" className="warn-ic" data-tip={`계정이 ${ACCT_STATUS[a.status][0]} 상태입니다 · 서비스 관리자 문의`}>{icon('lock', 'sm')}<span style={{ fontSize: '12px', marginLeft: '3px' }}>{`계정 ${ACCT_STATUS[a.status][0]}`}</span></span> : null;
    const since = m.status === 'PENDING' || m.status === 'EXPIRED' ? <div className="two"><span className="p num" style={{ fontWeight: '400' }}>{m.invitedAt!.slice(0, 10)}</span><span className="s">{`${m.invitedBy ?? ''} 초대`}</span></div> : <span className="num">{m.since}</span>;
    return (
      <tr key={i}><td>{userCell(a, self)}</td><td>{`${ROLES[m.role]}${m.role === 'ORG_ADMIN' ? ' ' : ''}`}{m.role === 'ORG_ADMIN' ? <span className="warn-ic" style={{ color: 'var(--admin)' }}>{icon('crown', 'sm')}</span> : null}</td>
        <td><div className="col" style={{ gap: '3px', alignItems: 'flex-start' }}>{memBadge(m)}{st}</div></td>
        <td className="num" data-tip={a.lastLoginAt ? a.lastLoginAt : undefined}>{m.status === 'PENDING' || m.status === 'EXPIRED' ? '-' : relTime(a.lastLoginAt)}</td><td>{since}</td>
        <td className="c">{self ? <span className="faint" data-tip={'본인 계정은 변경할 수 없습니다\n(다른 조직 관리자가 변경)'}>-</span> : <button className="icon-btn" data-act="mmMenu" data-id={m.id} aria-label={`${a.name} 관리`} onClick={act('mmMenu', { id: m.id })}>{icon('more')}</button>}</td></tr>
    );
  });
  const full = lim != null && used >= lim;
  const body = (
    <>
      {pageHead('users', '멤버 관리', '멤버 초대·역할 변경·접근 상태 관리')}
      <div className="grid g4 mb12">
        {lim == null ? <div className="stat"><span className="k">좌석 사용</span><span className="v">{used}<small>명</small></span><span className="s">{`${PLANS[o.plan].label} 플랜 · 인원 제한 없음`}</span><span className="s">활성 + 초대 대기 기준</span></div> : <div className="stat"><span className="k">좌석 사용</span><span className="v">{used}<small>{`/ ${lim}명`}</small></span><div className={`progress ${used / lim >= 0.8 ? 'warn' : ''}`}><i style={{ width: `${Math.min(100, used / lim * 100)}%` }}></i></div><span className="s">{`${PLANS[o.plan].label} 플랜 · 활성 + 초대 대기 기준`}</span></div>}
        <div className="stat"><span className="k">{icon('crown', 'sm')}조직 관리자</span><span className="v">{admins.length}<small>명</small></span><span className="s">{admins.join(', ')}</span></div>
        <div className="stat"><span className="k">{icon('mail', 'sm')}초대 대기</span><span className="v">{pend.length}<small>명</small></span><span className="s">{soon ? <span className="dday red">{`6시간 내 만료 ${soon}명`}</span> : '유효기간 1일'}</span></div>
        <div className="stat"><span className="k">{icon('pause', 'sm')}비활성 · 만료</span><span className="v">{cnt('INACTIVE') + cnt('EXPIRED')}<small>명</small></span><span className="s">{`비활성 ${cnt('INACTIVE')} · 초대 만료 ${cnt('EXPIRED')}`}</span></div></div>
      <div className="toolbar"><div className="seg">{tabs}</div></div>
      <div className="filterbar">{sel('r', [['ALL', '전체 역할'], ...ORG_ROLES.map((k): SelOpt => [k, ROLES[k]])], u.role, { onChange: ch('mmRole'), 'aria-label': '역할' })}<div className="vsep"></div>
        <div className="search">{icon('search')}<Input id="q-members" className="input" placeholder="이름 또는 이메일로 검색" value={u.q} onValue={inp('mmQ')} /></div>
        <button className="btn btn-primary" onClick={act('mmInvite')} disabled={full} data-tip={full ? '좌석이 모두 사용 중입니다 · [조직 정보]에서 플랜을 변경하거나 멤버를 정리하세요' : undefined}>{icon('plus')}멤버 초대</button></div>
      <div className="tbl-meta">전체 <b>{list.length}</b>명<span className="ml-auto faint">역할별 메뉴·작업 범위는 <button className="link" onClick={act('nav', { href: '/org/permissions' })}>권한 관리</button>에서 설정합니다</span>{pageSizeSel('members', pg.size)}</div>
      <div className="tbl-wrap"><table className="tbl"><colgroup><col style={{ width: '30%' }} /><col style={{ width: '15%' }} /><col style={{ width: '17%' }} /><col style={{ width: '12%' }} /><col style={{ width: '14%' }} /><col style={{ width: '56px' }} /></colgroup>
        <thead><tr><th>사용자</th><th>역할</th><th>상태</th><th>최근 로그인</th><th>가입·초대</th><th className="c">관리</th></tr></thead>
        <tbody>{rows.length ? rows : <tr className="empty"><td colSpan={6}>조건에 맞는 멤버가 없습니다.</td></tr>}</tbody></table></div>
      {pager(list.length, u.page, pg.size, 'members')}
      <div className="mt12">{notice(<>멤버를 <b>비활성화</b>하면 이 조직에만 접근할 수 없고 다른 조직 이용에는 영향이 없습니다. <b>조직에서 제외</b>해도 작성한 테스트·실행 이력은 보존됩니다.</>, '')}</div>
    </>
  );
  return { crumbs: ['멤버 관리'], body };
}
ACT.mmStatus = (d) => { ST.ui.members.status = d.v; ST.ui.members.page = 1; render(); };
CH.mmRole = (v) => { ST.ui.members.role = v; ST.ui.members.page = 1; render(); };
IN.mmQ = (v) => { ST.ui.members.q = v; ST.ui.members.page = 1; render(); };
// 멤버 비활성화 사유(v0.7) — 조직 관리자가 선택(필수) + 상세 내용(선택)
const MEM_DEACT_REASONS = ['장기 미사용(좌석 정리)', '휴직·장기 부재', '업무 변경·프로젝트 종료', '보안 이슈', '기타'];
const inactiveNote = (m: Membership) => [m.inactiveReason, m.inactiveDetail].filter(Boolean).join(' · ');
ACT.mmMenu = (d, el) => {
  const m = ST.memberships.find((x) => x.id === d.id)!; const a = acct(m.userId);
  const last = isLastAdmin(m);
  const lastHint = last ? '마지막 활성 조직 관리자는 변경할 수 없습니다' : '';
  const items: MenuEntry[] = [];
  if (m.status === 'PENDING' || m.status === 'EXPIRED') items.push({ label: '초대 재발송', icon: 'mail', run: () => mmResend(m) });
  if (m.status === 'INACTIVE') items.push({ label: '활성화', icon: 'play', run: () => mmActivate(m) });
  if (m.status !== 'EXPIRED') items.push({ label: '역할 변경', icon: 'swap', disabled: last, hint: lastHint, run: () => mmRole(m) });
  items.push('-');
  if (m.status === 'ACTIVE') items.push({ label: '비활성화', icon: 'pause', disabled: last, hint: lastHint, run: () => mmDeactivate(m) });
  if (m.status === 'PENDING' || m.status === 'EXPIRED') items.push({ label: '초대 취소', icon: 'x', danger: true, run: () => mmCancel(m) });
  else items.push({ label: '조직에서 제외', icon: 'trash', danger: true, disabled: last, hint: lastHint, run: () => mmRemove(m) });
  openMenu(el!, items);
};
function mmResend(m: Membership) {
  const a = acct(m.userId); const before = m.expiresAt; const o = orgById(CUR_ORG);
  if (m.status === 'EXPIRED' && seatsLeft(CUR_ORG!) <= 0) { toast(`좌석이 부족합니다. (${PLANS[o.plan].label} 플랜 한도 ${seatLimit(o)}명 · [조직 정보]에서 플랜 변경 가능)`, 'warning'); return; }
  m.status = 'PENDING'; m.invitedAt = '2026-11-11 10:57'; m.expiresAt = '2026-11-12 10:57'; m.invitedBy = me().name;
  if (a.status === 'EXPIRED' || a.status === 'INVITED') { a.status = 'INVITED'; a.expiresAt = m.expiresAt; }
  addAudit(CUR_ORG, 'MEMBER', '초대 재발송', `${a.name}(${a.email})`, [['초대 만료', before!, m.expiresAt], ['이전 초대 링크', '유효', '무효화']]);
  render(); toast(`${a.email}로 초대 메일을 다시 보냈습니다. 이전 초대 링크는 무효가 되며 새 링크는 1일간 유효합니다.`);
}
function mmActivate(m: Membership) {
  const a = acct(m.userId); const o = orgById(CUR_ORG);
  if (seatLimit(o) != null && seatsUsed(CUR_ORG!) >= seatLimit(o)!) { toast(`좌석이 부족합니다. (${PLANS[o.plan].label} 플랜 한도 ${seatLimit(o)}명 · [조직 정보]에서 플랜 변경 가능)`, 'warning'); return; }
  confirmModal({ title: `${a.name}님을 다시 활성화할까요?`, icon: 'play', body: <><p>{`${o.name}에 다시 접근할 수 있고 좌석 1개를 사용합니다. 역할은 기존 역할(${ROLES[m.role]})이 유지됩니다.`}</p>{m.inactiveAt ? <div className="kv"><span className="k">비활성화</span><span className="v">{`${m.inactiveAt} · ${m.inactiveBy || '-'}${m.inactiveReason ? ` · ${m.inactiveReason}` : ''}`}{m.inactiveDetail ? <><br /><span className="muted">{m.inactiveDetail}</span></> : null}</span></div> : null}</>, confirmLabel: '활성화', onConfirm: () => { m.status = 'ACTIVE'; (['inactiveAt', 'inactiveBy', 'inactiveReason', 'inactiveDetail'] as const).forEach((k) => delete m[k]); addAudit(CUR_ORG, 'MEMBER', '멤버 활성화', `${a.name}(${a.email})`, [['멤버 상태', '비활성', '활성']]); render(); toast(`${a.name}님을 활성화했습니다.`); } });
}
interface MdState { reason: string; detail: string }
export function mmDeactivate(m: Membership) {
  const a = acct(m.userId);
  openOverlay<MdState>({
    width: 560,
    state: { reason: '', detail: '' },
    view: (s: MdState) => ({
      title: `${a.name}님의 ${orgName()} 접근을 차단할까요?`, icon: 'pause', iconType: 'danger',
      body: (
        <>
          <p>{`${a.name}(${a.email})님은 ${orgName()}에 더 이상 접근할 수 없으며 진행 중인 세션은 즉시 종료됩니다.`}</p>
          {field('비활성화 사유', sel('r', [['', '사유를 선택해주세요'], ...MEM_DEACT_REASONS.map((r): SelOpt => [r, r])], s.reason, { id: 'f-md-r', onChange: ch('mdReason') }), { req: 1 })}
          {field('상세 내용', <Textarea id="f-md-d" className="textarea" maxLength={500} placeholder="활동 로그에 사유와 함께 기록됩니다." value={s.detail} onValue={inp('mdDetail')} />, {})}
          {notice('다른 조직 이용에는 영향이 없고, 언제든 다시 활성화할 수 있습니다. 비활성 멤버는 좌석을 차지하지 않습니다.', '')}
        </>
      ),
      foot: <><button className="btn btn-secondary" onClick={act('closeOv')}>취소</button><button className="btn btn-danger" onClick={act('mdSubmit', { id: m.id })} disabled={!s.reason}>비활성화</button></>,
    }),
  });
}
CH.mdReason = (v) => { ovs<MdState>().reason = v; refreshOverlay(); };
IN.mdDetail = (v) => { ovs<MdState>().detail = v; };
ACT.mdSubmit = (d) => {
  const m = ST.memberships.find((x) => x.id === d.id)!; const a = acct(m.userId); const s = ovs<MdState>(); const detail = s.detail.trim();
  Object.assign(m, { status: 'INACTIVE', inactiveAt: '2026-11-11 10:58', inactiveBy: me().name, inactiveReason: s.reason, inactiveDetail: detail });
  addAudit(CUR_ORG, 'MEMBER', '멤버 비활성화', `${a.name}(${a.email})`, [['멤버 상태', '활성', '비활성']], { reason: s.reason + (detail ? ' · ' + detail : '') });
  closeOverlay(); render(); toast(`${a.name}님의 접근을 차단했습니다.`, 'warning');
};
interface MrState { reason: string }
export function mmRemove(m: Membership) {
  const a = acct(m.userId);
  openOverlay<MrState>({
    width: 560,
    state: { reason: '' },
    view: (s: MrState) => ({
      title: `${a.name}님을 ${orgName()}에서 제외할까요?`, icon: 'trash', iconType: 'danger',
      body: (
        <>
          <p>작성한 테스트·실행 이력은 <b>{`'${a.name}(제외됨)'`}</b>으로 보존됩니다. 다시 참여하려면 새로 초대해야 합니다.</p>
          {field('제외 사유', <Textarea id="f-mr-r" className="textarea" maxLength={500} placeholder="예: 퇴사, 계약 종료, 담당 프로젝트 종료" value={s.reason} onValue={inp('mrReason')} />, { help: '선택 · 활동 로그에 기록됩니다' })}
        </>
      ),
      foot: <><button className="btn btn-secondary" onClick={act('closeOv')}>취소</button><button className="btn btn-danger" onClick={act('mrSubmit', { id: m.id })}>제외</button></>,
    }),
  });
}
IN.mrReason = (v) => { ovs<MrState>().reason = v; };
ACT.mrSubmit = (d) => {
  const m = ST.memberships.find((x) => x.id === d.id)!; const a = acct(m.userId); const reason = ovs<MrState>().reason.trim();
  ST.memberships = ST.memberships.filter((x) => x.id !== m.id);
  addAudit(CUR_ORG, 'MEMBER', '조직에서 제외', `${a.name}(${a.email})`, [['멤버 상태', MEM_STATUS[m.status][0], '제외']], reason ? { reason } : {});
  closeOverlay(); render(); toast(`${a.name}님을 조직에서 제외했습니다.`, 'warning');
};
function mmCancel(m: Membership) {
  const a = acct(m.userId);
  confirmModal({ title: `${a.email} 초대를 취소할까요?`, danger: true, icon: 'x', body: <p>초대 링크가 즉시 무효화되고 목록에서 삭제됩니다.</p>, confirmLabel: '초대 취소', onConfirm: () => { ST.memberships = ST.memberships.filter((x) => x.id !== m.id); if (a.status === 'INVITED' || a.status === 'EXPIRED') { if (!allMembershipsOf(a.id).length) ST.accounts = ST.accounts.filter((x) => x.id !== a.id); } addAudit(CUR_ORG, 'MEMBER', '초대 취소', a.email); render(); toast('초대를 취소했습니다.', 'warning'); } });
}
interface RcState { role: RoleKey }
export function mmRole(m: Membership) {
  const a = acct(m.userId);
  openOverlay<RcState>({
    width: 560,
    state: { role: m.role },
    view: (s: RcState) => ({
      title: '역할 변경', icon: 'swap',
      body: (
        <>
          <div className="row" style={{ padding: '10px 12px', background: 'var(--canvas)', borderRadius: '10px' }}>{userCell(a)}<span className="ml-auto">{memBadge(m)}</span></div>
          <div className="radio-cards">{ORG_ROLES.map((k): [RoleKey, string] => [k, ROLES[k]]).map(([k, l], i) => <button key={i} className={`radio-card ${s.role === k ? 'on' : ''}`} onClick={act('rcRole', { v: k })}><span className="t">{l}{k === m.role ? <span className="badge b-outline">현재</span> : null}</span><span className="d">{ROLE_DESC[k]}</span></button>)}</div>
          {m.role === 'ORG_ADMIN' && s.role !== 'ORG_ADMIN' ? notice('조직 관리자 권한(멤버 초대·역할 변경·권한 설정)을 잃습니다.', 'warn', 'alert') : null}
          {notice(`변경 즉시 적용되며, 대상자의 화면은 다음 이동 시 새 권한으로 갱신됩니다.${m.status === 'PENDING' ? ' 초대 대기 중인 멤버는 수락 시 변경된 역할로 합류합니다.' : ''}`, '')}
        </>
      ),
      foot: <><button className="btn btn-secondary" onClick={act('closeOv')}>취소</button><button className="btn btn-primary" onClick={act('rcSave', { id: m.id })} disabled={s.role === m.role}>변경</button></>,
    }),
  });
}
ACT.rcRole = (d) => { ovs<RcState>().role = d.v as RoleKey; refreshOverlay(); };
ACT.rcSave = (d) => {
  const m = ST.memberships.find((x) => x.id === d.id)!; const a = acct(m.userId); const s = ovs<RcState>(); const before = ROLES[m.role];
  if (m.role === 'ORG_ADMIN' && s.role !== 'ORG_ADMIN' && isLastAdmin(m)) { toast('마지막 활성 조직 관리자의 역할은 변경할 수 없습니다.', 'error'); return; }
  m.role = s.role;
  addAudit(CUR_ORG, 'MEMBER', '역할 변경', `${a.name}(${a.email})`, [['역할', before, ROLES[s.role]]]);
  closeOverlay(); render(); toast(`${a.name}님의 역할을 ${josa(ROLES[s.role], '으로/로')} 변경했습니다.`);
};

/* ---------- OA-11 멤버 초대 ---------- */
interface IvItem { name: string; email: string; existing?: boolean }
interface IvState { name: string; email: string; list: IvItem[]; role: RoleKey; err: { name?: string; email?: string } }
ACT.mmInvite = () => openOverlay<IvState>({
  width: 640,
  state: { name: '', email: '', list: [], role: 'QA_ENGINEER', err: {} },
  view: (s: IvState) => {
    const o = orgById(CUR_ORG); const lim = seatLimit(o); const left = lim == null ? Infinity : lim - seatsUsed(CUR_ORG!) - s.list.length;
    return {
      title: '멤버 초대', icon: 'mail',
      body: (
        <>
          <div className="row" style={{ fontSize: '12px', color: 'var(--subtle)' }}>{icon('users', 'sm')}{lim == null ? <>{`좌석 ${seatsUsed(CUR_ORG!) + s.list.length}명 사용 · `}<b style={{ color: 'var(--ink)' }}>{`${PLANS[o.plan].label} 플랜은 인원 제한이 없습니다`}</b></> : <>{`좌석 ${seatsUsed(CUR_ORG!) + s.list.length} / ${lim}명 · `}<b style={{ color: left <= 0 ? 'var(--red-line)' : 'var(--ink)' }}>{`추가 초대 가능 ${Math.max(0, left)}명`}</b></>}</div>
          <div className="row" style={{ alignItems: 'flex-start' }}>
            {field('멤버 이름', <Input id="f-iv-n" className="input" maxLength={30} placeholder="이름" value={s.name} onValue={inp('ivName')} onEnter={enter('ivAdd')} autoFocus />, { req: 1, err: s.err.name, cls: 'grow' })}
            {field('사내 이메일', <Input id="f-iv-e" className="input" maxLength={254} placeholder="name@company.com" value={s.email} onValue={inp('ivEmail')} onEnter={enter('ivAdd')} />, { req: 1, err: s.err.email, cls: 'grow' })}
            <div className="field"><span className="lbl">{' '}</span><button className="btn btn-accent" style={{ height: '40px', borderRadius: '10px' }} onClick={act('ivAdd')} disabled={left <= 0}>{icon('plus', 'sm')}추가</button></div></div>
          {s.list.length ? <div><div className="row mb8" style={{ fontSize: '13px' }}><b>{`추가 멤버 ${s.list.length}명`}</b><span className="faint" style={{ fontSize: '12px' }}>· 인원 제한 없이 한 번에 초대할 수 있습니다</span></div><div className="chg-list">{s.list.map((x, i) => <div key={i}>{avatar({ id: 'X' + i, name: x.name } as Account, 'sm')}<b>{x.name}</b><span className="faint">{x.email}</span>{x.existing ? badge('기존 계정', 'b-outline') : null}<button className="icon-btn ml-auto" onClick={act('ivRm', { i: String(i) })} aria-label={`${x.email} 제거`}>{icon('x', 'sm')}</button></div>)}</div></div> : null}
          {field('역할', sel('r', ORG_ROLES.map((k): SelOpt => [k, ROLES[k]]), s.role, { onChange: ch('ivRole') }), { help: ROLE_DESC[s.role] })}
          {notice(<>초대하면 <b>초대 메일이 자동으로 발송</b>됩니다(유효기간 <b>1일</b>). 기간 안에 수락하지 않으면 초대 만료가 되며 [초대 재발송]으로 다시 보낼 수 있습니다(재발송 시 이전 링크는 즉시 무효). 이미 PROBA 계정이 있는 사용자는 수락 시 기존 계정으로 합류합니다. 같은 역할로 묶어 보내며, 역할이 다르면 나누어 초대하세요.</>, 'info')}
        </>
      ),
      foot: <><button className="btn btn-secondary" onClick={act('closeOv')}>취소</button><button className="btn btn-primary" onClick={act('ivSubmit')} disabled={!s.list.length}>{`초대 보내기${s.list.length ? ` (${s.list.length}명)` : ''}`}</button></>,
    };
  },
});
IN.ivName = (v) => { ovs<IvState>().name = v; if (ovs<IvState>().err.name) { ovs<IvState>().err.name = ''; refreshOverlay(); } };
IN.ivEmail = (v) => { ovs<IvState>().email = v; if (ovs<IvState>().err.email) { ovs<IvState>().err.email = ''; refreshOverlay(); } };
CH.ivRole = (v) => { ovs<IvState>().role = v as RoleKey; refreshOverlay(); };
ACT.ivRm = (d) => { ovs<IvState>().list.splice(Number(d.i), 1); refreshOverlay(); };
ACT.ivAdd = () => {
  const s = ovs<IvState>(); const name = s.name.trim(); const email = s.email.trim(); const err: IvState['err'] = {};
  if (!name) err.name = '멤버 이름을 입력해주세요.'; else if (!NAME_RE.test(name)) err.name = '이름은 한글, 영문, 숫자만 입력할 수 있습니다.';
  if (!email) err.email = '사내 이메일을 입력해주세요.';
  else if (!EMAIL_RE.test(email)) err.email = '이메일 형식에 맞게 입력해주세요.';
  else if (s.list.some((x) => x.email.toLowerCase() === email.toLowerCase())) err.email = '이미 추가한 이메일입니다.';
  else {
    const ex = ST.accounts.find((a) => a.email.toLowerCase() === email.toLowerCase());
    const mm = ex && memOf(CUR_ORG, ex.id);
    if (mm && (mm.status === 'ACTIVE' || mm.status === 'INACTIVE')) err.email = '이미 조직 멤버입니다.';
    else if (mm && (mm.status === 'PENDING' || mm.status === 'EXPIRED')) err.email = '이미 초대한 이메일입니다. 목록에서 초대 재발송을 이용하세요.';
    else if (ex && ex.status === 'DISABLED') err.email = '초대할 수 없는 계정입니다. 서비스 관리자에게 문의하세요.';
    else if (isPlatformMember(ex)) err.email = '서비스 관리자(플랫폼 멤버) 계정은 조직에 초대할 수 없습니다.';
  }
  const lim = seatLimit(orgById(CUR_ORG));
  if (!err.name && !err.email && lim != null && seatsUsed(CUR_ORG!) + s.list.length >= lim) err.email = `좌석이 부족합니다. (${PLANS[orgById(CUR_ORG).plan].label} 플랜 한도 ${lim}명 · [조직 정보]에서 플랜 변경 가능)`;
  if (Object.keys(err).length) { s.err = err; refreshOverlay(); return; }
  s.list.push({ name, email, existing: ST.accounts.some((a) => a.email.toLowerCase() === email.toLowerCase()) }); s.name = ''; s.email = ''; s.err = {};
  refreshOverlay(); setTimeout(() => { const el = document.getElementById('f-iv-n'); el && el.focus(); }, 0);
};
ACT.ivSubmit = () => {
  const s = ovs<IvState>();
  s.list.forEach((x) => {
    let a = ST.accounts.find((y) => y.email.toLowerCase() === x.email.toLowerCase());
    if (!a) { a = { id: nextId(ST.accounts, 'U-'), name: x.name, email: x.email, status: 'INVITED', invitedAt: '2026-11-11 10:59', expiresAt: '2026-11-12 10:59' }; ST.accounts.push(a); }
    ST.memberships.push({ id: nextId(ST.memberships, 'MB-'), orgId: CUR_ORG!, userId: a.id, role: s.role, status: 'PENDING', since: '2026-11-11', invitedBy: me().name, invitedAt: '2026-11-11 10:59', expiresAt: '2026-11-12 10:59' });
    addAudit(CUR_ORG, 'MEMBER', '멤버 초대', `${x.name}(${x.email})`, [['역할', '-', ROLES[s.role]], ['초대 만료', '-', '2026-11-12 10:59']]);
  });
  closeOverlay(); render(); toast(`${s.list.length}명에게 초대 메일을 보냈습니다.`);
};
