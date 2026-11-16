import type { ActionDef, MenuAccess, MenuGroup } from '../types';

/* ---------------- 메뉴 카탈로그 & 권한 ---------------- */
export const MENU_CATALOG: MenuGroup[] = [
  { group: 'AI 품질', items: [
    ['lqa.dashboard', '대시보드', '/lqa/dashboard'], ['lqa.chatbot', '챗봇 연결', '/lqa/chatbot-connect'], ['lqa.testcases', '테스트케이스', '/lqa/testcases'],
    ['lqa.judge', 'Judge · Prompt', '/lqa/judge-prompt'], ['lqa.plan', '평가 계획', '/lqa/evaluation-plan'], ['lqa.run', '평가 실행', '/lqa/run'],
    ['lqa.history', '실행 이력', '/lqa/history'], ['lqa.regression', '회귀 비교', '/lqa/regression']] },
  { group: '기능 QA', items: [
    ['fqa.dashboard', '대시보드', '/fqa/dashboard'], ['fqa.targets', '대상·환경', '/fqa/targets'], ['fqa.suites', '테스트 스위트', '/fqa/suites'],
    ['fqa.testcases', '테스트케이스', '/fqa/testcases'], ['fqa.plan', '실행 계획', '/fqa/execution-plan'], ['fqa.run', '실행', '/fqa/run'],
    ['fqa.history', '실행 이력', '/fqa/history'], ['fqa.regression', '회귀 비교', '/fqa/regression'], ['fqa.flaky', '불안정(Flaky)', '/fqa/flaky']] },
  { group: '성능 QA · 부하', items: [
    ['load.dashboard', '대시보드', '/nqa/load/dashboard'], ['load.targets', '대상 환경', '/nqa/load/targets'], ['load.scenarios', '시나리오 설계', '/nqa/load/scenarios'],
    ['load.plan', '측정 계획', '/nqa/load/plans'], ['load.run', '측정 실행', '/nqa/load/run'], ['load.history', '실행 이력', '/nqa/load/history']] },
  { group: '성능 QA · 앱 성능', items: [
    ['app.dashboard', '대시보드', '/nqa/app/dashboard'], ['app.targets', '대상 앱', '/nqa/app/targets'], ['app.scenarios', '측정 시나리오', '/nqa/app/scenarios'],
    ['app.plan', '측정 계획', '/nqa/app/plans'], ['app.run', '측정 실행', '/nqa/app/run'], ['app.history', '실행 이력', '/nqa/app/history'], ['app.trend', '성능 추이', '/nqa/app/trend']] },
  { group: '공통', items: [
    ['common.variables', '변수', '/common/variables'], ['common.datasets', '데이터셋', '/common/datasets'], ['common.defects', '결함', '/common/defects'], ['common.reports', '리포트·알림', '/common/reports']] },
];
// 기본 메뉴 권한 (QA 엔지니어 / Viewer) — 조직 관리자는 항상 허용(고정)
export function defaultMenuAccess(key: string): MenuAccess {
  const viewer = key === 'common.variables' ? 'BLOCK' : 'READ';
  return { QA_ENGINEER: 'ALLOW', VIEWER: viewer };
}
export const MENU_DEPS: [string, string, string][] = [ // [메뉴, 선행 메뉴, 사유]
  ['lqa.run', 'lqa.plan', '실행할 평가 계획을 선택할 수 없습니다'],
  ['lqa.plan', 'lqa.testcases', '계획에 넣을 테스트케이스를 볼 수 없습니다'],
  ['lqa.plan', 'lqa.judge', '계획에 지정할 Judge·Prompt를 볼 수 없습니다'],
  ['lqa.regression', 'lqa.history', '비교할 실행 이력을 볼 수 없습니다'],
  ['fqa.run', 'fqa.plan', '실행할 실행 계획을 선택할 수 없습니다'],
  ['fqa.plan', 'fqa.suites', '계획에 넣을 스위트를 볼 수 없습니다'],
  ['fqa.regression', 'fqa.history', '비교할 실행 이력을 볼 수 없습니다'],
  ['load.run', 'load.plan', '실행할 측정 계획을 선택할 수 없습니다'],
  ['app.run', 'app.plan', '실행할 측정 계획을 선택할 수 없습니다'],
];
export const ACTION_CATALOG: ActionDef[] = [
  { key: 'case.approve', label: '테스트케이스 승인·반려', desc: ['검토중', '승인 / 반려'], need: ['lqa.testcases', 'fqa.testcases'], level: 'ALLOW', def: { QA_ENGINEER: false, VIEWER: false }, req: 'AQ-005 · FQ-008' },
  { key: 'run.request', label: '실행 요청', desc: ['활성 계획', '실행 회차 생성'], need: ['lqa.run', 'fqa.run', 'app.run'], level: 'ALLOW', def: { QA_ENGINEER: true, VIEWER: false }, req: 'AQ-018 · FQ-026 · AP' },
  { key: 'run.cancel', label: '실행 중지·대기 취소', desc: ['실행중·대기', '취소'], need: ['lqa.run', 'fqa.run', 'app.run', 'load.run'], level: 'ALLOW', def: { QA_ENGINEER: true, VIEWER: false }, req: 'FQ-029 · EX-007' },
  { key: 'load.run', label: '부하 테스트 실행·중단', desc: ['대기', '부하 발생(위험 작업)'], need: ['load.run'], level: 'ALLOW', def: { QA_ENGINEER: false, VIEWER: false }, req: 'LD-010 · LD-014' },
  { key: 'plan.activate', label: '계획 활성화·비활성화', desc: ['초안', '활성'], need: ['lqa.plan', 'fqa.plan', 'load.plan', 'app.plan'], level: 'ALLOW', def: { QA_ENGINEER: true, VIEWER: false }, req: 'AQ-016 · LD-009' },
  { key: 'data.delete', label: '데이터 삭제', desc: ['대상·케이스·계획·데이터셋', '삭제(복구 불가)'], need: ['lqa.testcases', 'fqa.testcases', 'common.datasets'], level: 'ALLOW', def: { QA_ENGINEER: false, VIEWER: false }, req: 'CM-010 · CM-018' },
  { key: 'defect.status', label: '결함 상태 변경', desc: ['진행', '해결 / 재오픈'], need: ['common.defects'], level: 'ALLOW', def: { QA_ENGINEER: true, VIEWER: false }, req: 'CM-023' },
  { key: 'case.eject', label: '코드 전환(Eject)', desc: ['Low-Code', 'Full-Code(되돌릴 수 없음)'], need: ['fqa.testcases'], level: 'ALLOW', def: { QA_ENGINEER: true, VIEWER: false }, req: 'FQ-016' },
  { key: 'secret.write', label: '시크릿 등록·변경', desc: ['평문 입력', '암호화 저장·교체'], need: ['common.variables'], level: 'ALLOW', def: { QA_ENGINEER: true, VIEWER: false }, req: 'CM-014' },
  { key: 'report.export', label: '결과 내보내기', desc: ['실행 결과', 'Excel·PDF 다운로드'], need: ['lqa.history', 'fqa.history'], level: 'READ', def: { QA_ENGINEER: true, VIEWER: true }, req: 'AQ-025 · FQ-040' },
  { key: 'integration.manage', label: '알림·연동 설정 변경', desc: ['Slack·Email·Jira', '설정 저장'], need: ['common.reports', 'common.defects'], level: 'ALLOW', def: { QA_ENGINEER: false, VIEWER: false }, req: 'CM-025 · IT-005' },
  { key: 'webhook.rotate', label: '웹훅 시크릿 재발급', desc: ['기존 시크릿', '즉시 무효화'], need: ['fqa.plan', 'app.plan'], level: 'ALLOW', def: { QA_ENGINEER: false, VIEWER: false }, req: 'IT-002' },
];
