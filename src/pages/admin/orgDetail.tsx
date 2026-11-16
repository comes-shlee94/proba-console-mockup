/* ---------- SA-12 조직 상세 ---------- */
import type { ReactNode } from 'react';
import {
  ACT, ST, act, acct, acctBadge, addAudit, confirmModal, ddayOf, fmt, fmt1, go, icon, leftOf, memBadge, membersOf, minsLeft, notice,
  openMenu, orgById, orgFlags, orgStatusBadge, planBadge, relTime, render, seatFullText, seatLimit, seatsLeft, seatsUsed, toast, trialDday,
  trialSuspended, usd, userCell,
  type Page,
} from '../../core';
import { MONTHS, PLANS, ROLES } from '../../data';
import { openAssignAdmin, openResume, openRestore, orgMenuItems, planFeats } from './orgs';
import { AUDIT_MIN, auditTable } from './audit';
import { usageOf } from './usage';
import { openUserDrawer } from './userDrawer';

export function pageOrgDetail(id: string): Page {
  const o = orgById(id);
  if (!o) return { crumbs: ['조직 관리'], body: <div className="blank"><h2>조직을 찾을 수 없습니다</h2></div> };
  const t = ST.ui.orgDetail.tab;
  const mem = membersOf(o.id);
  const logs = ST.audit.filter((a) => a.orgId === o.id && a.at.slice(0, 10) >= AUDIT_MIN); // 화면 조회 범위: 최근 180일
  const banner = trialSuspended(o)
    ? <div className="banner warn">{icon('pause')}<div><b>Trial 만료로 정지된 조직입니다.</b>{` ${o.suspendedAt} · 시스템 · Trial 만료일 ${o.trialEndsAt} — 멤버는 워크스페이스를 이용할 수 없고 조직 관리자는 [조직 관리 › 조직 정보]만 열 수 있습니다. 조직 관리자가 플랜을 Team·Enterprise로 변경하면 바로 정지가 해제되고 체험 기간의 데이터로 계속 이용합니다(Trial 연장 없음).`}</div><button className="btn btn-sm btn-secondary ml-auto" disabled data-tip="Trial 만료 정지는 조직 관리자가 플랜을 변경하면 해제됩니다">정지 해제</button></div>
    : o.status === 'SUSPENDED'
    ? <div className="banner warn">{icon('pause')}<div><b>정지된 조직입니다.</b>{` ${o.suspendedAt} · ${o.suspendedBy || '-'} · 사유: ${o.suspendReason ?? ''} — 멤버는 이 조직에 접근할 수 없습니다.`}</div><button className="btn btn-sm btn-secondary ml-auto" onClick={act('odResume', { id: o.id })}>정지 해제</button></div>
    : o.status === 'PENDING_DELETION'
      ? <div className="banner danger">{icon('trash')}<div><b>삭제 예정 조직입니다.</b>{` ${o.purgeAt}에 영구 삭제됩니다 (D-${ddayOf(o.purgeAt!)}) · 요청: ${o.deletedBy || '-'} · 사유: ${o.deleteReason || '-'}`}</div><button className="btn btn-sm btn-secondary ml-auto" onClick={act('odRestore', { id: o.id })}>삭제 취소</button></div>
      : null;
  const flags = orgFlags(o).map((f, i) => <span key={i} className="attn-chip" data-tip={f.tip}>{icon('alert', 'sm')}{f.label}</span>);
  const head = <><div className="row mb12"><button className="link row" onClick={act('nav', { href: '/admin/organizations' })} style={{ gap: '2px' }}>{icon('left', 'sm')}조직 목록</button></div>
    <div className="page-head"><span className="pi">{icon('building', 'lg')}</span><div><h1 className="row" style={{ gap: '8px' }}>{`${o.name} `}{planBadge(o.plan)} {orgStatusBadge(o)}</h1><p>{`${o.id} · 생성 ${o.createdAt} (${o.createdBy ?? ''})`}</p></div>
      <div className="acts">{flags}<button className="icon-btn bordered" onClick={act('odMenu', { id: o.id })} aria-label="더보기">{icon('more')}</button></div></div></>;
  const tabs = <div className="tabs">{([['info', '기본 정보'], ['members', '멤버', mem.length], ['usage', '사용량'], ['activity', '활동 로그', logs.length]] as [string, string, number?][]).map(([k, l, n], i) => <button key={i} className={t === k ? 'on' : ''} onClick={act('odTab', { v: k })}>{l}{n != null ? <span className="n">{n}</span> : null}</button>)}</div>;
  let content: ReactNode = null;
  if (t === 'info') {
    const p = PLANS[o.plan]; const used = seatsUsed(o.id); const lim = seatLimit(o);
    const admins = mem.filter((m) => m.role === 'ORG_ADMIN');
    const actCnt = admins.filter((m) => m.status === 'ACTIVE' && acct(m.userId).status !== 'DISABLED').length;
    const adminList = admins.map((m, i) => {
      const a = acct(m.userId);
      const acts = m.status === 'PENDING' || m.status === 'EXPIRED'
        ? <button className="btn btn-sm btn-secondary" onClick={act('odResend', { mid: m.id })}>{icon('mail', 'sm')}초대 재발송</button>
        : <button className="btn btn-sm btn-ghost" disabled={actCnt <= 1 && m.status === 'ACTIVE' && a.status !== 'DISABLED'} data-tip={actCnt <= 1 && m.status === 'ACTIVE' && a.status !== 'DISABLED' ? '마지막 활성 조직 관리자는 해제할 수 없습니다' : undefined} onClick={act('odUnassign', { mid: m.id })}>관리자 해제</button>;
      return <div key={i} className="row" style={{ padding: '8px 0', borderBottom: '1px solid var(--hairline)' }}>{userCell(a)}<span className="ml-auto row">{a.status === 'DISABLED' ? <span data-tip="계정이 비활성 상태라 조직 관리자로 활동할 수 없습니다">{acctBadge(a)}</span> : memBadge(m)}{m.status === 'PENDING' ? <span className={`dday ${minsLeft(m.expiresAt!) <= 360 ? 'red' : ''}`}>{leftOf(m.expiresAt!)}</span> : null}{acts}</span></div>;
    });
    // 원본은 이어 붙인 문자열이 비면 '조직 관리자가 없습니다.'로 대체 — 빈 배열은 JSX에서 참이므로 길이로 판단
    const adminRows = adminList.length ? adminList : <div className="faint">조직 관리자가 없습니다.</div>;
    const seatHtml = lim == null
      ? <><b className="num">{`${used}명`}</b> 사용 <span className="muted">· 제한 없음 (활성 + 초대 대기 기준)</span></>
      : <span className="row" style={{ gap: '10px' }}><span className="num"><b>{used}</b>{` / ${lim}명`}</span><span className={`progress ${used / lim >= 0.8 ? 'warn' : ''}`} style={{ width: '120px' }}><i style={{ width: `${Math.min(100, used / lim * 100)}%` }}></i></span><span className="muted">활성 + 초대 대기 기준</span></span>;
    content = <div className="grid">
      <div className="card"><div className="card-h"><h3>조직 정보</h3><span className="sub">조회 전용 · 조직명·메모·플랜은 이 조직의 조직 관리자가 [조직 관리 › 조직 정보]에서 변경</span></div>
        <div className="grid g2" style={{ gap: '0 32px' }}>
        <div className="kv"><span className="k">조직명</span><span className="v">{o.name}</span><span className="k">조직 ID</span><span className="v mono">{o.id}</span>
          <span className="k">상태</span><span className="v">{orgStatusBadge(o)}</span><span className="k">생성</span><span className="v">{`${o.createdAt} · ${o.createdBy ?? ''}`}</span>
          <span className="k">메모</span><span className="v">{o.memo || '-'}</span></div>
        <div className="kv"><span className="k">플랜</span><span className="v">{planBadge(o.plan)}{planFeats(o.plan)}</span>
          {o.trialEndsAt ? <><span className="k">Trial 만료일</span><span className="v">{`${o.trialEndsAt} `}{trialDday(o)} <span className="muted">{`· ${trialSuspended(o) ? 'Trial 만료로 정지됨' : '만료 시 자동 정지'}`}</span></span></> : null}
          <span className="k">좌석</span><span className="v">{seatHtml}</span>
          <span className="k">조직 활동 로그</span><span className="v">{p.activityLog ? '사용 가능' : <span className="muted">사용 불가 (Enterprise 전용)</span>}</span></div></div></div>
      <div className="card"><div className="card-h"><h3>조직 관리자</h3><span className="sub">{`활성 ${actCnt}명 · 최소 1명 유지`}</span><span className="r">{o.status === 'ACTIVE' ? <button className="btn btn-sm btn-secondary" onClick={act('odAssign', { id: o.id })}>{icon('crown', 'sm')}조직 관리자 지정</button> : null}</span></div>{adminRows}</div></div>;
  } else if (t === 'members') {
    const rows = mem.map((m, i) => {
      const a = acct(m.userId);
      return <tr key={i}><td>{userCell(a)}</td><td>{ROLES[m.role]}</td><td>{memBadge(m)}{m.status === 'PENDING' ? <>{' '}<span className={`dday ${minsLeft(m.expiresAt!) <= 360 ? 'red' : ''}`}>{leftOf(m.expiresAt!)}</span></> : null}</td><td>{a.status !== 'ACTIVE' ? acctBadge(a) : <span className="faint">정상</span>}</td><td className="num">{a.lastLoginAt ? relTime(a.lastLoginAt) : '-'}</td><td className="num">{m.since}</td>
        <td className="c"><button className="icon-btn" onClick={act('odMemMenu', { mid: m.id })} aria-label="관리">{icon('more')}</button></td></tr>;
    });
    content = <>{notice(<>멤버 초대·역할 변경·비활성화는 해당 조직의 <b>조직 관리자</b>가 [조직 관리]에서 수행합니다. 서비스 관리자는 이 화면에서 <b>조직 관리자 지정</b>과 계정 상세 확인만 할 수 있습니다.</>, 'info')}
      <div className="tbl-wrap mt12"><table className="tbl"><colgroup><col style={{ width: '30%' }} /><col style={{ width: '14%' }} /><col style={{ width: '16%' }} /><col style={{ width: '12%' }} /><col style={{ width: '12%' }} /><col style={{ width: '11%' }} /><col style={{ width: '56px' }} /></colgroup>
      <thead><tr><th>사용자</th><th>역할</th><th>멤버 상태</th><th>계정 상태</th><th>최근 로그인</th><th>가입·초대일</th><th className="c">관리</th></tr></thead><tbody>{rows}</tbody></table></div></>;
  } else if (t === 'usage') {
    const rows = MONTHS.map((mo, i) => { const u = usageOf(o.id, mo.key); return <tr key={i}><td>{mo.label}</td><td className="r num">{fmt(u.lqaRuns)}</td><td className="r num">{fmt(u.lqaCases)}</td><td className="r num">{fmt(u.fqaRuns)}</td><td className="r num">{fmt1(u.runnerH)}</td><td className="r num">{fmt(u.loadRuns)}</td><td className="r num">{fmt1(u.workerH)}</td><td className="r num">{fmt(u.appRuns)}</td><td className="r num">{fmt1(u.deviceH)}</td><td className="r num"><b>{usd(u.billUsd)}</b></td></tr>; });
    content = <><div className="tbl-wrap"><table className="tbl"><thead><tr><th style={{ width: '170px' }}>기준 월</th><th className="r">AI 평가(회)</th><th className="r">채점(건)</th><th className="r">기능 실행</th><th className="r">러너(h)</th><th className="r">부하 측정</th><th className="r">워커(h)</th><th className="r">앱 측정</th><th className="r">단말(h)</th><th className="r">사용 금액</th></tr></thead><tbody>{rows}</tbody></table></div>
      <div className="row mt12"><span className="faint" style={{ fontSize: '12px' }}>{`사용 금액 = AI 모델 사용분(요청 시각의 단가로 계산) · 2026년 11월은 ${MONTHS[0].note}`}</span><button className="link ml-auto" onClick={act('nav', { href: '/admin/usage' })}>사용량·사용 금액에서 전체 비교 보기 →</button></div></>;
  } else {
    content = <>{auditTable(logs, { hideOrg: true })}<div className="row mt12"><button className="link" onClick={act('odAuditAll', { id: o.id })}>감사 로그에서 이 조직 전체 이력 보기 →</button></div></>;
  }
  return { crumbs: ['조직 관리', o.name], body: <>{head}{banner}{tabs}{content}</> };
}
ACT.odTab = (d) => { ST.ui.orgDetail.tab = d.v; render(); };
ACT.odMenu = (d, el) => openMenu(el!, orgMenuItems(orgById(d.id), true));
ACT.odResume = (d) => openResume(orgById(d.id));
ACT.odRestore = (d) => openRestore(orgById(d.id));
ACT.odAssign = (d) => openAssignAdmin(orgById(d.id));
ACT.odAuditAll = (d) => { Object.assign(ST.ui.audit, { org: d.id, range: '180d', cat: 'ALL', result: 'ALL', q: '', page: 1 }); go('/admin/audit-logs'); };
ACT.toastInfo = (d) => toast(d.msg, 'info');
ACT.odResend = (d) => { const m = ST.memberships.find((x) => x.id === d.mid)!; if (m.status === 'EXPIRED' && seatsLeft(m.orgId) <= 0) { toast(`좌석이 부족해 초대를 재발송할 수 없습니다. (${seatFullText(m.orgId)})`, 'warning'); return; } const before = m.expiresAt; m.status = 'PENDING'; m.invitedAt = '2026-11-11 10:51'; m.expiresAt = '2026-11-12 10:51'; const a = acct(m.userId); if (a.status === 'EXPIRED' || a.status === 'INVITED') { a.status = 'INVITED'; a.expiresAt = m.expiresAt; } addAudit(m.orgId, 'MEMBER', '초대 재발송', `${a.name}(${a.email})`, [['초대 만료', before as string, m.expiresAt], ['이전 초대 링크', '유효', '무효화']]); render(); toast(`${a.email}로 초대 메일을 다시 보냈습니다. 이전 초대 링크는 무효가 되며 새 링크는 1일간 유효합니다.`); };
ACT.odUnassign = (d) => {
  const m = ST.memberships.find((x) => x.id === d.mid)!; const a = acct(m.userId);
  confirmModal({ title: `${a.name}님의 조직 관리자 권한을 해제할까요?`, body: <p>역할이 <b>QA 엔지니어</b>로 변경됩니다. 조직에는 활성 조직 관리자가 최소 1명 남아 있어야 합니다.</p>, confirmLabel: '해제', onConfirm: () => { m.role = 'QA_ENGINEER'; addAudit(m.orgId, 'MEMBER', '조직 관리자 해제', `${a.name}(${a.email})`, [['역할', '조직 관리자', 'QA 엔지니어']]); render(); toast(`${a.name}님의 조직 관리자 권한을 해제했습니다.`); } });
};
ACT.odMemMenu = (d, el) => {
  const m = ST.memberships.find((x) => x.id === d.mid)!; const o = orgById(m.orgId);
  const canAssign = o.status === 'ACTIVE' && m.status === 'ACTIVE' && m.role !== 'ORG_ADMIN' && acct(m.userId).status === 'ACTIVE';
  openMenu(el!, [
    { label: '계정 상세 보기', icon: 'user', run: () => openUserDrawer(m.userId) },
    { label: '조직 관리자로 지정', icon: 'crown', disabled: !canAssign, hint: canAssign ? '' : m.role === 'ORG_ADMIN' ? '이미 조직 관리자입니다' : '활성 멤버(활성 계정)만 지정할 수 있습니다', run: () => { const before = ROLES[m.role]; m.role = 'ORG_ADMIN'; addAudit(o.id, 'MEMBER', '조직 관리자 지정', `${acct(m.userId).name}(${acct(m.userId).email})`, [['역할', before, '조직 관리자']], { reason: '서비스 관리자 지정' }); render(); toast(`${acct(m.userId).name}님을 조직 관리자로 지정했습니다.`); } },
  ]);
};
