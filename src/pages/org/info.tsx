/* ==========================================================
   조직 관리 콘솔 (OA-60 조직 정보 · OA-10 멤버 관리 · OA-20 권한 관리 · OA-40 AI 모델 · OA-50 사용량·사용 금액 · OA-30 활동 로그)
   조직 관리는 현재 선택한 조직에서 역할이 '조직 관리자'인 사용자만 사용 (서비스 관리자는 플랫폼 멤버로 조직에 속하지 않으므로 사용하지 않음)
   Trial 만료로 정지된 조직은 [조직 정보]만 열 수 있고, 플랜을 Team·Enterprise로 바꾸면 바로 정지가 해제됨
   ========================================================== */
import type { Change, Membership, Org, Plan, PlanKey, RoleKey } from '../../types';
import { PLANS } from '../../data';
import {
  ACT, CUR_ORG, IN, Input, ORG_NAV, ST, Textarea, act, activeAdmins, addAudit, addSysAudit, closeOverlay, ddayOf, field, icon, inp, josa,
  membersOf, notice, openOverlay, orgById, orgStatusBadge, ovs, pageHead, planBadge, refreshOverlay, render, seatLimit, seatsUsed, toast,
  trialDday, trialSuspended, type Page,
} from '../../core';
import { planFeats } from '../admin/orgs';

export function orgName(): string { return CUR_ORG ? orgById(CUR_ORG).name : ''; }
export function memRoleCount(role: RoleKey): number { return membersOf(CUR_ORG).filter((m) => m.role === role && m.status === 'ACTIVE').length; }
export function isLastAdmin(m: Membership): boolean { return m.role === 'ORG_ADMIN' && m.status === 'ACTIVE' && activeAdmins(m.orgId).length <= 1; }

/* ---------- OA-60 조직 정보 ---------- */
export function pageOrgInfo(): Page {
  const o = orgById(CUR_ORG); const p = PLANS[o.plan]; const used = seatsUsed(o.id); const lim = seatLimit(o);
  const seatHtml = lim == null
    ? <><b className="num">{`${used}명`}</b> 사용 <span className="muted">· 인원 제한 없음</span></>
    : <span className="row" style={{ gap: '10px' }}><span className="num"><b>{used}</b>{` / ${lim}명`}</span><span className={`progress ${used / lim >= 0.8 ? 'warn' : ''}`} style={{ width: '120px' }}><i style={{ width: `${Math.min(100, used / lim * 100)}%` }}></i></span></span>;
  const tsus = trialSuspended(o);
  const banner = tsus ? <div className="banner warn">{icon('pause')}<div><b>{`Trial이 ${o.trialEndsAt}에 끝나 조직이 정지되었습니다.`}</b> 정지 중에는 멤버가 워크스페이스를 이용할 수 없고, 조직 관리에서는 이 화면만 열 수 있습니다. 플랜을 <b>Team 또는 Enterprise</b>로 변경하면 바로 다시 이용할 수 있으며, 체험 기간의 데이터(테스트·실행 이력·설정)는 그대로 이어집니다.</div><button className="btn btn-sm btn-primary ml-auto" onClick={act('oiPlan')}>{icon('swap', 'sm')}플랜 변경</button></div> : null;
  const body = <>{pageHead('building', '조직 정보', '기본 정보와 플랜 · 조직명·메모 수정과 플랜 변경')}{banner}
    <div className="grid g2">
      <div className="card"><div className="card-h"><h3>기본 정보</h3><span className="r"><button className="btn btn-sm btn-secondary" onClick={act('oiEdit')} disabled={tsus} data-tip={tsus ? '정지 중에는 조직 정보를 수정할 수 없습니다 · 플랜을 변경하면 다시 수정할 수 있습니다' : undefined}>{icon('pencil', 'sm')}수정</button></span></div>
        <div className="kv"><span className="k">조직명</span><span className="v"><b>{o.name}</b></span><span className="k">조직 ID</span><span className="v mono">{o.id}</span>
          <span className="k">상태</span><span className="v">{orgStatusBadge(o)}{tsus ? <> <span className="muted">· Trial 만료</span></> : null}</span><span className="k">생성일</span><span className="v">{o.createdAt}</span>
          <span className="k">메모</span><span className="v">{o.memo ? o.memo : <span className="faint">-</span>}</span></div></div>
      <div className="card"><div className="card-h"><h3>플랜</h3><span className="r"><button className="btn btn-sm btn-primary" onClick={act('oiPlan')}>{icon('swap', 'sm')}플랜 변경</button></span></div>
        <div className="kv"><span className="k">현재 플랜</span><span className="v">{planBadge(o.plan)}{planFeats(o.plan)}</span>
          {o.trialEndsAt ? <><span className="k">Trial 만료일</span><span className="v">{`${o.trialEndsAt} `}{trialDday(o)}<div className="faint" style={{ fontSize: '12px', marginTop: '2px' }}>{tsus ? 'Trial이 끝나 정지되었습니다 · Team·Enterprise로 바꾸면 바로 정지가 해제됩니다 (Trial 연장 없음)' : '만료되면 조직이 자동 정지됩니다 · Team·Enterprise로 바꾸면 Trial이 끝나고 정식 플랜으로 전환'}</div></span></> : null}
          <span className="k">좌석</span><span className="v">{seatHtml}<div className="faint" style={{ fontSize: '12px', marginTop: '2px' }}>활성 + 초대 대기 기준</div></span>
          <span className="k">활동 로그</span><span className="v">{p.activityLog ? '사용 가능' : <span className="muted">사용 불가 (Enterprise 전용)</span>}</span></div></div></div>
    <div className="mt12">{notice(<>조직명·메모·플랜은 이 조직의 <b>조직 관리자</b>만 바꿀 수 있습니다. 변경 내용은 별도 승인 없이 즉시 적용되며 활동 로그에 기록됩니다.</>, '')}</div></>;
  return { crumbs: ['조직 정보'], body };
}
ACT.oiEdit = () => { if (trialSuspended(orgById(CUR_ORG))) return; openOrgEdit(orgById(CUR_ORG)); };
ACT.oiPlan = () => openPlanModal(orgById(CUR_ORG));

