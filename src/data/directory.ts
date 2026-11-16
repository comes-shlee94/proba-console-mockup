import type { Account, AcctStatus, MemStatus, Membership, Org, RoleKey } from '../types';
import { PLATFORM } from './constants';

// [id, 이름, 이메일, 계정상태, 최근로그인, 가입일, 추가정보]
type AcctRow = [string, string, string, AcctStatus, string | null, string | null, Partial<Account>?];
// [소속, 사용자, 역할, 멤버상태, 가입/초대일, 비고]
type MemRow = [string, string, RoleKey, MemStatus, string, Partial<Membership>?];

export const orgs: Org[] = [
  { id: 'ORG-1', name: 'COMES', plan: 'ENTERPRISE', status: 'ACTIVE', createdAt: '2026-03-02', createdBy: '이서연', memo: '운영사 내부 QA 조직' },
  { id: 'ORG-2', name: '온마켓', plan: 'TEAM', status: 'ACTIVE', createdAt: '2026-05-14', createdBy: '이서연', memo: '' },
  { id: 'ORG-3', name: '베리샵', plan: 'TEAM', status: 'ACTIVE', createdAt: '2026-05-20', createdBy: '이서연', memo: '' },
  { id: 'ORG-4', name: '가람은행', plan: 'ENTERPRISE', status: 'ACTIVE', createdAt: '2026-06-03', createdBy: '한지민', memo: '보안 심사 완료(2026-06)' },
  { id: 'ORG-5', name: '새솔시청', plan: 'TEAM', status: 'ACTIVE', createdAt: '2026-07-01', createdBy: '이서연', memo: '' },
  { id: 'ORG-6', name: '도담케어', plan: 'TRIAL', status: 'ACTIVE', createdAt: '2026-10-17', createdBy: '이서연', trialEndsAt: '2026-11-16', memo: 'PoC 진행 중' },
  { id: 'ORG-7', name: '대전관광공사', plan: 'TRIAL', status: 'ACTIVE', createdAt: '2026-11-10', createdBy: '한지민', trialEndsAt: '2026-11-24', memo: '' },
  { id: 'ORG-8', name: '한빛증권', plan: 'ENTERPRISE', status: 'SUSPENDED', createdAt: '2026-06-20', createdBy: '한지민', suspendedAt: '2026-11-02 09:00', suspendReason: '계약 갱신 대기', suspendedBy: '한지민', memo: '' },
  { id: 'ORG-9', name: '누리교육', plan: 'TEAM', status: 'PENDING_DELETION', createdAt: '2026-07-15', createdBy: '이서연', deleteRequestedAt: '2026-11-05 10:00', purgeAt: '2026-12-05', deleteReason: '고객 요청(서비스 해지)', deletedBy: '이서연', memo: '' },
  { id: 'ORG-10', name: '미르모빌리티', plan: 'TEAM', status: 'ACTIVE', createdAt: '2026-08-04', createdBy: '이서연', memo: '' },
  // Trial 만료로 자동 정지된 조직: 조직 관리자는 [조직 정보]만 열 수 있고, Team·Enterprise로 플랜을 바꾸면 바로 정지 해제
  { id: 'ORG-11', name: '바른병원', plan: 'TRIAL', status: 'SUSPENDED', suspendType: 'TRIAL_EXPIRED', createdAt: '2026-10-27', createdBy: '한지민', trialEndsAt: '2026-11-10', suspendedAt: '2026-11-11 00:00', suspendReason: 'Trial 만료', suspendedBy: '시스템', memo: '외래 예약 챗봇 PoC' },
  { id: 'ORG-12', name: '소담푸드', plan: 'TEAM', status: 'ACTIVE', createdAt: '2026-09-10', createdBy: '이서연', memo: '' },
];

