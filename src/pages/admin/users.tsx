/* ==========================================================
   서비스 관리자 콘솔 · 사용자 관리 (SA-20 ~ SA-23)
   ========================================================== */
import type { ReactNode } from 'react';
import type { Account, Change, MemStatus, Membership } from '../../types';
import { ACCT_STATUS, MEM_STATUS, ORG_STATUS, PLATFORM, ROLES } from '../../data';
import {
  ACT, CH, IN, ST, Input, Textarea, act, ch, inp,
  acct, acctBadge, activeAdmins, activeSAs, addAccountAudit, addAudit, allMembershipsOf, avatar,
  closeOverlay, confirmModal, field, icon, isPlatformMember, leftOf, me, membershipsOfUser, minsLeft, nextId, notice,
  openMenu, openOverlay, orgById, ovs, pageHead, pageSizeSel, pager, paginate, platMemOf, refreshOverlay, relTime,
  render, renderOverlays, seatsLeft, sel, toast,
  type MenuEntry, type Page, type SelOpt,
} from '../../core';
import { openUserDrawer } from './userDrawer';

// 원본은 플랫폼 멤버십에 지정한 사람을 addedBy로 남김 (addPlatformMembership(a, 'ACTIVE', { addedBy: me().name }))
declare module '../../types' {
  interface Membership { addedBy?: string }
}

