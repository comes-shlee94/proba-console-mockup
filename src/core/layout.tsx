/* ---------------- 셸 조각 (LNB · 상단 바 · 페이지 머리) ---------------- */
import { Fragment, type ReactNode } from 'react';
import type { Org } from '../types';
import { PLANS, ROLES } from '../data';
import { icon } from './icons';
import { CUR_ORG, me, myMem, orgById, trialSuspended } from './state';
import { act } from './events';
import { avatar } from './ui';

/** 페이지 함수의 반환값 (원본: { crumbs, body, cls }) */
export interface Page { crumbs: string[]; body: ReactNode; cls?: string }

/** [경로, 메뉴명, 아이콘, 설명] */
export type NavDef = [string, string, string, string];
export const ADMIN_NAV: NavDef[] = [
  ['/admin/organizations', '조직 관리', 'building', '서비스에 등록된 전체 조직의 생성·정지·삭제와 조직 관리자 지정'],
  ['/admin/users', '사용자 관리', 'users', '전체 계정의 상태(활성·잠김·비활성)와 소속 조직·서비스 관리자 관리'],
  ['/admin/models', 'AI 모델', 'cpu', '평가에 사용할 LLM 모델 등록과 단가(Short·Long 구간, 캐시) 관리'],
  ['/admin/usage', '사용량·사용 금액', 'chart', '조직·도메인별 월간 사용량과 AI 모델 사용 금액 조회·내보내기'],
  ['/admin/audit-logs', '감사 로그', 'clipboard', '로그인·권한·설정 변경 등 주요 행위 이력 조회 (변경 불가 보관)'],
];
export const ORG_NAV: NavDef[] = [
  ['/org/info', '조직 정보', 'building', '조직명·메모 수정과 플랜·좌석 확인, 플랜 변경'],
  ['/org/members', '멤버 관리', 'users', '조직 멤버 초대·역할 변경·접근 상태 관리'],
  ['/org/permissions', '권한 관리', 'shield', '역할별 메뉴 접근 범위와 민감 작업 수행 권한 설정'],
  ['/org/models', 'AI 모델', 'cpu', '조직에서 사용할 LLM 모델과 기본 모델 설정'],
  ['/org/usage', '사용량·사용 금액', 'chart', '우리 조직의 월간 사용량과 사용 금액'],
  ['/org/activity', '활동 로그', 'activity', '우리 조직에서 일어난 멤버·권한·설정 변경 이력 (Enterprise)'],
];
export const activityAllowed = (o: Org) => PLANS[o.plan].activityLog;

export function lnb(kind: 'admin' | 'org', path: string) {
  const nav = kind === 'admin' ? ADMIN_NAV : kind === 'org' ? ORG_NAV : [];
  const m = me();
  const o = orgById(CUR_ORG);
  const ctx = kind === 'admin'
    ? <div className="lnb-ctx"><div className="k">현재 콘솔</div><div className="v">서비스 관리자 콘솔</div></div>
    : kind === 'org'
      ? <div className="lnb-ctx"><div className="k">조직 관리</div><div className="v">{`${o.name} `}<span className="chip">{PLANS[o.plan].label}</span>{o.status !== 'ACTIVE' ? <> <span className="chip stop">정지</span></> : null}</div></div>
      : null;
  const items = nav.map(([href, label, ic]) => {
    const on = path === href || path.startsWith(href + '/');
    const tsus = kind === 'org' && trialSuspended(o) && href !== '/org/info'; // Trial 만료 정지 중에는 조직 정보만
    const locked = tsus || (kind === 'org' && href === '/org/activity' && !activityAllowed(o));
    return <li key={href}><a href={`#${href}`} onClick={act('nav', { href })} className={`${on ? 'active' : ''} ${locked ? 'locked' : ''}`} aria-current={on ? 'page' : undefined}>{icon(ic)}<span>{label}</span>{locked ? <span className="lnb-lock" data-tip={tsus ? 'Trial 만료로 정지된 동안에는 조직 정보만 이용할 수 있습니다' : 'Enterprise 플랜 전용 기능입니다'}>{icon('lock', 'sm')}</span> : null}</a></li>;
  });
  const roleText = kind === 'admin' ? '플랫폼 · 서비스 관리자' : (myMem() ? ROLES[myMem()!.role] : '');
  return (
    <aside className="lnb"><div className="logo">PR<span>O</span>BA</div>{ctx}{nav.length ? <><div className="lnb-label">{kind === 'admin' ? '관리자 콘솔' : '조직 관리'}</div><ul>{items}</ul></> : null}
      <div className="lnb-foot">{avatar(m)}<div><div className="n">{m.name}</div><div className="r">{roleText}</div></div></div></aside>
  );
}
export function topbar(crumbs: string[]) {
  const c = crumbs.map((x, i) => <Fragment key={i}>{i > 0 ? <span className="sep">/</span> : null}{i === crumbs.length - 1 ? <b>{x}</b> : <span>{x}</span>}</Fragment>);
  return <div className="topbar"><div className="crumbs">{c}</div><div className="spacer"></div><button className="btn-back" onClick={act('nav', { href: '/workspace' })}>{icon('left')}워크스페이스로 돌아가기</button></div>;
}
export function pageHead(ic: string, title: ReactNode, desc: ReactNode, acts: ReactNode = null) {
  return <div className="page-head"><span className="pi">{icon(ic, 'lg')}</span><div><h1>{title}</h1><p>{desc}</p></div>{acts ? <div className="acts">{acts}</div> : null}</div>;
}