// [id, 이름, 이메일, 계정상태, 최근로그인, 가입일, 추가정보] — 역할은 계정이 아니라 멤버십(플랫폼·조직)에 있음
const ACCOUNT_ROWS: AcctRow[] = [
  ['U-1', '이서연', 'admin.lee@comes.co.kr', 'ACTIVE', '2026-11-11 10:42', '2026-03-02'],
  ['U-2', '박지훈', 'ops.park@comes.co.kr', 'ACTIVE', '2026-11-10 18:20', '2026-03-02'],
  ['U-3', '최현우', 'qa.choi@comes.co.kr', 'ACTIVE', '2026-11-11 09:15', '2026-03-05'],
  ['U-4', '김민서', 'minseo.kim@comes.co.kr', 'ACTIVE', '2026-11-11 08:51', '2026-04-11'],
  ['U-5', '정우진', 'woojin.jung@comes.co.kr', 'ACTIVE', '2026-11-07 16:03', '2026-04-11'],
  ['U-6', '한지민', 'sec.han@comes.co.kr', 'ACTIVE', '2026-11-09 11:30', '2026-03-02'],
  ['U-7', '오지호', 'jiho.oh@comes.co.kr', 'ACTIVE', '2026-10-27 17:48', '2026-05-02'],
  ['U-8', '윤서아', 'seoa.yoon@comes.co.kr', 'INVITED', null, null, { invitedAt: '2026-11-10 14:10', expiresAt: '2026-11-11 14:10' }],
  ['U-9', '장태윤', 'taeyun.jang@comes.co.kr', 'INVITED', null, null, { invitedAt: '2026-11-11 09:30', expiresAt: '2026-11-12 09:30' }],
  ['U-10', '신예준', 'yejun.shin@comes.co.kr', 'EXPIRED', null, null, { invitedAt: '2026-11-01 10:00', expiresAt: '2026-11-02 10:00' }],
  ['U-11', '정다인', 'platform.jung@comes.co.kr', 'INVITED', null, null, { invitedAt: '2026-11-10 16:00', expiresAt: '2026-11-11 16:00' }],
  ['U-12', '김도윤', 'doyun.kim@onmarket.example', 'ACTIVE', '2026-11-11 09:02', '2026-05-14'],
  ['U-13', '이하준', 'hajun.lee@onmarket.example', 'ACTIVE', '2026-11-10 15:37', '2026-05-15'],
  ['U-14', '박서준', 'seojun.park@onmarket.example', 'LOCKED', '2026-11-06 11:20', '2026-05-15', { lockedAt: '2026-11-11 10:38', lockReason: '로그인 5회 연속 실패', failCount: 5, unlockAt: '2026-11-11 11:08' }],
  ['U-15', '서민지', 'minji.seo@onmarket.example', 'ACTIVE', '2026-11-04 10:11', '2026-06-02'],
  ['U-16', '고은채', 'eunchae.ko@onmarket.example', 'INVITED', null, null, { invitedAt: '2026-11-11 08:40', expiresAt: '2026-11-12 08:40' }],
  ['U-17', '최유진', 'yujin.choi@berryshop.example', 'ACTIVE', '2026-11-10 13:05', '2026-05-20'],
  ['U-18', '장예린', 'yerin.jang@berryshop.example', 'ACTIVE', '2026-10-29 18:00', '2026-05-21'],
  ['U-19', '남궁현', 'hyun.namgung@berryshop.example', 'ACTIVE', '2026-11-09 09:41', '2026-06-11'],
  ['U-20', '정민호', 'minho.jung@garambank.example', 'ACTIVE', '2026-11-11 08:12', '2026-06-03'],
  ['U-21', '한소희', 'sohee.han@garambank.example', 'ACTIVE', '2026-11-10 19:22', '2026-06-03'],
  ['U-22', '조은비', 'eunbi.jo@garambank.example', 'LOCKED', '2026-11-08 14:03', '2026-06-05', { lockedAt: '2026-11-11 10:31', lockReason: '로그인 5회 연속 실패', failCount: 5, unlockAt: '2026-11-11 11:01' }],
  ['U-23', '류시우', 'siwoo.ryu@garambank.example', 'ACTIVE', '2026-11-11 07:58', '2026-06-05'],
  ['U-24', '배수빈', 'subin.bae@garambank.example', 'ACTIVE', '2026-11-03 10:30', '2026-07-20'],
  ['U-25', '오준석', 'junseok.oh@saesol.example', 'ACTIVE', '2026-11-10 10:10', '2026-07-01'],
  ['U-26', '홍지아', 'jia.hong@saesol.example', 'ACTIVE', '2026-11-10 11:45', '2026-07-02'],
  ['U-27', '김태현', 'taehyun.kim@saesol.example', 'ACTIVE', '2026-11-07 15:20', '2026-07-02'],
  ['U-28', '윤하늘', 'haneul.yoon@dodamcare.example', 'ACTIVE', '2026-11-11 10:05', '2026-10-17'],
  ['U-29', '차민혁', 'minhyuk.cha@dodamcare.example', 'ACTIVE', '2026-11-10 17:44', '2026-10-18'],
  ['U-30', '표서윤', 'seoyun.pyo@dodamcare.example', 'ACTIVE', '2026-11-09 13:30', '2026-10-18'],
  ['U-31', '하도현', 'dohyun.ha@dodamcare.example', 'ACTIVE', '2026-11-05 09:00', '2026-10-20'],
  ['U-32', '강민재', 'minjae.kang@djtour.example', 'INVITED', null, null, { invitedAt: '2026-11-10 15:20', expiresAt: '2026-11-11 15:20' }],
  ['U-33', '서지원', 'jiwon.seo@hanbit-sec.example', 'ACTIVE', '2026-11-01 17:30', '2026-06-20'],
  ['U-34', '엄지성', 'jisung.eom@hanbit-sec.example', 'DISABLED', '2026-10-30 12:00', '2026-06-21', { disabledAt: '2026-10-31 09:10', disableReason: '보안 이슈', disableDetail: '정기 보안 점검에서 계정 공유 정황 확인 · 본인 확인 후 재활성화 예정' }],
  ['U-35', '육하린', 'harin.yook@hanbit-sec.example', 'ACTIVE', '2026-11-01 16:10', '2026-06-21'],
  ['U-36', '임채원', 'chaewon.lim@nuri-edu.example', 'ACTIVE', '2026-11-04 09:30', '2026-07-15'],
  ['U-37', '탁민준', 'minjun.tak@nuri-edu.example', 'ACTIVE', '2026-11-03 14:00', '2026-07-16'],
  ['U-38', '백승우', 'seungwoo.baek@mir-mobility.example', 'DISABLED', '2026-10-20 10:00', '2026-08-04', { disabledAt: '2026-11-03 18:00', disableReason: '퇴사·계약 종료', disableDetail: '고객사 공문 요청(2026-11-03)' }],
  ['U-39', '노유나', 'yuna.noh@mir-mobility.example', 'ACTIVE', '2026-11-10 16:20', '2026-08-05'],
  ['U-40', '변재희', 'jaehee.byun@mir-mobility.example', 'ACTIVE', '2026-11-08 11:11', '2026-08-05'],
  ['U-41', '송다은', 'daeun.song@bareun.example', 'ACTIVE', '2026-11-10 09:20', '2026-10-27'],
  ['U-42', '기하율', 'hayul.ki@bareun.example', 'ACTIVE', '2026-11-06 15:00', '2026-10-28'],
  ['U-43', '문태호', 'taeho.moon@sodam.example', 'ACTIVE', '2026-11-09 18:30', '2026-09-10'],
  ['U-44', '권나연', 'nayeon.kwon@sodam.example', 'EXPIRED', null, null, { invitedAt: '2026-10-27 15:00', expiresAt: '2026-10-28 15:00' }],
  ['U-45', '설지호', 'jiho.seol@sodam.example', 'ACTIVE', '2026-11-02 10:40', '2026-09-11'],
  // 여러 조직 소속 예시: QA 대행사 컨설턴트 — 베리샵 조직 관리자 + 온마켓 QA 엔지니어
  ['U-46', '류지안', 'jian.ryu@qa-partners.example', 'ACTIVE', '2026-11-11 09:48', '2026-07-08'],
  // 서비스 관리자 권한만 비활성(휴직) — 계정은 활성
  ['U-47', '남도현', 'dohyun.nam@comes.co.kr', 'ACTIVE', '2026-10-31 17:40', '2026-03-02'],
];
export const accounts: Account[] = ACCOUNT_ROWS.map(([id, name, email, status, lastLoginAt, joinedAt, extra], i) => ({ id, name, email, status, lastLoginAt, joinedAt, lastLoginIp: lastLoginAt ? ipFor(email, i) : null, ...(extra || {}) }));
// 최근 접속 IP (예시: 사내 10.x, 외부는 문서용 예시 대역 203.0.113.x / 198.51.100.x)
function ipFor(email: string, i: number): string { return email.endsWith('@comes.co.kr') ? `10.20.${(i % 6) + 3}.${(i * 17) % 200 + 21}` : `${i % 2 ? '203.0.113' : '198.51.100'}.${(i * 23) % 200 + 14}`; }

