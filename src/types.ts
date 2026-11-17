/* ==========================================================
   도메인 타입 — 원본 프로토타입(PROBA_관리자콘솔_프로토타입.html)의 목업 데이터 구조
   ========================================================== */

export type PlanKey = 'TRIAL' | 'TEAM' | 'ENTERPRISE';
export type OrgStatus = 'ACTIVE' | 'SUSPENDED' | 'PENDING_DELETION';
export type AcctStatus = 'ACTIVE' | 'INVITED' | 'EXPIRED' | 'LOCKED' | 'DISABLED';
export type MemStatus = 'ACTIVE' | 'PENDING' | 'EXPIRED' | 'INACTIVE';
export type RoleKey = 'SERVICE_ADMIN' | 'ORG_ADMIN' | 'QA_ENGINEER' | 'VIEWER';
export type ActorRole = RoleKey | 'SYSTEM';
export type Access = 'ALLOW' | 'READ' | 'BLOCK';
export type PersonaKey = 'sa' | 'oa' | 'oaTeam' | 'multi' | 'trial' | 'qa';
/** [표시 문구, 배지 클래스] */
export type BadgeDef = [string, string];

export interface Plan {
  label: string;
  seats: number | null;
  activityLog: boolean;
  feats: string[];
}

export interface Org {
  id: string;
  name: string;
  plan: PlanKey;
  status: OrgStatus;
  createdAt: string;
  createdBy: string;
  memo: string;
  trialEndsAt?: string;
  suspendType?: string;
  suspendedAt?: string;
  suspendReason?: string;
  suspendedBy?: string;
  deleteRequestedAt?: string;
  purgeAt?: string;
  deleteReason?: string;
  deletedBy?: string;
}

export interface Account {
  id: string;
  name: string;
  email: string;
  status: AcctStatus;
  lastLoginAt?: string | null;
  joinedAt?: string | null;
  lastLoginIp?: string | null;
  invitedAt?: string;
  expiresAt?: string;
  lockedAt?: string;
  lockReason?: string;
  failCount?: number;
  unlockAt?: string | null;
  disabledAt?: string;
  disableReason?: string;
  disableDetail?: string;
}

export interface Membership {
  id: string;
  /** 조직 ID 또는 PLATFORM */
  orgId: string;
  userId: string;
  role: RoleKey;
  status: MemStatus;
  since: string;
  invitedBy?: string;
  invitedAt?: string;
  expiresAt?: string;
  inactiveAt?: string;
  inactiveBy?: string;
  inactiveReason?: string;
  inactiveDetail?: string;
  addedBy?: string;
}

export interface Persona {
  userId: string;
  org: string | null;
  label: string;
}

/* ---------- AI 모델 ---------- */
export type PriceKey = 'in' | 'out' | 'cw' | 'cr';
export type TierKey = 'short' | 'long';
/** USD / 1M 토큰. null = 별도 단가 없음 */
export type Px = { in: number | null; out: number | null; cw: number | null; cr: number | null };
export type TierPrice = { short?: Px; long?: Px };

export interface PriceVersion {
  id: string;
  from: string;
  tiered: boolean;
  threshold: number | null;
  price: TierPrice;
  note: string;
  by: string;
  canceled?: boolean;
  createdAt?: string;
}

export interface Promo {
  id: string;
  title: string;
  from: string;
  to: string;
  hours: [string, string] | null;
  mode: string;
  price?: TierPrice;
  rate?: number;
  items?: PriceKey[];
  note: string;
  by: string;
  createdAt: string;
  canceled?: boolean;
  endedAt?: string;
}

export interface Model {
  id: string;
  name: string;
  label: string;
  provider: string;
  context: number | null;
  /** 최대 출력 토큰(공급자 문서의 출력 한도) · 없으면 null — v0.16 */
  maxOutput?: number | null;
  active: boolean;
  isDefault: boolean;
  activePlans: number;
  schedules: number;
  createdAt: string;
  hasHistory: boolean;
  deactivatedAt?: string | null;
  retiresAt?: string | null;
  versions: PriceVersion[];
  promos: Promo[];
  /* syncModel()이 채우는 현재 시점 기본 단가 */
  tiered: boolean;
  threshold: number | null;
  price: TierPrice;
}

