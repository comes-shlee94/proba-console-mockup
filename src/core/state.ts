/* ==========================================================
   Core: 상태 (원본 "상태" 섹션)
   ========================================================== */
import type { Account, ActionAccess, AuditCat, AuditEntry, Change, MenuAccess, Membership, Model, Org, Persona, PersonaKey, State } from '../types';
import {
  ACTION_CATALOG, MENU_CATALOG, ORG_MODELS, PLANS, PLATFORM,
  accounts, auditSeed, defaultMenuAccess, memberships, models, orgs, syncModel,
} from '../data';
import { clone, ddayOf, nowStr } from './util';

// org: 로그인 직후 선택되는 조직 (서비스 관리자는 플랫폼 멤버라 조직 없음)
export const PERSONAS: Record<PersonaKey, Persona> = {
  sa: { userId: 'U-1', org: null, label: '이서연 · 서비스 관리자 (플랫폼 멤버십)' },
  oa: { userId: 'U-2', org: 'ORG-1', label: '박지훈 · COMES(Enterprise) 조직 관리자' },
  oaTeam: { userId: 'U-12', org: 'ORG-2', label: '김도윤 · 온마켓(Team) 조직 관리자' },
  multi: { userId: 'U-46', org: 'ORG-3', label: '류지안 · 여러 조직 소속 (베리샵 조직 관리자 · 온마켓 QA 엔지니어)' },
  trial: { userId: 'U-41', org: 'ORG-11', label: '송다은 · 바른병원(Trial 만료로 정지) 조직 관리자' },
  qa: { userId: 'U-3', org: 'ORG-1', label: '최현우 · COMES QA 엔지니어 (콘솔 권한 없음)' },
};
/** 현재 선택된 조직 (로그인 사용자 기준 · 워크스페이스 오른쪽 위에서 전환). render()가 매번 다시 계산 */
export let CUR_ORG: string | null = 'ORG-1';
export function setCurOrg(v: string | null) { CUR_ORG = v; }

export let ST: State;
export function initState() {
  const menus: Record<string, MenuAccess> = {};
  MENU_CATALOG.forEach((g) => g.items.forEach(([k]) => (menus[k] = defaultMenuAccess(k))));
  const actions: Record<string, ActionAccess> = {};
  ACTION_CATALOG.forEach((a) => (actions[a.key] = { ...a.def }));
  // COMES 조직의 저장된 커스텀 값 (감사 로그와 일치)
  actions['case.approve'].QA_ENGINEER = true;
  menus['common.datasets'].VIEWER = 'BLOCK';
  ST = {
    persona: 'sa',
    curOrg: {}, // 사용자별로 전환한 조직 (여러 조직 소속 사용자)
    orgs: clone(orgs), accounts: clone(accounts), memberships: clone(memberships), models: (clone(models) as Model[]).map((m) => { syncModel(m); return m; }), orgModels: clone(ORG_MODELS),
    audit: [...auditSeed].sort((a, b) => b.at.localeCompare(a.at)).map((a, i) => ({ id: 'AUD-' + String(20481 - i), ...clone(a) })), auditSeq: 20481, // 최신순
    perms: { 'ORG-1': { menus, actions, updatedAt: '2026-11-10 18:05', updatedBy: '박지훈', version: 7 } },
    ui: {
      orgs: { status: 'ALL', plan: 'ALL', q: '', attn: null, page: 1, size: 20 },
      orgDetail: { tab: 'info' },
      users: { status: 'ALL', org: 'ALL', role: 'ALL', q: '', page: 1, size: 20 },
      models: { provider: 'ALL', q: '' },
      usage: { month: '2026-11', org: 'ALL', plan: 'ALL', metric: 'bill', sort: 'bill' },
      // 감사 로그 직접 입력: from/to = 적용 중인 기간, cFrom/cTo = 입력값(검증 전), cErr = 입력 오류
      audit: { range: '7d', org: 'ALL', cat: 'ALL', result: 'ALL', q: '', page: 1, size: 20, from: '2026-10-12', to: '2026-11-11', cFrom: '2026-10-12', cTo: '2026-11-11', cErr: '' },
      members: { status: 'ALL', role: 'ALL', q: '', page: 1, size: 20 },
      perm: { tab: 'menus', open: { 'AI 품질': true, '공통': true }, draft: null },
      orgUsage: { month: '2026-11' },
      activity: { range: '30d', cat: 'ALL', q: '', page: 1, size: 20, from: '2026-10-12', to: '2026-11-11', cFrom: '2026-10-12', cTo: '2026-11-11', cErr: '' },
    },
  };
}
initState();

