/* ---------- SA-22 서비스 관리자 추가 ---------- */
import type { Change } from '../../types';
import {
  ACT, EMAIL_RE, IN, Input, ST, act, addAudit, closeOverlay, enter, field, icon, inp, me, membershipsOfUser, nextId, notice, openOverlay,
  ovs, platMemOf, refreshOverlay, render, toast,
} from '../../core';
import { ROLES } from '../../data';
import { addPlatformMembership, lastAdminOrgs, relList, releaseMemberships, saOrgItems } from './users';

/** 추가할 이메일 칩 — orgs: 해제될 조직 소속(saOrgItems) · last: 유일한 활성 조직 관리자인 조직(lastAdminOrgs) */
interface SaChip { email: string; existing: boolean; orgs?: string[]; last?: string[] }
interface SaAddState { chips: SaChip[]; input: string; err: string }

ACT.saAdd = () => openOverlay<SaAddState>({
  width: 560,
  state: { chips: [], input: '', err: '' },
  view: (s: SaAddState) => ({
    title: '서비스 관리자 추가', icon: 'shield',
    body: <>{field('이메일', <div className="chips-input">{s.chips.map((c, i) => <span key={i} className="chip">{`${c.email} · ${c.existing ? `기존 계정${(c.orgs || []).length ? ' · 조직 소속 해제' : ''}` : '초대'}`}<button onClick={act('saRm', { e: c.email })} aria-label={`${c.email} 제거`}>{icon('x', 'sm')}</button></span>)}<Input id="f-sa-in" placeholder="name@company.com 입력 후 Enter" value={s.input} onValue={inp('saIn')} onEnter={enter('saChip')} autoFocus /></div>, { req: 1, err: s.err, help: 'Enter 또는 쉼표(,)로 여러 명 추가 · 쉼표로 구분한 목록을 붙여넣어도 됨 · 이메일 도메인 제한 없음' })}
      {s.chips.some((c) => (c.last || []).length) ? notice(<>추가하면 아래 조직에 <b>활성 조직 관리자가 없게 됩니다</b>(유일한 활성 조직 관리자). 먼저 다른 조직 관리자를 지정하거나, 추가한 뒤 [조직 관리자 지정]으로 새 관리자를 지정하세요.{relList(s.chips.filter((c) => (c.last || []).length).map((c) => `${c.email} — ${c.last!.join(', ')}`))}</>, 'warn', 'alert') : null}
      {s.chips.some((c) => (c.orgs || []).length) ? notice(<>조직에 소속된 기존 계정은 추가하면 <b>조직 소속이 모두 해제</b>됩니다.{relList(s.chips.filter((c) => (c.orgs || []).length).map((c) => <>{c.email}{relList(c.orgs!)}</>))}</>, 'warn', 'alert') : null}
      {notice(<>서비스 관리자는 <b>모든 조직의 운영 정보</b>(조직·사용자·AI 모델·사용량·사용 금액·감사 로그)에 접근합니다. 꼭 필요한 인원만 추가하세요. 추가하면 <b>플랫폼 멤버십</b>(역할: 서비스 관리자)이 생기며 어느 조직에도 속하지 않습니다. 이미 가입한 계정은 바로 지정되고, 신규 사용자에게는 초대 메일(유효기간 1일)이 발송되어 수락하면 서비스 관리자가 됩니다.</>, 'info')}</>,
    foot: <><span className="l">{s.chips.length ? `${s.chips.length}명 추가 예정` : ''}</span><button className="btn btn-secondary" onClick={act('closeOv')}>취소</button><button className="btn btn-primary" onClick={act('saSubmit')} disabled={!s.chips.length}>추가</button></>,
  }),
});
// 쉼표(,)·세미콜론(;)이 들어오면 앞부분을 칩으로 나눔 — 붙여넣기면 끝까지, 입력 중이면 마지막 구분자 뒤는 입력란에 둠. 잘못된 항목에서 멈추고 오류를 보여 줌
IN.saIn = (v, _el, e) => {
  const s = ovs<SaAddState>();
  if (!/[,;]/.test(v)) { s.input = v; s.err = ''; return; }
  const parts = v.split(/[,;]/); const rest = e && (e as InputEvent).inputType === 'insertFromPaste' ? '' : parts.pop()!;
  for (let i = 0; i < parts.length; i++) {
    s.input = parts[i];
    if (!addSaChip(s)) { s.input = [...parts.slice(i), rest].map((x) => x.trim()).filter(Boolean).join(', '); refreshOverlay(); return; }
  }
  s.input = rest.trim(); s.err = ''; refreshOverlay();
};
ACT.saChip = () => { addSaChip(ovs<SaAddState>()); refreshOverlay(); };
function addSaChip(s: SaAddState): boolean { // 성공(또는 빈 값)이면 true
  const e = s.input.trim(); if (!e) return true;
  let err = '';
  const ex = ST.accounts.find((a) => a.email.toLowerCase() === e.toLowerCase()); const pm = ex && platMemOf(ex.id);
  if (!EMAIL_RE.test(e)) err = '이메일 형식에 맞게 입력해주세요.';
  else if (s.chips.some((c) => c.email.toLowerCase() === e.toLowerCase())) err = '이미 추가한 이메일입니다.';
  else if (pm && (pm.status === 'PENDING' || pm.status === 'EXPIRED')) err = '이미 서비스 관리자로 초대한 이메일입니다. 목록에서 초대 재발송을 이용하세요.';
  else if (pm) err = '이미 서비스 관리자(플랫폼 멤버)인 계정입니다.';
  else if (ex && ex.status === 'DISABLED') err = '비활성화된 계정입니다. 계정을 먼저 활성화해주세요.';
  else if (ex && (ex.status === 'INVITED' || ex.status === 'EXPIRED')) err = '아직 가입하지 않은(초대 중인) 계정입니다. 기존 초대를 취소한 뒤 다시 추가해주세요.';
  if (err) { s.err = err; return false; }
  const ms = ex ? membershipsOfUser(ex.id) : [];
  s.chips.push({ email: e, existing: !!ex, orgs: saOrgItems(ms), last: ex ? lastAdminOrgs(ex) : [] }); s.input = ''; s.err = ''; return true;
}
ACT.saRm = (d) => { const s = ovs<SaAddState>(); s.chips = s.chips.filter((c) => c.email !== d.e); refreshOverlay(); };
ACT.saSubmit = () => {
  const s = ovs<SaAddState>(); let direct = 0;
  s.chips.forEach((c) => {
    const ex = ST.accounts.find((a) => a.email.toLowerCase() === c.email.toLowerCase());
    if (ex) { // 가입한 계정: 바로 지정(플랫폼 멤버십 활성) + 조직 소속 해제
      const chg: Change[] = [['플랫폼 멤버십', '-', '활성'], ['역할', '-', ROLES.SERVICE_ADMIN], ...releaseMemberships(ex, '서비스 관리자 추가(플랫폼 멤버십으로 전환)')];
      addPlatformMembership(ex, 'ACTIVE', { addedBy: me().name }); direct++;
      addAudit(null, 'MEMBER', '서비스 관리자 지정', `${ex.name}(${ex.email})`, chg);
    } else { // 신규: 계정 초대 + 플랫폼 멤버십 초대 대기 (유효기간 1일)
      const a = { id: nextId(ST.accounts, 'U-'), name: c.email.split('@')[0], email: c.email, status: 'INVITED' as const, invitedAt: '2026-11-11 10:54', expiresAt: '2026-11-12 10:54' };
      ST.accounts.push(a);
      addPlatformMembership(a, 'PENDING', { invitedBy: me().name, invitedAt: a.invitedAt, expiresAt: a.expiresAt });
      addAudit(null, 'MEMBER', '서비스 관리자 초대', c.email, [['소속', '-', '플랫폼'], ['역할', '-', ROLES.SERVICE_ADMIN], ['초대 만료', '-', a.expiresAt]]);
    }
  });
  const inv = s.chips.length - direct;
  closeOverlay(); render(); toast(`서비스 관리자 ${s.chips.length}명을 추가했습니다.${direct && inv ? ` (바로 지정 ${direct}명 · 초대 ${inv}명)` : inv ? ' 초대 메일을 보냈습니다.' : ''}`);
};