// Trial 만료로 정지된 조직: 조직 정보 외 메뉴는 잠금 (URL로 직접 들어와도 안내)
export function pageOrgTrialLocked(path: string): Page {
  const nav = ORG_NAV.find(([href]) => path === href || path.startsWith(href + '/'));
  const o = orgById(CUR_ORG);
  return { crumbs: [nav ? nav[1] : '조직 관리'], body: <div className="blank"><span className="bi">{icon('lock', 'lg')}</span><h2>Trial 만료로 정지된 동안에는 조직 정보만 이용할 수 있습니다</h2>
    <p>{`${o.name}의 Trial이 ${o.trialEndsAt}에 끝나 조직이 정지되었습니다. `}<b>[조직 정보]</b>{`에서 플랜을 Team 또는 Enterprise로 변경하면 ${nav ? `${josa(nav[1], '을/를')} 포함한 ` : ''}모든 메뉴를 바로 다시 이용할 수 있습니다.`}</p>
    <button className="btn btn-primary mt12" onClick={act('nav', { href: '/org/info' })}>{icon('building', 'sm')}조직 정보로 이동</button></div> };
}

/* ---------- OA-62 조직 정보 수정 ---------- */
interface OrgEditState { name: string; memo: string; err: { name?: string } }
export function openOrgEdit(o: Org) {
  openOverlay<OrgEditState>({
    width: 560,
    state: { name: o.name, memo: o.memo || '', err: {} },
    view: (s: OrgEditState) => {
      const changed = s.name.trim().replace(/\s+/g, ' ') !== o.name || s.memo !== (o.memo || '');
      return {
        title: '조직 정보 수정', icon: 'pencil',
        body: <>{field('조직명', <Input id="f-oe-name" className="input" maxLength={50} placeholder="조직명을 입력해주세요." value={s.name} onValue={inp('oeName')} autoFocus />, { req: 1, help: '2~50자 · 다른 조직과 같은 이름은 사용할 수 없습니다', err: s.err.name })}
          {field('메모', <Textarea id="f-oe-memo" className="textarea" maxLength={200} placeholder="예: 도입 부서, 담당자 연락 채널" value={s.memo} onValue={inp('oeMemo')} />, { help: `선택 · ${s.memo.length}/200자 · 조직 관리자와 서비스 관리자만 볼 수 있습니다` })}
          {notice('조직명을 바꾸면 모든 멤버의 화면(조직 전환 목록 등)과 이후 발송되는 초대 메일에 새 이름이 바로 표시됩니다. 변경 내용은 활동 로그에 기록됩니다.', '')}</>,
        foot: <><button className="btn btn-secondary" onClick={act('closeOv')}>취소</button><button className="btn btn-primary" onClick={act('oeSave')} disabled={!(changed && s.name.trim())}>저장</button></>,
      };
    },
  });
}
IN.oeName = (v) => { ovs<OrgEditState>().name = v; ovs<OrgEditState>().err.name = ''; refreshOverlay(); };
IN.oeMemo = (v) => { ovs<OrgEditState>().memo = v; refreshOverlay(); };
ACT.oeSave = () => {
  const o = orgById(CUR_ORG); const s = ovs<OrgEditState>(); const err: OrgEditState['err'] = {};
  const name = s.name.trim().replace(/\s+/g, ' ');
  if (name.length < 2) err.name = '조직명은 2자 이상 입력해주세요.';
  else if (ST.orgs.some((x) => x.id !== o.id && x.name.toLowerCase() === name.toLowerCase())) err.name = '이미 사용 중인 조직명입니다.';
  if (Object.keys(err).length) { s.err = err; refreshOverlay(); return; }
  const chg: Change[] = [];
  if (name !== o.name) chg.push(['조직명', o.name, name]);
  if (s.memo !== (o.memo || '')) chg.push(['메모', o.memo || '-', s.memo || '-']);
  o.name = name; o.memo = s.memo;
  addAudit(o.id, 'ORG', '조직 정보 수정', name, chg);
  closeOverlay(); render(); toast('조직 정보를 저장했습니다.');
};