/* 원본과 같이 "있다고 가정"하는 조회는 단언 타입으로 돌려줌 (없으면 원본처럼 사용하는 쪽에서 오류) */
export const acct = (id: string | null | undefined) => ST.accounts.find((a) => a.id === id) as Account;
export const orgById = (id: string | null | undefined) => ST.orgs.find((o) => o.id === id) as Org;
// 멤버십 = 계정 × 소속(조직 또는 플랫폼). memOf(PLATFORM, userId)는 플랫폼 멤버십(서비스 관리자)
export const memOf = (orgId: string | null | undefined, userId: string | null | undefined): Membership | undefined => ST.memberships.find((m) => m.orgId === orgId && m.userId === userId);
export const membersOf = (orgId: string | null | undefined) => ST.memberships.filter((m) => m.orgId === orgId);
export const membershipsOfUser = (userId: string) => ST.memberships.filter((m) => m.userId === userId && m.orgId !== PLATFORM); // 조직 멤버십만
export const allMembershipsOf = (userId: string) => ST.memberships.filter((m) => m.userId === userId); // 플랫폼 멤버십 포함
export const me = () => acct(PERSONAS[ST.persona].userId);
export const curOrgOf = (p: PersonaKey): string | null => (p in ST.curOrg ? (ST.curOrg[p] as string) : PERSONAS[p].org);
// 서비스 관리자: 플랫폼 멤버십의 역할. 플랫폼 멤버십이 '활성'이고 계정도 '활성'일 때만 관리자 콘솔 사용
export const platMemOf = (userId: string) => memOf(PLATFORM, userId);
export const isPlatformMember = (a: Account | null | undefined) => !!(a && platMemOf(a.id)); // 상태와 관계없이 플랫폼 멤버십이 있음 (조직에 소속될 수 없음)
export const saActive = (a: Account | null | undefined) => { const m = a && platMemOf(a.id); return !!m && m.status === 'ACTIVE' && a!.status === 'ACTIVE'; };
export const activeSAs = () => membersOf(PLATFORM).filter((m) => m.status === 'ACTIVE' && acct(m.userId)?.status === 'ACTIVE');
export const isSA = () => saActive(me());
export const myMem = () => (CUR_ORG ? memOf(CUR_ORG, me().id) : undefined);
// 조직 관리 권한: 현재 선택한 조직에서의 역할이 조직 관리자일 때만 (역할은 조직마다 다를 수 있음)
export const isOA = () => { const m = myMem(); return !!m && m.status === 'ACTIVE' && m.role === 'ORG_ADMIN'; };
// 조직 상태별 이용 범위: 운영 → 모두 이용 / Trial 만료로 정지 → 조직 관리자만 [조직 정보](플랜 변경) / 그 밖의 정지·삭제 예정 → 모두 차단
export const trialSuspended = (o: Org | null | undefined) => !!o && o.status === 'SUSPENDED' && o.suspendType === 'TRIAL_EXPIRED';
export const canOrgConsole = () => isOA() && (orgById(CUR_ORG).status === 'ACTIVE' || trialSuspended(orgById(CUR_ORG)));
// 새 ID: 삭제된 항목이 있어도 겹치지 않게 가장 큰 번호 + 1
export const nextId = (list: { id: string }[], prefix: string) => prefix + (Math.max(0, ...list.map((x) => Number(String(x.id).split('-')[1]) || 0)) + 1);
export const activeAdmins = (orgId: string) => membersOf(orgId).filter((m) => m.role === 'ORG_ADMIN' && m.status === 'ACTIVE' && acct(m.userId).status === 'ACTIVE');
export const seatsUsed = (orgId: string) => membersOf(orgId).filter((m) => m.status === 'ACTIVE' || m.status === 'PENDING').length;
export const seatLimit = (o: Org) => PLANS[o.plan].seats; // null = 제한 없음(Enterprise)
// 좌석 여유(활성 + 초대 대기 기준 — BR-MEM-04): 초대·초대 재발송(만료 → 대기)·활성화 전에 검사
export const seatsLeft = (orgId: string) => { const lim = seatLimit(orgById(orgId)); return lim == null ? Infinity : lim - seatsUsed(orgId); };
export const seatFullText = (orgId: string) => { const o = orgById(orgId); return `${PLANS[o.plan].label} 플랜 한도 ${seatLimit(o)}명 · 활성 + 초대 대기 ${seatsUsed(orgId)}명`; };
export const seatText = (o: Org) => (seatLimit(o) == null ? '제한 없음' : seatLimit(o) + '명');
export interface OrgFlag { k: string; label: string; tip: string }
export function orgFlags(o: Org): OrgFlag[] {
  const f: OrgFlag[] = [];
  if (o.status !== 'ACTIVE') return f;
  const admins = membersOf(o.id).filter((m) => m.role === 'ORG_ADMIN');
  const act = admins.filter((m) => m.status === 'ACTIVE' && acct(m.userId).status !== 'DISABLED'); // 계정이 비활성이면 관리자로 활동할 수 없음
  const pend = admins.filter((m) => m.status === 'PENDING');
  if (o.plan === 'TRIAL' && o.trialEndsAt && ddayOf(o.trialEndsAt) <= 7) f.push({ k: 'trial', label: 'Trial 만료 임박', tip: `Trial 만료 D-${ddayOf(o.trialEndsAt)} (${o.trialEndsAt})` });
  if (!act.length && pend.length) f.push({ k: 'adminPending', label: '관리자 미가입', tip: '조직 관리자가 아직 초대를 수락하지 않았습니다' });
  if (!act.length && !pend.length) f.push({ k: 'adminMissing', label: '관리자 부재', tip: '활성 조직 관리자가 없습니다 · 조직 관리자를 지정하세요' });
  if (seatLimit(o) != null && seatsUsed(o.id) / seatLimit(o)! >= 0.8) f.push({ k: 'seats', label: '좌석 부족', tip: `좌석 ${seatsUsed(o.id)}/${seatLimit(o)} 사용` });
  return f;
}
export const roleOfActor = (r: string) => (({ SERVICE_ADMIN: '서비스 관리자', ORG_ADMIN: '조직 관리자', QA_ENGINEER: 'QA 엔지니어', VIEWER: 'Viewer', SYSTEM: '시스템' }) as Record<string, string>)[r] || r;