/** 목업 원본 데이터 — tiered·threshold·price는 initState()에서 syncModel()로 채움 */
export type ModelSeed = Omit<Model, 'tiered' | 'threshold' | 'price'>;

export interface OrgModelSet {
  on: string[];
  def: string;
  plans: Record<string, number>;
}

/* ---------- 사용량 ---------- */
export interface UsageRec {
  lqa: [number, number];
  fqa: [number, number];
  load: [number, number];
  app: [number, number];
  llm: Record<string, number>;
}

export interface MonthDef {
  key: string;
  label: string;
  status: 'OPEN' | 'CLOSED';
  note: string;
}

/* ---------- 메뉴 · 권한 ---------- */
/** [메뉴 키, 메뉴명, 경로] */
export type MenuItemDef = [string, string, string];
export interface MenuGroup {
  group: string;
  items: MenuItemDef[];
}
export interface MenuAccess {
  QA_ENGINEER: Access;
  VIEWER: Access;
}
export interface ActionAccess {
  QA_ENGINEER: boolean;
  VIEWER: boolean;
}
export interface ActionDef {
  key: string;
  label: string;
  desc: [string, string];
  need: string[];
  level: 'ALLOW' | 'READ';
  def: ActionAccess;
  req: string;
}
export interface PermDraft {
  menus: Record<string, MenuAccess>;
  actions: Record<string, ActionAccess>;
}
export interface Perms extends PermDraft {
  updatedAt?: string;
  updatedBy?: string;
  version?: number;
}

/* ---------- 감사 로그 ---------- */
export type AuditCat = 'AUTH' | 'ORG' | 'MEMBER' | 'PERM' | 'ACCOUNT' | 'MODEL' | 'EXEC' | 'DATA' | 'EXPORT' | 'SUPPORT' | 'SETTING';
export interface Actor {
  name: string;
  email: string;
  role: ActorRole;
}
/** [항목, 변경 전, 변경 후] */
export type Change = [string, string, string];
export interface AuditEntry {
  id: string;
  at: string;
  orgId: string | null;
  actor: Actor;
  cat: AuditCat;
  action: string;
  target: string;
  result: 'SUCCESS' | 'FAILURE';
  ip: string | null;
  ua: string | null;
  changes?: Change[];
  reason?: string;
}
export type AuditSeed = Omit<AuditEntry, 'id'>;

/* ---------- 화면 상태 ---------- */
export interface RangeFilter {
  range: string;
  from: string;
  to: string;
  cFrom: string;
  cTo: string;
  cErr: string;
}

export interface UiState {
  orgs: { status: string; plan: string; q: string; attn: string | null; page: number; size: number };
  orgDetail: { tab: string };
  users: { status: string; org: string; role: string; q: string; page: number; size: number };
  models: { provider: string; q: string; page: number; size: number };
  usage: { month: string; org: string; plan: string; metric: string; sort: string };
  audit: RangeFilter & { org: string; cat: string; result: string; q: string; page: number; size: number };
  members: { status: string; role: string; q: string; page: number; size: number };
  perm: { tab: string; open: Record<string, boolean>; draft: PermDraft | null };
  orgUsage: { month: string };
  /** v0.18: 조직 AI 모델(OA-40) 검색·공급자·페이지 */
  orgModels: { provider: string; q: string; page: number; size: number };
  activity: RangeFilter & { cat: string; q: string; page: number; size: number };
}

export interface State {
  persona: PersonaKey;
  /** 사용자별로 전환한 조직 (여러 조직 소속 사용자) */
  curOrg: Partial<Record<PersonaKey, string>>;
  orgs: Org[];
  accounts: Account[];
  memberships: Membership[];
  models: Model[];
  orgModels: Record<string, OrgModelSet>;
  audit: AuditEntry[];
  auditSeq: number;
  perms: Record<string, Perms>;
  ui: UiState;
}