// 소속 · 역할: 플랫폼 멤버십이면 "플랫폼 · 서비스 관리자" 1개(멤버 상태 표시), 그 밖에는 소속 조직마다 "조직 · 역할"
function userOrgChips(a: Account): ReactNode {
  const pm = platMemOf(a.id);
  if (pm) {
    const st = pm.status !== 'ACTIVE' ? ` · ${MEM_STATUS[pm.status][0]}` : '';
    const cls = pm.status === 'INACTIVE' ? 'off' : pm.status === 'ACTIVE' ? '' : 'pend';
    return <div className="org-chips"><span className={`org-chip sa ${cls}`} data-tip={`플랫폼 멤버십 · ${ROLES.SERVICE_ADMIN}${st} · 어느 조직에도 속하지 않음`}>{icon('shield', 'sm')}{`플랫폼 · ${ROLES.SERVICE_ADMIN}${st}`}</span></div>;
  }
  const ms = membershipsOfUser(a.id);
  const chips = ms.slice(0, 2).map((m, i) => {
    const o = orgById(m.orgId);
    const off = m.status === 'INACTIVE' || o.status !== 'ACTIVE';
    const pend = m.status === 'PENDING' || m.status === 'EXPIRED';
    const st = m.status !== 'ACTIVE' ? ` · ${MEM_STATUS[m.status][0]}` : o.status !== 'ACTIVE' ? ` · 조직 ${ORG_STATUS[o.status][0]}` : '';
    return <span key={i} className={`org-chip ${off ? 'off' : pend ? 'pend' : ''}`} data-tip={`${o.name} · ${ROLES[m.role]}${st}`}>{`${o.name} · ${ROLES[m.role]}${st}`}</span>;
  });
  const more = ms.length > 2 ? <span className="org-chip">{`+${ms.length - 2}`}</span> : null;
  return ms.length ? <div className="org-chips">{chips}{more}</div> : <span className="faint">소속 조직 없음</span>;
}
function acctStatusCell(a: Account): ReactNode {
  if (a.status === 'LOCKED') return <div className="two">{acctBadge(a)}<span className="s">{a.unlockAt ? a.unlockAt.slice(11) + ' 자동 해제' : a.lockReason}</span></div>;
  if (a.status === 'INVITED') return <div className="two">{acctBadge(a)}<span className={`s dday ${minsLeft(a.expiresAt!) <= 360 ? 'red' : ''}`}>{leftOf(a.expiresAt!)}</span></div>;
  if (a.status === 'EXPIRED') return <div className="two">{acctBadge(a)}<span className="s">{`${a.expiresAt!.slice(0, 10)} 만료`}</span></div>;
  if (a.status === 'DISABLED') return <div className="two">{acctBadge(a)}<span className="s" data-tip={a.disableDetail ? `${a.disableReason ?? ''} · ${a.disableDetail}` : undefined}>{a.disableReason || ''}</span></div>;
  return acctBadge(a);
}
export function pageUsers(): Page {
  const u = ST.ui.users;
  const all = ST.accounts;
  const cnt = (s: string) => all.filter((a) => s === 'ALL' || a.status === s).length;
  const q = u.q.trim().toLowerCase();
  const list = all.filter((a) => {
    if (u.status !== 'ALL' && a.status !== u.status) return false;
    const ms = membershipsOfUser(a.id); const pm = isPlatformMember(a);
    if (u.org === 'PLATFORM' && !pm) return false;
    if (u.org === 'NONE' && (pm || ms.length)) return false;
    if (u.org !== 'ALL' && u.org !== 'NONE' && u.org !== 'PLATFORM' && !ms.some((m) => m.orgId === u.org)) return false;
    if (u.role === 'SERVICE_ADMIN' && !pm) return false;
    if (u.role !== 'ALL' && u.role !== 'SERVICE_ADMIN' && !ms.some((m) => m.role === u.role)) return false;
    if (q && !a.name.toLowerCase().includes(q) && !a.email.toLowerCase().includes(q)) return false;
    return true;
  });
  const { size, view } = paginate(list, u);
  const tabs = [['ALL', '전체'], ['ACTIVE', '활성'], ['INVITED', '초대 대기'], ['EXPIRED', '초대 만료'], ['LOCKED', '잠김'], ['DISABLED', '비활성']]
    .map(([k, l], i) => <button key={i} className={u.status === k ? 'on' : ''} onClick={act('usStatus', { v: k })}>{l}<span className="n">{cnt(k)}</span></button>);
  const rows = view.map((a, i) => {
    const self = a.id === me().id;
    return (
      <tr key={i} className="click" onClick={act('openUser', { id: a.id })}>
        <td><div className="row" style={{ gap: '10px', minWidth: '0' }}>{avatar(a, 'sm')}<div className="two"><span className="p">{a.name}{self ? <span className="self-tag">(본인)</span> : null}</span><span className="s">{a.email}</span></div></div></td>
        <td>{userOrgChips(a)}</td><td>{acctStatusCell(a)}</td>
        <td className="num" data-tip={a.lastLoginAt ? `${a.lastLoginAt}\nIP ${a.lastLoginIp}` : undefined}>{a.lastLoginAt ? relTime(a.lastLoginAt) : '-'}</td>
        <td className="num">{a.joinedAt || <span className="faint">미가입</span>}</td>
        <td className="c"><button className="icon-btn" data-act="usrRowMenu" data-id={a.id} onClick={act('usrRowMenu', { id: a.id })} aria-label={`${a.name} 관리`}>{icon('more')}</button></td></tr>
    );
  });
  const orgOpts: SelOpt[] = [['ALL', '전체 소속'], ['PLATFORM', '플랫폼(서비스 관리자)'], ['NONE', '소속 없음'], ...ST.orgs.map((o): SelOpt => [o.id, o.name])];
  const body = (
    <>
      {pageHead('users', '사용자 관리', '전체 계정의 상태(활성·잠김·비활성)와 소속 조직·서비스 관리자 권한 관리')}
      <div className="toolbar"><div className="seg">{tabs}</div></div>
      <div className="filterbar">{sel('org', orgOpts, u.org, { onChange: ch('usOrg'), 'aria-label': '소속' })}{sel('role', [['ALL', '전체 역할'], ['SERVICE_ADMIN', '서비스 관리자'], ['ORG_ADMIN', '조직 관리자'], ['QA_ENGINEER', 'QA 엔지니어'], ['VIEWER', 'Viewer']], u.role, { onChange: ch('usRole'), 'aria-label': '역할' })}
        <div className="vsep"></div><div className="search">{icon('search')}<Input id="q-users" className="input" placeholder="이름 또는 이메일로 검색" value={u.q} onValue={inp('usQ')} /></div>
        <button className="btn btn-primary" onClick={act('saAdd')}>{icon('plus')}서비스 관리자 추가</button></div>
      {/* 원본은 '명'과 ' · '가 한 텍스트 노드("명 · ") — 같은 텍스트 노드로 출력 */}
      <div className="tbl-meta">전체 <b>{list.length}</b>{u.status !== 'ALL' || u.org !== 'ALL' || u.role !== 'ALL' || u.q ? <>{'명 · '}<button className="link" onClick={act('usReset')}>필터 초기화</button></> : '명'}<span className="ml-auto faint">한 계정이 여러 조직에 소속될 수 있고 조직마다 역할이 다를 수 있음 · 계정 상태는 모든 조직에 공통 적용</span>{pageSizeSel('users', size)}</div>
      <div className="tbl-wrap"><table className="tbl"><colgroup><col style={{ width: '27%' }} /><col style={{ width: '30%' }} /><col style={{ width: '16%' }} /><col style={{ width: '10%' }} /><col style={{ width: '10%' }} /><col style={{ width: '56px' }} /></colgroup>
        <thead><tr><th>사용자</th><th>소속 · 역할</th><th>계정 상태</th><th>최근 로그인</th><th>가입일</th><th className="c">관리</th></tr></thead>
        <tbody>{rows.length ? rows : <tr className="empty"><td colSpan={6}>검색 결과가 없습니다.</td></tr>}</tbody></table></div>
      {pager(list.length, u.page, size, 'users')}
    </>
  );
  return { crumbs: ['사용자 관리'], body };
}
ACT.usStatus = (d) => { ST.ui.users.status = d.v; ST.ui.users.page = 1; render(); };
CH.usOrg = (v) => { ST.ui.users.org = v; ST.ui.users.page = 1; render(); };
CH.usRole = (v) => { ST.ui.users.role = v; ST.ui.users.page = 1; render(); };
IN.usQ = (v) => { ST.ui.users.q = v; ST.ui.users.page = 1; render(); };
ACT.usReset = () => { Object.assign(ST.ui.users, { status: 'ALL', org: 'ALL', role: 'ALL', q: '', page: 1 }); render(); };
ACT.openUser = (d) => openUserDrawer(d.id);
ACT.usrRowMenu = (d, el) => openMenu(el!, userMenuItems(acct(d.id)));