export function addAudit(orgId: string | null, cat: AuditCat, action: string, target: string, changes: Change[] = [], extra: Partial<AuditEntry> = {}) {
  const a = me();
  ST.audit.unshift({ id: 'AUD-' + String(++ST.auditSeq), at: nowStr(), orgId, actor: { name: a.name, email: a.email, role: saActive(a) ? 'SERVICE_ADMIN' : (myMem()?.role || 'VIEWER') }, cat, action, target, result: 'SUCCESS', ip: a.lastLoginIp || '10.20.3.41', ua: 'Chrome 142 / Windows 11', changes, ...extra });
}

// 계정 단위 조치(잠금 해제·계정 비활성화·활성화·계정 초대 재발송·초대 취소)는 그 사용자가 속한 조직마다 같은 시각으로 기록 — 소속된 모든 조직의 활동 로그에 남음.
// 조직 소속이 없으면(서비스 관리자 등) 플랫폼으로 1건
export function addAccountAudit(orgIds: (string | null)[], cat: AuditCat, action: string, target: string, changes: Change[] = [], extra: Partial<AuditEntry> = {}) {
  const ids = [...new Set(orgIds)]; const at = nowStr();
  (ids.length ? ids : [null]).forEach((oid) => addAudit(oid, cat, action, target, changes, { ...extra, at }));
}

export function addSysAudit(orgId: string | null, cat: AuditCat, action: string, target: string, changes: Change[] = [], extra: Partial<AuditEntry> = {}) {
  ST.audit.unshift({ id: 'AUD-' + String(++ST.auditSeq), at: nowStr(), orgId, actor: { name: '시스템', email: '-', role: 'SYSTEM' }, cat, action, target, result: 'SUCCESS', ip: null, ua: null, changes, ...extra });
}