// [소속, 사용자, 역할, 멤버상태, 가입/초대일, 비고]
//  · 조직 멤버십: 소속 = 조직 ID, 역할 = 조직 관리자·QA 엔지니어·Viewer 중 하나 (한 계정이 여러 조직에 소속 가능)
//  · 플랫폼 멤버십: 소속 = PLATFORM, 역할 = 서비스 관리자 — 플랫폼 멤버십이 있는 계정은 조직 멤버십을 가질 수 없음
//  · null: 예전에 쓰던 자리 (멤버십 ID를 유지하기 위해 비워 둠)
const MEMBERSHIP_ROWS: (MemRow | null)[] = [
  [PLATFORM, 'U-1', 'SERVICE_ADMIN', 'ACTIVE', '2026-03-02'],
  ['ORG-1', 'U-2', 'ORG_ADMIN', 'ACTIVE', '2026-03-02'],
  ['ORG-1', 'U-3', 'QA_ENGINEER', 'ACTIVE', '2026-03-05'],
  ['ORG-1', 'U-4', 'QA_ENGINEER', 'ACTIVE', '2026-04-11'],
  ['ORG-1', 'U-5', 'QA_ENGINEER', 'ACTIVE', '2026-04-11'],
  [PLATFORM, 'U-6', 'SERVICE_ADMIN', 'ACTIVE', '2026-03-02'],
  ['ORG-1', 'U-7', 'QA_ENGINEER', 'INACTIVE', '2026-05-02', { inactiveAt: '2026-10-28 11:00', inactiveBy: '박지훈', inactiveReason: '휴직·장기 부재', inactiveDetail: '2026-11 ~ 2027-01 휴직 · 복직 후 다시 활성화' }],
  ['ORG-1', 'U-8', 'VIEWER', 'PENDING', '2026-11-10', { invitedBy: '박지훈', invitedAt: '2026-11-10 14:10', expiresAt: '2026-11-11 14:10' }],
  ['ORG-1', 'U-9', 'QA_ENGINEER', 'PENDING', '2026-11-11', { invitedBy: '박지훈', invitedAt: '2026-11-11 09:30', expiresAt: '2026-11-12 09:30' }],
  ['ORG-1', 'U-10', 'VIEWER', 'EXPIRED', '2026-11-01', { invitedBy: '박지훈', invitedAt: '2026-11-01 10:00', expiresAt: '2026-11-02 10:00' }],
  ['ORG-2', 'U-12', 'ORG_ADMIN', 'ACTIVE', '2026-05-14'],
  ['ORG-2', 'U-13', 'QA_ENGINEER', 'ACTIVE', '2026-05-15'],
  ['ORG-2', 'U-14', 'QA_ENGINEER', 'ACTIVE', '2026-05-15'],
  ['ORG-2', 'U-15', 'VIEWER', 'ACTIVE', '2026-06-02'],
  ['ORG-2', 'U-16', 'QA_ENGINEER', 'PENDING', '2026-11-11', { invitedBy: '김도윤', invitedAt: '2026-11-11 08:40', expiresAt: '2026-11-12 08:40' }],
  ['ORG-3', 'U-17', 'ORG_ADMIN', 'ACTIVE', '2026-05-20'],
  ['ORG-3', 'U-18', 'QA_ENGINEER', 'INACTIVE', '2026-05-21', { inactiveAt: '2026-10-30 10:00', inactiveBy: '최유진', inactiveReason: '업무 변경·프로젝트 종료' }],
  ['ORG-3', 'U-13', 'VIEWER', 'ACTIVE', '2026-08-19'],
  ['ORG-3', 'U-19', 'QA_ENGINEER', 'ACTIVE', '2026-06-11'],
  ['ORG-4', 'U-20', 'ORG_ADMIN', 'ACTIVE', '2026-06-03'],
  ['ORG-4', 'U-21', 'ORG_ADMIN', 'ACTIVE', '2026-06-03'],
  ['ORG-4', 'U-22', 'QA_ENGINEER', 'ACTIVE', '2026-06-05'],
  ['ORG-4', 'U-23', 'QA_ENGINEER', 'ACTIVE', '2026-06-05'],
  ['ORG-4', 'U-24', 'VIEWER', 'ACTIVE', '2026-07-20'],
  ['ORG-5', 'U-25', 'ORG_ADMIN', 'ACTIVE', '2026-07-01'],
  ['ORG-5', 'U-26', 'QA_ENGINEER', 'ACTIVE', '2026-07-02'],
  ['ORG-5', 'U-27', 'QA_ENGINEER', 'ACTIVE', '2026-07-02'],
  ['ORG-6', 'U-28', 'ORG_ADMIN', 'ACTIVE', '2026-10-17'],
  ['ORG-6', 'U-29', 'QA_ENGINEER', 'ACTIVE', '2026-10-18'],
  ['ORG-6', 'U-30', 'QA_ENGINEER', 'ACTIVE', '2026-10-18'],
  ['ORG-6', 'U-31', 'VIEWER', 'ACTIVE', '2026-10-20'],
  ['ORG-7', 'U-32', 'ORG_ADMIN', 'PENDING', '2026-11-10', { invitedBy: '한지민', invitedAt: '2026-11-10 15:20', expiresAt: '2026-11-11 15:20' }],
  ['ORG-8', 'U-33', 'ORG_ADMIN', 'ACTIVE', '2026-06-20'],
  ['ORG-8', 'U-34', 'QA_ENGINEER', 'ACTIVE', '2026-06-21'],
  ['ORG-8', 'U-35', 'QA_ENGINEER', 'ACTIVE', '2026-06-21'],
  ['ORG-9', 'U-36', 'ORG_ADMIN', 'ACTIVE', '2026-07-15'],
  ['ORG-9', 'U-37', 'QA_ENGINEER', 'ACTIVE', '2026-07-16'],
  ['ORG-10', 'U-38', 'ORG_ADMIN', 'ACTIVE', '2026-08-04'], // 계정이 비활성(퇴사)이라 활성 조직 관리자 없음 → '관리자 부재'
  ['ORG-10', 'U-39', 'QA_ENGINEER', 'ACTIVE', '2026-08-05'],
  ['ORG-10', 'U-40', 'QA_ENGINEER', 'ACTIVE', '2026-08-05'],
  ['ORG-11', 'U-41', 'ORG_ADMIN', 'ACTIVE', '2026-10-27'],
  ['ORG-11', 'U-42', 'QA_ENGINEER', 'ACTIVE', '2026-10-28'],
  ['ORG-12', 'U-43', 'ORG_ADMIN', 'ACTIVE', '2026-09-10'],
  ['ORG-12', 'U-44', 'VIEWER', 'EXPIRED', '2026-10-27', { invitedBy: '문태호', invitedAt: '2026-10-27 15:00', expiresAt: '2026-10-28 15:00' }],
  ['ORG-12', 'U-45', 'QA_ENGINEER', 'ACTIVE', '2026-09-11'],
  [PLATFORM, 'U-11', 'SERVICE_ADMIN', 'PENDING', '2026-11-10', { invitedBy: '이서연', invitedAt: '2026-11-10 16:00', expiresAt: '2026-11-11 16:00' }],
  ['ORG-3', 'U-46', 'ORG_ADMIN', 'ACTIVE', '2026-07-08'],
  ['ORG-2', 'U-46', 'QA_ENGINEER', 'ACTIVE', '2026-09-01'],
  [PLATFORM, 'U-47', 'SERVICE_ADMIN', 'INACTIVE', '2026-03-02', { inactiveAt: '2026-10-31 18:00', inactiveBy: '이서연', inactiveReason: '육아휴직 (2026-11 ~ 2027-04)' }],
];
export const memberships: Membership[] = MEMBERSHIP_ROWS.map((r, i) => r && (([orgId, userId, role, status, since, extra]: MemRow): Membership => ({ id: 'MB-' + (i + 1), orgId, userId, role, status, since, ...(extra || {}) }))(r)).filter((m): m is Membership => Boolean(m));
