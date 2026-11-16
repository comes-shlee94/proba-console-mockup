import type { AcctStatus, BadgeDef, MemStatus, OrgStatus, Plan, PlanKey, RoleKey } from '../types';

/* ==========================================================
   목업 데이터 (가상의 조직·사용자 — 실제 고객 데이터 아님)
   기준 시각: 2026-11-11 10:45 (KST)
   ========================================================== */
export const NOW = new Date('2026-11-11T10:45:00+09:00');
export const NOW_KEY = '2026-11-11 10:45'; // 비교용 기준 시각(KST)
export const MONTH_START = '2026-11-01 00:00'; // 진행 중인 달의 시작 — 이전 시점은 마감되어 소급 변경 불가
export const PLATFORM = 'PLATFORM'; // 플랫폼 멤버십의 소속 — 서비스 관리자는 조직이 아니라 플랫폼의 멤버

export const PLANS: Record<PlanKey, Plan> = {
  TRIAL: { label: 'Trial', seats: 10, activityLog: false, feats: ['체험 기간 14일', '멤버 최대 10명'] },
  TEAM: { label: 'Team', seats: 50, activityLog: false, feats: ['멤버 최대 50명'] },
  ENTERPRISE: { label: 'Enterprise', seats: null, activityLog: true, feats: ['멤버 수 제한 없음', '조직 활동 로그 제공'] },
};
export const ORG_STATUS: Record<OrgStatus, BadgeDef> = { ACTIVE: ['운영', 'b-blue'], SUSPENDED: ['정지', 'b-red'], PENDING_DELETION: ['삭제 예정', 'b-gray'] };
export const ACCT_STATUS: Record<AcctStatus, BadgeDef> = { ACTIVE: ['활성', 'b-blue'], INVITED: ['초대 대기', 'b-violet'], EXPIRED: ['초대 만료', 'b-gray'], LOCKED: ['잠김', 'b-amber'], DISABLED: ['비활성', 'b-red'] };
export const MEM_STATUS: Record<MemStatus, BadgeDef> = { ACTIVE: ['활성', 'b-blue'], PENDING: ['초대 대기', 'b-violet'], EXPIRED: ['초대 만료', 'b-gray'], INACTIVE: ['비활성', 'b-red'] };
// 역할 4가지 — 모든 역할은 멤버십(계정 × 소속)에 붙음
//  · 서비스 관리자: 플랫폼 멤버십의 역할. 플랫폼 멤버십이 있는 계정은 어느 조직에도 속하지 않음
//  · 조직 관리자·QA 엔지니어·Viewer: 조직 멤버십마다 하나 — 한 계정이 여러 조직에 소속되면 조직마다 역할이 다를 수 있음
export const ROLES: Record<RoleKey, string> = { SERVICE_ADMIN: '서비스 관리자', ORG_ADMIN: '조직 관리자', QA_ENGINEER: 'QA 엔지니어', VIEWER: 'Viewer' };
export const ORG_ROLES: RoleKey[] = ['ORG_ADMIN', 'QA_ENGINEER', 'VIEWER']; // 조직 멤버십의 역할 (서비스 관리자는 플랫폼 멤버십의 역할이며 관리자 콘솔에서만 지정)
export const ROLE_DESC: Record<RoleKey, string> = {
  SERVICE_ADMIN: '서비스 전체 운영(관리자 콘솔). 플랫폼 멤버십의 역할로 어느 조직에도 속하지 않음. 지정·권한 비활성화·해제는 관리자 콘솔에서만.',
  ORG_ADMIN: '멤버 초대·역할 변경·권한·AI 모델 설정 등 조직 운영 전반. 모든 메뉴·작업 허용(변경 불가).',
  QA_ENGINEER: '테스트 설계·실행·분석 실무. 메뉴·작업 권한은 권한 관리 설정을 따름.',
  VIEWER: '대시보드·이력·결과 조회 중심. 기본값은 조회 전용.',
};