export function userMenuItems(a: Account): MenuEntry[] {
  const self = a.id === me().id;
  const items: MenuEntry[] = [{ label: '상세 보기', icon: 'user', run: () => openUserDrawer(a.id) }];
  if (self) { items.push({ label: '계정 상태 변경', icon: 'lock', disabled: true, hint: '본인 계정은 변경할 수 없습니다' }); return items; }
  if (a.status === 'LOCKED') items.push({ label: '잠금 해제', icon: 'unlock', run: () => openUnlock(a) });
  if (a.status === 'INVITED' || a.status === 'EXPIRED') items.push({ label: '초대 재발송', icon: 'mail', run: () => resendAccountInvite(a) });
  // 서비스 관리자 = 플랫폼 멤버십: 가입한 계정(활성·잠김)이면 이메일 도메인과 관계없이 지정 · 초대 중인 계정은 초대 취소 후 다시 추가
  const pm = platMemOf(a.id);
  if (pm && (pm.status === 'ACTIVE' || pm.status === 'INACTIVE')) {
    items.push('-');
    items.push(pm.status === 'ACTIVE' ? { label: '서비스 관리자 권한 비활성화', icon: 'pause', run: () => openSaDeactivate(a) } : { label: '서비스 관리자 권한 활성화', icon: 'play', run: () => openSaActivate(a) });
    items.push({ label: '서비스 관리자 해제', icon: 'shield', run: () => openSaRevoke(a) });
  } else if (!pm && (a.status === 'ACTIVE' || a.status === 'LOCKED')) {
    items.push('-', { label: '서비스 관리자로 지정', icon: 'shield', run: () => openSaGrant(a) });
  }
  items.push('-');
  if (a.status === 'ACTIVE' || a.status === 'LOCKED') items.push({ label: '계정 비활성화', icon: 'pause', danger: true, run: () => openDisable(a) });
  if (a.status === 'DISABLED') items.push({ label: '계정 활성화', icon: 'play', run: () => openEnable(a) });
  if (a.status === 'INVITED' || a.status === 'EXPIRED') items.push({ label: '초대 취소', icon: 'x', danger: true, run: () => openCancelAccountInvite(a) });
  return items;
}
export function lastAdminOrgs(a: Account): string[] {
  return membershipsOfUser(a.id).filter((m) => m.role === 'ORG_ADMIN' && m.status === 'ACTIVE' && activeAdmins(m.orgId).length === 1 && activeAdmins(m.orgId)[0].userId === a.id).map((m) => orgById(m.orgId).name);
}
export function openUnlock(a: Account) {
  openOverlay({
    view: () => ({
      title: `${a.name} 계정의 잠금을 해제할까요?`, icon: 'unlock',
      body: (
        <>
          <div className="kv"><span className="k">잠긴 시각</span><span className="v">{String(a.lockedAt)}</span><span className="k">사유</span><span className="v">{a.lockReason}</span>{a.unlockAt ? <><span className="k">자동 해제 예정</span><span className="v">{`${a.unlockAt} (잠긴 후 30분)`}</span></> : null}</div>
          <p>로그인 실패 횟수가 초기화되고 즉시 로그인할 수 있습니다. 비밀번호를 잊은 경우 사용자가 로그인 화면의 [비밀번호 찾기]로 직접 재설정합니다.</p>
        </>
      ),
      foot: <><button className="btn btn-secondary" onClick={act('closeOv')}>취소</button><button className="btn btn-primary" onClick={act('ulSubmit', { id: a.id })}>잠금 해제</button></>,
    }),
  });
}
ACT.ulSubmit = (d) => {
  const a = acct(d.id);
  a.status = 'ACTIVE'; a.failCount = 0; (a as { unlockAt?: string | null }).unlockAt = null;
  addAccountAudit(membershipsOfUser(a.id).map((m) => m.orgId), 'AUTH', '잠금 해제', `${a.name}(${a.email})`, [['계정 상태', '잠김', '활성'], ['로그인 실패 횟수', '5', '0']]);
  closeOverlay(); closeOverlay(); render();
  toast(`${a.name} 계정의 잠금을 해제했습니다.`);
};
function resendAccountInvite(a: Account) {
  // 초대 만료 → 대기는 좌석을 다시 쓰므로, 좌석이 꽉 찬 조직이 하나라도 있으면 재발송하지 않음(BR-MEM-04)
  const full = membershipsOfUser(a.id).filter((m) => m.status === 'EXPIRED' && seatsLeft(m.orgId) <= 0).map((m) => orgById(m.orgId).name);
  if (full.length) { toast(`${full.join(', ')}의 좌석이 부족해 초대를 재발송할 수 없습니다. (활성 + 초대 대기 기준)`, 'warning'); return; }
  const before = a.expiresAt;
  a.status = 'INVITED'; a.invitedAt = '2026-11-11 10:52'; a.expiresAt = '2026-11-12 10:52';
  const resent: string[] = [];
  allMembershipsOf(a.id).forEach((m) => { if (m.status === 'EXPIRED' || m.status === 'PENDING') { m.status = 'PENDING'; m.invitedAt = a.invitedAt; m.expiresAt = a.expiresAt; if (m.orgId !== PLATFORM) resent.push(m.orgId); } });
  addAccountAudit(resent, 'MEMBER', '초대 재발송', `${a.name}(${a.email})`, [['초대 만료', before as string, a.expiresAt], ['이전 초대 링크', '유효', '무효화']]);
  closeOverlay(); render(); toast(`${a.email}로 초대 메일을 다시 보냈습니다. 이전 초대 링크는 무효가 되며 새 링크는 1일간 유효합니다.`);
}
function openCancelAccountInvite(a: Account) {
  confirmModal({ title: `${a.email} 초대를 취소할까요?`, danger: true, icon: 'x', body: <p>초대 링크가 즉시 무효화되고 목록에서 삭제됩니다. 다시 초대하려면 처음부터 초대해야 합니다.</p>, confirmLabel: '초대 취소', onConfirm: () => { const orgIds = membershipsOfUser(a.id).map((m) => m.orgId); ST.accounts = ST.accounts.filter((x) => x.id !== a.id); ST.memberships = ST.memberships.filter((m) => m.userId !== a.id); addAccountAudit(orgIds, 'MEMBER', '초대 취소', a.email); closeOverlay(); render(); toast('초대를 취소했습니다.', 'warning'); } });
}
interface DisableState { reason: string; detail: string }
export function openDisable(a: Account) {
  const ms = membershipsOfUser(a.id); const last = lastAdminOrgs(a);
  openOverlay<DisableState>({
    width: 560,
    state: { reason: '', detail: '' },
    view: (s: DisableState) => ({
      title: `${a.name} 계정을 비활성화할까요?`, icon: 'pause', iconType: 'danger',
      body: (
        <>
          <p>{`${isPlatformMember(a) ? '관리자 콘솔을 포함해 로그인이' : `모든 조직(${ms.length}개)에서 로그인이`} 즉시 차단되고 진행 중인 세션이 종료됩니다. 계정과 작성 이력은 보존되며 언제든 다시 활성화할 수 있습니다.`}</p>
          {last.length ? notice(<>이 사용자는 <b>{last.join(', ')}</b>의 유일한 활성 조직 관리자입니다. 비활성화하면 해당 조직에서 멤버·권한 관리를 할 수 없게 됩니다. 가능하면 먼저 다른 조직 관리자를 지정하세요.</>, 'warn', 'alert') : null}
          {field('비활성화 사유', sel('r', [['', '사유를 선택해주세요'], ['퇴사·계약 종료', '퇴사·계약 종료'], ['보안 이슈', '보안 이슈(계정 도용·공유 의심 등)'], ['장기 미사용', '장기 미사용'], ['기타', '기타']], s.reason, { id: 'f-dis-r', onChange: ch('disReason') }), { req: 1 })}
          {field('상세 내용', <Textarea id="f-dis-d" className="textarea" maxLength={500} placeholder="사용자 안내 메일과 감사 로그에 함께 기록됩니다." value={s.detail} onValue={inp('disDetail')} />, {})}
        </>
      ),
      foot: <><button className="btn btn-secondary" onClick={act('closeOv')}>취소</button><button className="btn btn-danger" onClick={act('disSubmit', { id: a.id })} disabled={!s.reason}>비활성화</button></>,
    }),
  });
}
CH.disReason = (v) => { ovs<DisableState>().reason = v; refreshOverlay(); };
IN.disDetail = (v) => { ovs<DisableState>().detail = v; };
ACT.disSubmit = (d) => {
  const a = acct(d.id); const s = ovs<DisableState>(); const before = ACCT_STATUS[a.status][0];
  const detail = s.detail.trim();
  Object.assign(a, { status: 'DISABLED', disabledAt: '2026-11-11 10:53', disableReason: s.reason, disableDetail: detail });
  addAccountAudit(membershipsOfUser(a.id).map((m) => m.orgId), 'ACCOUNT', '계정 비활성화', `${a.name}(${a.email})`, [['계정 상태', before, '비활성']], { reason: s.reason + (detail ? ' · ' + detail : '') });
  closeOverlay(); closeOverlay(); render(); toast(`${a.name} 계정을 비활성화했습니다.`, 'warning');
};
function openEnable(a: Account) {
  confirmModal({ title: `${a.name} 계정을 활성화할까요?`, icon: 'play', body: <p>모든 소속 조직에 다시 로그인할 수 있습니다. 조직별 멤버 상태(비활성 등)는 그대로 유지됩니다.</p>, confirmLabel: '활성화', onConfirm: () => { a.status = 'ACTIVE'; addAccountAudit(membershipsOfUser(a.id).map((m) => m.orgId), 'ACCOUNT', '계정 활성화', `${a.name}(${a.email})`, [['계정 상태', '비활성', '활성']]); closeOverlay(); render(); toast(`${a.name} 계정을 활성화했습니다.`); } });
}
// 서비스 관리자 = 플랫폼 멤버십(역할: 서비스 관리자). 플랫폼 멤버십과 조직 멤버십은 함께 가질 수 없음
//  · 지정: 플랫폼 멤버십 생성(활성) + 이 계정의 조직 멤버십 모두 해제 · 해제: 플랫폼 멤버십 삭제 → 소속 없음
//  · 권한 비활성화/활성화: 플랫폼 멤버십 상태만 변경(계정은 그대로) · 활성 서비스 관리자는 최소 1명 유지
// 해제될 조직 소속 "{조직} · {역할}" 배열 + 목록(ul) — 안내 문장 다음에 한 줄을 띄우고(줄바꿈 2번) 목록으로 표시
export function saOrgItems(ms: Membership[]): string[] { return ms.map((m) => `${orgById(m.orgId).name} · ${ROLES[m.role]}${m.status !== 'ACTIVE' ? ` (${MEM_STATUS[m.status][0]})` : ''}`); }
export function relList(items: ReactNode[]): ReactNode { return <ul className="rel-list">{items.map((t, i) => <li key={i}>{t}</li>)}</ul>; }
export function releaseMemberships(a: Account, why: string): Change[] {
  const ms = membershipsOfUser(a.id); const chg: Change[] = [];
  ms.forEach((m) => {
    chg.push([`소속 · ${orgById(m.orgId).name}`, ROLES[m.role], '해제']);
    addAudit(m.orgId, 'MEMBER', '조직 소속 해제', `${a.name}(${a.email})`, [['역할', ROLES[m.role], '-'], ['멤버 상태', MEM_STATUS[m.status][0], '해제']], { reason: why });
  });
  ST.memberships = ST.memberships.filter((m) => !(m.userId === a.id && m.orgId !== PLATFORM));
  return chg;
}
export function addPlatformMembership(a: Account, status: MemStatus, extra: Partial<Membership> = {}): Membership {
  const m: Membership = { id: nextId(ST.memberships, 'MB-'), orgId: PLATFORM, userId: a.id, role: 'SERVICE_ADMIN', status, since: '2026-11-11', ...extra };
  ST.memberships.push(m); return m;
}
// 활성 서비스 관리자 최소 1명 유지 — 대상이 빠져도 다른 활성 서비스 관리자가 남는지
const saRemainsWithout = (a: Account) => activeSAs().some((m) => m.userId !== a.id);
function openSaGrant(a: Account) {
  const ms = membershipsOfUser(a.id); const last = lastAdminOrgs(a);
  confirmModal({ title: `${a.name}님을 서비스 관리자로 지정할까요?`, icon: 'shield', width: 560,
    body: (
      <>
        <p>모든 조직의 운영 정보(조직·사용자·AI 모델·사용량·감사 로그)를 관리자 콘솔에서 다룰 수 있게 됩니다.</p>
        {/* 원본은 '…않습니다.'와 ' 지정하면 이 계정의 '가 한 텍스트 노드 — 같은 텍스트 노드로 출력 */}
        <div><p>이 계정에 <b>플랫폼 멤버십</b>{`(역할: 서비스 관리자)이 생기며, 플랫폼 멤버는 어느 조직에도 속하지 않습니다.${ms.length ? ' 지정하면 이 계정의 ' : ''}`}{ms.length ? <><b>{`조직 소속 ${ms.length}곳이 모두 해제`}</b>됩니다.</> : null}</p>{ms.length ? relList(saOrgItems(ms)) : null}</div>
        {last.length ? notice(<><b>{last.join(', ')}</b>의 유일한 활성 조직 관리자입니다. 지정하면 이 조직에 활성 조직 관리자가 없게 되므로, 먼저 다른 조직 관리자를 지정하거나 지정 후 [조직 관리자 지정]으로 새 관리자를 지정하세요.</>, 'warn', 'alert') : null}
        {ms.length ? notice('조직 업무(QA 등)를 계속해야 한다면 서비스 관리자 계정과 별도의 계정으로 조직에 초대받아야 합니다. 작성한 테스트·실행 이력은 보존됩니다.', '') : null}
      </>
    ),
    confirmLabel: '지정',
    onConfirm: () => {
      const chg: Change[] = [['플랫폼 멤버십', '-', '활성'], ['역할', '-', ROLES.SERVICE_ADMIN], ...releaseMemberships(a, '서비스 관리자 지정(플랫폼 멤버십으로 전환)')];
      addPlatformMembership(a, 'ACTIVE', { addedBy: me().name });
      addAudit(null, 'MEMBER', '서비스 관리자 지정', `${a.name}(${a.email})`, chg); render(); renderOverlays(); // 상세 드로어에서 열었으면 드로어 내용도 갱신
      toast(`${a.name}님을 서비스 관리자로 지정했습니다.${ms.length ? ` 조직 소속 ${ms.length}곳이 해제되었습니다.` : ''}`);
    } });
}
interface SaDeactivateState { reason: string }
export function openSaDeactivate(a: Account) {
  if (!saRemainsWithout(a)) { toast('활성 서비스 관리자는 최소 1명 유지해야 합니다.', 'warning'); return; }
  openOverlay<SaDeactivateState>({
    width: 560,
    state: { reason: '' },
    view: (s: SaDeactivateState) => ({
      title: `${a.name}님의 서비스 관리자 권한을 비활성화할까요?`, icon: 'pause', iconType: 'danger',
      body: (
        <>
          <p>관리자 콘솔에 바로 접근할 수 없게 되고, 열려 있는 관리자 콘솔 화면은 다음 이동 때 차단됩니다. <b>계정과 플랫폼 멤버십은 그대로</b> 유지되므로 언제든 다시 활성화할 수 있습니다.</p>
          {field('사유', <Input id="f-sad-r" className="input" maxLength={100} placeholder="예: 휴직, 장기 출장, 담당 업무 변경" value={s.reason} onValue={inp('sadReason')} autoFocus />, { help: '선택 · 감사 로그에 기록됩니다' })}
          {notice('계정 자체를 막아야 하는 경우(퇴사·보안 이슈)에는 [계정 비활성화]를, 서비스 관리자에서 완전히 빼려면 [서비스 관리자 해제]를 사용하세요.', '')}
        </>
      ),
      foot: <><button className="btn btn-secondary" onClick={act('closeOv')}>취소</button><button className="btn btn-danger" onClick={act('sadSubmit', { id: a.id })}>권한 비활성화</button></>,
    }),
  });
}
IN.sadReason = (v) => { ovs<SaDeactivateState>().reason = v; };
ACT.sadSubmit = (d) => {
  const a = acct(d.id); const m = platMemOf(a.id); const s = ovs<SaDeactivateState>();
  Object.assign(m!, { status: 'INACTIVE', inactiveAt: '2026-11-11 10:55', inactiveBy: me().name, inactiveReason: s.reason.trim() });
  addAudit(null, 'MEMBER', '서비스 관리자 권한 비활성화', `${a.name}(${a.email})`, [['멤버 상태', '활성', '비활성']], s.reason.trim() ? { reason: s.reason.trim() } : {});
  closeOverlay(); render(); renderOverlays(); toast(`${a.name}님의 서비스 관리자 권한을 비활성화했습니다.`, 'warning');
};
function openSaActivate(a: Account) {
  const m = platMemOf(a.id)!;
  confirmModal({ title: `${a.name}님의 서비스 관리자 권한을 다시 활성화할까요?`, icon: 'play',
    // 원본은 '…있습니다.'와 ' 다만 계정이 '가 한 텍스트 노드 — 같은 텍스트 노드로 출력
    body: <><p>{`관리자 콘솔을 다시 사용할 수 있습니다.${a.status !== 'ACTIVE' ? ' 다만 계정이 ' : ''}`}{a.status !== 'ACTIVE' ? <><b>{ACCT_STATUS[a.status][0]}</b> 상태라 계정을 먼저 정상화해야 로그인할 수 있습니다.</> : null}</p>{m.inactiveAt ? <div className="kv"><span className="k">비활성화</span><span className="v">{`${m.inactiveAt} · ${m.inactiveBy || '-'}${m.inactiveReason ? ` · ${m.inactiveReason}` : ''}`}</span></div> : null}</>,
    confirmLabel: '활성화',
    onConfirm: () => { m.status = 'ACTIVE'; delete m.inactiveAt; delete m.inactiveBy; delete m.inactiveReason; addAudit(null, 'MEMBER', '서비스 관리자 권한 활성화', `${a.name}(${a.email})`, [['멤버 상태', '비활성', '활성']]); render(); renderOverlays(); toast(`${a.name}님의 서비스 관리자 권한을 활성화했습니다.`); },
  });
}
function openSaRevoke(a: Account) {
  const m = platMemOf(a.id)!;
  if (m.status === 'ACTIVE' && !saRemainsWithout(a)) { toast('활성 서비스 관리자는 최소 1명 유지해야 합니다.', 'warning'); return; }
  confirmModal({ title: `${a.name}님을 서비스 관리자에서 해제할까요?`, icon: 'shield', danger: true, width: 560,
    body: (
      <>
        <p>플랫폼 멤버십이 삭제되어 관리자 콘솔에 더 이상 접근할 수 없습니다. 이 계정은 <b>소속 없음</b> 상태가 됩니다(계정은 유지).</p>
        {notice('잠시 권한만 멈추려면 [서비스 관리자 권한 비활성화]를 사용하세요. 조직에서 일해야 한다면 해당 조직의 조직 관리자가 초대하거나, 서비스 관리자가 [조직 관리 › 조직 관리자 지정]으로 조직 관리자로 초대할 수 있습니다.', '')}
      </>
    ),
    confirmLabel: '해제',
    onConfirm: () => {
      const before = MEM_STATUS[m.status][0];
      ST.memberships = ST.memberships.filter((x) => x.id !== m.id);
      addAudit(null, 'MEMBER', '서비스 관리자 해제', `${a.name}(${a.email})`, [['플랫폼 멤버십', before, '해제'], ['소속', '플랫폼', '소속 없음']]);
      render(); renderOverlays(); toast(`${a.name}님을 서비스 관리자에서 해제했습니다. (소속 없음)`, 'warning');
    } });
}
