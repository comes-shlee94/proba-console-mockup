/* ---------- SA-21 사용자 상세 (드로어) ---------- */
import type { ReactNode } from 'react';
import {
  ACT, ST, act, acct, acctBadge, avatar, badge, closeOverlay, go, icon, leftOf, me, memBadge, membershipsOfUser, openOverlay, orgById,
  orgStatusBadge, platMemOf,
  type MenuItem,
} from '../../core';
import { AUDIT_CATS, ROLES } from '../../data';
import { userMenuItems } from './users';
import { AUDIT_MIN } from './audit';

export function openUserDrawer(id: string) {
  openOverlay({
    drawer: true,
    view: () => {
      const a = acct(id); if (!a) return { title: '-', body: '' };
      const self = a.id === me().id;
      const ms = membershipsOfUser(a.id); const pm = platMemOf(a.id);
      const seen = new Set<string>(); // 계정 단위 조치는 조직마다 같은 시각으로 기록되므로 한 줄로 보여 줌
      const logs = ST.audit.filter((x) => (x.actor.email === a.email || x.target.includes(a.email)) && x.at.slice(0, 10) >= AUDIT_MIN && !seen.has(x.at + x.action + x.target) && seen.add(x.at + x.action + x.target)).slice(0, 5);
      const memRows = ms.map((m, i) => { const o = orgById(m.orgId); return <tr key={i}><td><button className="link" onClick={act('openOrgFromDrawer', { id: o.id })}>{o.name}</button> {o.status !== 'ACTIVE' ? orgStatusBadge(o) : null}</td><td>{ROLES[m.role]}</td><td data-tip={m.status === 'INACTIVE' && m.inactiveReason ? `${m.inactiveAt} · ${m.inactiveBy} · ${[m.inactiveReason, m.inactiveDetail].filter(Boolean).join(' · ')}` : undefined}>{memBadge(m)}</td><td className="num">{m.since}</td></tr>; });
      const pmExtra = pm && pm.status === 'INACTIVE' ? <div className="kv mt8"><span className="k">권한 비활성화</span><span className="v">{`${pm.inactiveAt} · ${pm.inactiveBy || '-'}${pm.inactiveReason ? ` · 사유: ${pm.inactiveReason}` : ''}`}</span></div> : null;
      const statusExtra = a.status === 'LOCKED' ? <><span className="k">잠긴 시각</span><span className="v">{`${a.lockedAt} · ${a.lockReason ?? ''}${a.unlockAt ? ` · ${a.unlockAt.slice(11)} 자동 해제` : ''}`}</span></>
        : a.status === 'DISABLED' ? <><span className="k">비활성 사유</span><span className="v">{`${a.disableReason || '-'} (${a.disabledAt || '-'})`}{a.disableDetail ? <><br /><span className="muted">{a.disableDetail}</span></> : null}</span></>
          : a.status === 'INVITED' || a.status === 'EXPIRED' ? <><span className="k">초대</span><span className="v">{`${a.invitedAt} 발송 · ${a.expiresAt} ${a.status === 'EXPIRED' ? '만료됨' : `만료 예정 (${leftOf(a.expiresAt!)})`}`}</span></> : null;
      // 원본은 본인이거나 표시할 버튼이 없으면 빈 문자열(→ foot 기본값) — 빈 배열은 JSX에서 참이므로 foot에서 길이로 판단
      const acts: ReactNode[] = self ? [] : userMenuItems(a).filter((x): x is MenuItem => x !== '-' && x.label !== '상세 보기' && !x.disabled).slice(0, 3)
        .map((x, i) => <button key={i} className={`btn ${x.danger ? 'btn-danger-line' : 'btn-secondary'}`} onClick={act('udAct', { id: a.id, i: String(i) })}>{icon(x.icon!, 'sm')}{x.label}</button>);
      return {
        head: <div className="row" style={{ gap: '12px' }}>{avatar(a)}<div><h2 className="row" style={{ gap: '6px' }}>{`${a.name} `}{pm ? badge('플랫폼 · 서비스 관리자', 'b-violet') : null}</h2><div className="s">{a.email}</div></div></div>,
        body: <><div><p className="sec-t">계정 정보</p><div className="kv"><span className="k">사용자 ID</span><span className="v mono">{a.id}</span>
          <span className="k">계정 상태</span><span className="v">{acctBadge(a)}</span>{statusExtra}
          <span className="k">가입일</span><span className="v">{a.joinedAt || '-'}</span><span className="k">최근 로그인</span><span className="v">{a.lastLoginAt || '-'}</span>
          <span className="k">IP</span><span className="v">{a.lastLoginIp ? <><span className="mono">{a.lastLoginIp}</span> <span className="faint">(최근 접속)</span></> : '-'}</span></div></div>
          {pm
            ? <div><p className="sec-t">소속 <span className="faint" style={{ fontWeight: '400' }}>플랫폼 멤버십</span></p><div className="tbl-wrap" style={{ border: '1px solid var(--hairline)' }}><table className="tbl"><thead><tr><th>소속</th><th>역할</th><th>멤버 상태</th><th>지정·초대일</th></tr></thead><tbody><tr><td><span className="org-chip sa">{icon('shield', 'sm')}플랫폼</span></td><td>{ROLES.SERVICE_ADMIN}</td><td>{memBadge(pm)}</td><td className="num">{pm.since}</td></tr></tbody></table></div>{pmExtra}
              <p className="faint mt8" style={{ fontSize: '12px' }}>{`서비스 관리자는 플랫폼 멤버십만 있으며 어느 조직에도 속하지 않습니다. 권한 비활성화·활성화·해제는 서비스 관리자가 이 화면 또는 사용자 목록에서 합니다.${pm.status === 'ACTIVE' && a.status !== 'ACTIVE' ? ' 계정이 활성 상태가 아니어서 지금은 관리자 콘솔을 사용할 수 없습니다.' : ''}`}</p></div>
            : <div><p className="sec-t">소속 조직 <span className="faint" style={{ fontWeight: '400' }}>{ms.length}</span></p>{ms.length ? <div className="tbl-wrap" style={{ border: '1px solid var(--hairline)' }}><table className="tbl"><thead><tr><th>조직</th><th>역할</th><th>멤버 상태</th><th>가입·초대일</th></tr></thead><tbody>{memRows}</tbody></table></div> : <p className="faint">소속 조직이 없습니다.</p>}
              <p className="faint mt8" style={{ fontSize: '12px' }}>한 계정이 여러 조직에 소속될 수 있고 조직마다 역할이 다를 수 있습니다. 역할·멤버 상태 변경은 각 조직의 조직 관리자가 수행합니다.</p></div>}
          <div><p className="sec-t">최근 활동</p>{logs.length ? logs.map((l, i) => <div key={i} className="row" style={{ padding: '7px 0', borderBottom: '1px solid var(--hairline)', fontSize: '12px' }}><span className="mono faint" style={{ width: '118px' }}>{l.at.slice(0, 16)}</span><span>{badge(AUDIT_CATS[l.cat], 'b-outline')}</span><span>{l.action}</span><span className="faint" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.target}</span></div>) : <p className="faint">최근 활동이 없습니다.</p>}
          {' '}<button className="link mt8" onClick={act('udAudit', { email: a.email })}>감사 로그에서 전체 보기 →</button></div></>,
        foot: acts.length ? acts : <><span className="faint" style={{ marginRight: 'auto', fontSize: '12px' }}>{self ? '본인 계정은 이 화면에서 변경할 수 없습니다.' : ''}</span><button className="btn btn-secondary" onClick={act('closeOv')}>닫기</button></>,
      };
    },
  });
}
ACT.udAct = (d) => { const a = acct(d.id); const it = userMenuItems(a).filter((x): x is MenuItem => x !== '-' && x.label !== '상세 보기' && !x.disabled)[Number(d.i)]; it && it.run!(); };
ACT.openOrgFromDrawer = (d) => { closeOverlay(); ACT.openOrg(d); };
ACT.udAudit = (d) => { closeOverlay(); Object.assign(ST.ui.audit, { q: d.email, range: '180d', org: 'ALL', cat: 'ALL', result: 'ALL', page: 1 }); go('/admin/audit-logs'); };
