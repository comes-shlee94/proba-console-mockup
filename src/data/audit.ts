import type { Actor, ActorRole, AuditCat, AuditSeed } from '../types';

/* ---------------- 감사 로그 ---------------- */
export const AUDIT_CATS: Record<AuditCat, string> = { AUTH: '인증', ORG: '조직', MEMBER: '멤버', PERM: '권한', ACCOUNT: '계정', MODEL: 'AI 모델', EXEC: '실행', DATA: '데이터', EXPORT: '내보내기', SUPPORT: '지원 접속', SETTING: '설정' };
// 접속 정보(IP · User-Agent): 사내는 10.x, 외부는 문서용 예시 대역(203.0.113.x). 시스템 자동 처리 건은 접속 정보 없음
export const A = (at: string, orgId: string | null, actor: Actor, cat: AuditCat, action: string, target: string, extra: Partial<AuditSeed> = {}): AuditSeed => ({
  at, orgId, actor, cat, action, target, result: 'SUCCESS',
  ip: actor.role === 'SYSTEM' ? null : actor.email.endsWith('@comes.co.kr') ? '10.20.3.' + (at.charCodeAt(15) % 90 + 10) : '203.0.113.' + (at.charCodeAt(15) % 90 + 40),
  ua: actor.role === 'SYSTEM' ? null : 'Chrome 142 / Windows 11', ...extra,
});
export const SYS: Actor = { name: '시스템', email: '-', role: 'SYSTEM' };
export const P = (name: string, email: string, role: ActorRole): Actor => ({ name, email, role });
export const actLee = P('이서연', 'admin.lee@comes.co.kr', 'SERVICE_ADMIN');
export const actHan = P('한지민', 'sec.han@comes.co.kr', 'SERVICE_ADMIN');
export const actPark = P('박지훈', 'ops.park@comes.co.kr', 'ORG_ADMIN');
export const actKim = P('김도윤', 'doyun.kim@onmarket.example', 'ORG_ADMIN');
export const actChoi = P('최현우', 'qa.choi@comes.co.kr', 'QA_ENGINEER');
export const auditSeed: AuditSeed[] = [
  A('2026-11-11 10:42:08', null, actLee, 'AUTH', '로그인 성공', '이서연(admin.lee@comes.co.kr)'),
  A('2026-11-11 10:38:12', 'ORG-2', SYS, 'AUTH', '계정 잠김', '박서준(seojun.park@onmarket.example)', { changes: [['계정 상태', '활성', '잠김'], ['로그인 실패 횟수', '4', '5'], ['자동 해제 예정', '-', '2026-11-11 11:08']], reason: '로그인 5회 연속 실패' }),
  A('2026-11-11 10:37:40', 'ORG-2', P('박서준', 'seojun.park@onmarket.example', 'QA_ENGINEER'), 'AUTH', '로그인 실패', '박서준(seojun.park@onmarket.example)', { result: 'FAILURE', reason: '비밀번호 불일치 (5/5)' }),
  A('2026-11-11 10:31:44', 'ORG-1', actChoi, 'EXEC', '실행 요청', '고객 상담 챗봇 정기 평가 #R-2611-031'),
  A('2026-11-11 10:31:05', 'ORG-4', SYS, 'AUTH', '계정 잠김', '조은비(eunbi.jo@garambank.example)', { changes: [['계정 상태', '활성', '잠김'], ['자동 해제 예정', '-', '2026-11-11 11:01']], reason: '로그인 5회 연속 실패' }),
  A('2026-11-11 09:30:02', 'ORG-1', actPark, 'MEMBER', '멤버 초대', '장태윤(taeyun.jang@comes.co.kr)', { changes: [['역할', '-', 'QA 엔지니어'], ['초대 만료', '-', '2026-11-12 09:30']] }),
  A('2026-11-11 08:40:31', 'ORG-2', actKim, 'MEMBER', '멤버 초대', '고은채(eunchae.ko@onmarket.example)', { changes: [['역할', '-', 'QA 엔지니어'], ['초대 만료', '-', '2026-11-12 08:40']] }),
  A('2026-11-10 18:05:51', 'ORG-1', actPark, 'PERM', '작업 권한 변경', 'QA 엔지니어 · 테스트케이스 승인·반려', { changes: [['QA 엔지니어', '차단', '허용']] }),
  A('2026-11-10 09:12:30', null, actLee, 'MODEL', '모델 정보 수정', 'gpt-5-nano', { changes: [['공급자 지원 종료일', '-', '2026-12-11']], reason: 'OpenAI 지원 종료(deprecation) 일정 반영' }),
  A('2026-11-10 16:00:10', null, actLee, 'MEMBER', '서비스 관리자 초대', '정다인(platform.jung@comes.co.kr)', { changes: [['소속', '-', '플랫폼'], ['역할', '-', '서비스 관리자'], ['초대 만료', '-', '2026-11-11 16:00']] }),
  A('2026-11-11 00:00:03', 'ORG-11', SYS, 'ORG', '조직 정지', '바른병원', { changes: [['조직 상태', '운영', '정지'], ['정지 유형', '-', 'Trial 만료(자동)']], reason: 'Trial 만료 (만료일 2026-11-10)' }),
  A('2026-10-31 18:00:05', null, actLee, 'MEMBER', '서비스 관리자 권한 비활성화', '남도현(dohyun.nam@comes.co.kr)', { changes: [['멤버 상태', '활성', '비활성']], reason: '육아휴직 (2026-11 ~ 2027-04)' }),
  A('2026-10-27 10:12:40', 'ORG-11', actHan, 'ORG', '조직 생성', '바른병원', { changes: [['플랜', '-', 'Trial'], ['Trial 만료일', '-', '2026-11-10'], ['조직 관리자 초대', '-', 'daeun.song@bareun.example']] }),
  A('2026-11-10 15:20:13', 'ORG-7', actHan, 'ORG', '조직 생성', '대전관광공사', { changes: [['플랜', '-', 'Trial'], ['Trial 만료일', '-', '2026-11-24'], ['조직 관리자 초대', '-', 'minjae.kang@djtour.example']] }),
  A('2026-11-10 14:22:37', 'ORG-4', P('정민호', 'minho.jung@garambank.example', 'ORG_ADMIN'), 'DATA', '평가 계획 삭제', '[구] 대출 상담 평가 v1'),
  A('2026-11-10 14:10:44', 'ORG-1', actPark, 'MEMBER', '멤버 초대', '윤서아(seoa.yoon@comes.co.kr)', { changes: [['역할', '-', 'Viewer'], ['초대 만료', '-', '2026-11-11 14:10']] }),
  A('2026-11-10 11:12:09', 'ORG-3', actLee, 'SUPPORT', '조직 지원 접속', '베리샵 워크스페이스(조회 전용)', { reason: '고객 문의 #CS-2211 확인' }),
  A('2026-11-09 16:48:20', null, actLee, 'MODEL', '모델 비활성화', 'gpt-4o', { changes: [['활성', '예', '아니오'], ['대체 모델', '-', 'claude-haiku-5-5 (평가 계획 3건 전환)']] }),
  A('2026-11-09 10:05:40', 'ORG-1', actPark, 'MODEL', '조직 모델 사용 설정', 'gemini-3.1-pro-preview', { changes: [['사용', '아니오', '예']] }),
  A('2026-11-08 14:22:05', 'ORG-1', actPark, 'PERM', '메뉴 권한 변경', 'Viewer · 데이터셋 외 1건', { changes: [['Viewer · 데이터셋', '조회', '차단'], ['Viewer · 리포트·알림', '허용', '조회']] }),
  A('2026-11-07 17:20:42', null, actLee, 'EXPORT', '사용량 내보내기', '2026년 10월 · 전체 조직', { changes: [['파일', '-', 'proba_usage_2026-10.xlsx (12개 조직)']] }),
  A('2026-11-06 15:03:18', 'ORG-4', P('한소희', 'sohee.han@garambank.example', 'ORG_ADMIN'), 'MEMBER', '역할 변경', '류시우(siwoo.ryu@garambank.example)', { changes: [['역할', 'Viewer', 'QA 엔지니어']] }),
  A('2026-11-06 09:12:55', 'ORG-12', P('문태호', 'taeho.moon@sodam.example', 'ORG_ADMIN'), 'ORG', '플랜 변경', '소담푸드', { changes: [['플랜', 'Trial', 'Team'], ['Trial 만료일', '2026-11-08', '-(정식 플랜 전환)']], reason: '정식 계약 체결' }),
  A('2026-11-05 10:00:21', 'ORG-9', actLee, 'ORG', '삭제 요청', '누리교육', { changes: [['조직 상태', '운영', '삭제 예정'], ['영구 삭제 예정일', '-', '2026-12-05']], reason: '고객 요청(서비스 해지)' }),
  A('2026-11-03 18:00:02', 'ORG-10', actHan, 'ACCOUNT', '계정 비활성화', '백승우(seungwoo.baek@mir-mobility.example)', { changes: [['계정 상태', '활성', '비활성']], reason: '퇴사·계약 종료 · 고객사 공문 요청(2026-11-03)' }),
  A('2026-11-02 10:00:00', 'ORG-1', SYS, 'MEMBER', '초대 만료', '신예준(yejun.shin@comes.co.kr)', { changes: [['멤버 상태', '초대 대기', '초대 만료']] }),
  A('2026-11-02 09:00:44', 'ORG-8', actHan, 'ORG', '조직 정지', '한빛증권', { changes: [['조직 상태', '운영', '정지'], ['실행 중 작업', '-', '완료 후 정지'], ['예약 실행', '-', '일시 중지 5건']], reason: '계약 갱신 대기' }),
  A('2026-10-31 09:10:12', 'ORG-8', actHan, 'ACCOUNT', '계정 비활성화', '엄지성(jisung.eom@hanbit-sec.example)', { changes: [['계정 상태', '활성', '비활성']], reason: '보안 이슈 · 정기 보안 점검에서 계정 공유 정황 확인 · 본인 확인 후 재활성화 예정' }),
  A('2026-10-30 10:00:35', 'ORG-3', P('최유진', 'yujin.choi@berryshop.example', 'ORG_ADMIN'), 'MEMBER', '멤버 비활성화', '장예린(yerin.jang@berryshop.example)', { changes: [['멤버 상태', '활성', '비활성']], reason: '업무 변경·프로젝트 종료' }),
  A('2026-10-28 15:00:00', 'ORG-12', SYS, 'MEMBER', '초대 만료', '권나연(nayeon.kwon@sodam.example)', { changes: [['멤버 상태', '초대 대기', '초대 만료']] }),
  A('2026-10-28 11:00:19', 'ORG-1', actPark, 'MEMBER', '멤버 비활성화', '오지호(jiho.oh@comes.co.kr)', { changes: [['멤버 상태', '활성', '비활성']], reason: '휴직·장기 부재 · 2026-11 ~ 2027-01 휴직 · 복직 후 다시 활성화' }),
  A('2026-10-21 11:02:15', 'ORG-1', actPark, 'ORG', '조직 정보 수정', 'COMES', { changes: [['메모', '-', '운영사 내부 QA 조직']] }),
  A('2026-08-21 09:30:12', null, actLee, 'MODEL', '기간 할인 등록', 'gpt-5.6-sol', { changes: [['기간', '-', '2026-08-21 00:00 ~ 2026-11-30 23:59'], ['Short 입력 · 출력 단가', '$5.00 · $30.00', '$4.00 · $20.00'], ['Long 입력 · 출력 단가', '$10.00 · $45.00', '$8.00 · $30.00']], reason: 'OpenAI 공지 — 기간 한정 가격 인하' }),
  // 90일보다 오래된 로그(최근 180일 안) — [최근 180일]·직접 입력으로 조회. 180일이 지난 로그는 보관 저장소로 옮겨져 화면에 없음
  A('2026-07-22 11:30:05', 'ORG-1', actPark, 'MODEL', '조직 모델 사용 설정', 'gpt-5.6-sol', { changes: [['사용', '아니오', '예']] }),
  A('2026-07-20 10:00:12', null, actLee, 'MODEL', '모델 등록', 'gpt-5.6-sol', { changes: [['공급자', '-', 'OpenAI'], ['단가 구간', '-', 'Short·Long (기준 272K)'], ['입력 · 출력 단가', '-', '$5.00 · $30.00']] }),
  A('2026-07-15 14:20:31', 'ORG-1', actPark, 'MEMBER', '역할 변경', '김민서(minseo.kim@comes.co.kr)', { changes: [['역할', 'Viewer', 'QA 엔지니어']] }),
  A('2026-05-20 10:12:37', 'ORG-3', actLee, 'ORG', '조직 생성', '베리샵', { changes: [['플랜', '-', 'Team'], ['조직 관리자 초대', '-', 'yujin.choi@berryshop.example']] }),
];