/* ---------- OA-61 플랜 변경 (v0.3까지 관리자 콘솔 SA-13 → v0.4부터 조직 관리자) ---------- */
interface PlanModalState { plan: PlanKey; reason: string }
export function openPlanModal(o: Org) {
  openOverlay<PlanModalState>({
    width: 640,
    state: { plan: o.plan, reason: '' },
    view: (s: PlanModalState) => {
      const used = seatsUsed(o.id);
      const cards = (Object.entries(PLANS) as [PlanKey, Plan][]).map(([k, p], i) => {
        const cur = k === o.plan;
        const why = cur ? ''
          : k === 'TRIAL' ? 'Trial은 서비스 관리자가 조직을 만들 때만 지정할 수 있습니다'
            : p.seats != null && used > p.seats ? `멤버 수(${used}명)가 ${p.label} 플랜 한도(${p.seats}명)를 넘어 선택할 수 없습니다 · 멤버를 정리한 뒤 변경하세요` : '';
        return <button key={i} className={`radio-card ${s.plan === k ? 'on' : ''} ${why ? 'disabled' : ''}`} disabled={!!why} onClick={act('pcPlan', { v: k })}><span className="t">{planBadge(k)}{cur ? <span className="badge b-outline">현재</span> : null}</span>{planFeats(k)}{why ? <span className="d" style={{ color: 'var(--red-line)' }}>{why}</span> : null}</button>;
      });
      const changed = s.plan !== o.plan;
      const loseLog = changed && PLANS[o.plan].activityLog && !PLANS[s.plan].activityLog;
      const endTrial = changed && o.plan === 'TRIAL';
      const tsus = trialSuspended(o);
      return {
        title: '플랜 변경', icon: 'swap',
        // 조직명 뒤 공백은 원본처럼 조직명과 한 텍스트 노드
        body: <><div className="kv"><span className="k">조직</span><span className="v">{`${o.name}${tsus ? ' ' : ''}`}{tsus ? <>{orgStatusBadge(o)} <span className="muted">Trial 만료</span></> : null}</span><span className="k">현재 플랜</span><span className="v">{planBadge(o.plan)} {o.trialEndsAt ? <span className="muted">{`(Trial 만료 ${o.trialEndsAt} · ${ddayOf(o.trialEndsAt) < 0 ? '만료됨' : 'D-' + ddayOf(o.trialEndsAt)})`}</span> : null}</span><span className="k">좌석 사용</span><span className="v">{`${used}명 (활성 + 초대 대기)`}</span></div>
          <div className="radio-cards">{cards}</div>
          {field('변경 사유', <Input id="f-pc-reason" className="input" maxLength={100} placeholder="예: 정식 도입, 사용 인원 증가" value={s.reason} onValue={inp('pcReason')} />, { help: '선택 · 활동 로그에 기록됩니다' })}
          {loseLog ? notice(<>Enterprise가 아닌 플랜으로 바꾸면 <b>[조직 관리 › 활동 로그]</b>를 더 이상 볼 수 없습니다. 활동 기록은 계속 저장되며 다시 Enterprise로 바꾸면 바로 볼 수 있습니다.</>, 'warn', 'alert') : null}
          {tsus ? notice(endTrial ? <><b>{PLANS[s.plan].label}</b> 플랜으로 바뀌면서 <b>조직 정지가 바로 해제</b>되어 모든 멤버가 다시 이용할 수 있습니다. 체험 기간의 데이터(테스트·실행 이력·설정)는 그대로 이어서 사용합니다. 정지 중 건너뛴 예약 실행은 자동으로 다시 실행되지 않습니다.</> : <>Trial이 끝난 조직입니다. <b>Team 또는 Enterprise</b>를 선택하면 바로 다시 이용할 수 있습니다. (Trial 연장은 제공하지 않습니다)</>, 'info')
            : endTrial ? notice(<>Trial이 끝나고 <b>{PLANS[s.plan].label}</b> 플랜으로 바로 전환됩니다(Trial 만료일 해제 · 자동 정지 예약 취소). 이후에는 Trial로 되돌릴 수 없습니다.</>, 'info') : null}
          {notice('별도 승인 없이 변경 즉시 조직 전체에 적용됩니다. 좌석 한도는 이후 초대·활성화부터 적용되며 이미 사용 중인 멤버에게는 영향을 주지 않습니다.', '')}</>,
        foot: <><button className="btn btn-secondary" onClick={act('closeOv')}>취소</button><button className="btn btn-primary" onClick={act('pcSubmit')} disabled={!changed}>변경</button></>,
      };
    },
  });
}
ACT.pcPlan = (d) => { ovs<PlanModalState>().plan = d.v as PlanKey; refreshOverlay(); };
IN.pcReason = (v) => { ovs<PlanModalState>().reason = v; };
ACT.pcSubmit = () => {
  const o = orgById(CUR_ORG); const s = ovs<PlanModalState>(); const before = PLANS[o.plan].label;
  const resume = trialSuspended(o); // Trial 만료 정지 → 정식 플랜 전환과 함께 정지 해제
  const chg: Change[] = [['플랜', before, PLANS[s.plan].label]];
  if (o.plan === 'TRIAL' && s.plan !== 'TRIAL') chg.push(['Trial 만료일', o.trialEndsAt || '-', '-(정식 플랜 전환)']);
  if (resume) chg.push(['조직 상태', '정지(Trial 만료)', '운영']);
  o.plan = s.plan; if (s.plan !== 'TRIAL') delete o.trialEndsAt;
  addAudit(o.id, 'ORG', '플랜 변경', o.name, chg, { reason: s.reason });
  if (resume) {
    o.status = 'ACTIVE'; (['suspendType', 'suspendedAt', 'suspendReason', 'suspendedBy'] as const).forEach((k) => delete o[k]);
    addSysAudit(o.id, 'ORG', '정지 해제', o.name, [['조직 상태', '정지', '운영']], { reason: `Trial 만료 정지 → ${PLANS[s.plan].label} 플랜 전환` });
  }
  closeOverlay(); render();
  toast(`플랜을 ${josa(PLANS[s.plan].label, '으로/로')} 변경했습니다.${resume ? ' 조직 정지가 해제되어 모든 멤버가 다시 이용할 수 있습니다.' : ''}`);
};
