/* ---------------- 프로토타입 안내 패널 ---------------- */
import { Fragment } from 'react';
import type { PersonaKey } from '../types';
import { ACT, CH, CUR_ORG, PERSONAS, ST, Select, act, ch, closeMenu, flushPanel, icon, initState, orgById, render, toast } from '../core';

let PANEL_OPEN = false;
/** 원본은 패널을 다시 그릴 때마다 innerHTML로 통째로 새로 만들었으므로 매번 새로 마운트 */
let PANEL_SEQ = 0;
export function renderProtoPanel() { flushPanel(); }

export function ProtoPanel() {
  return <ProtoPanelBody key={++PANEL_SEQ} />;
}
function ProtoPanelBody() {
  const links: [string, [string, string][]][] = [
    ['진입', [['워크스페이스(사용자 메뉴)', '/workspace']]],
    ['관리자 콘솔', [['조직 관리', '/admin/organizations'], ['조직 상세 · 온마켓', '/admin/organizations/ORG-2'], ['사용자 관리', '/admin/users'], ['AI 모델', '/admin/models'], ['사용량·사용 금액', '/admin/usage'], ['감사 로그', '/admin/audit-logs']]],
    [`조직 관리 (${CUR_ORG ? orgById(CUR_ORG).name : '조직 관리자 사용자로 확인'})`, [['조직 정보 · 플랜', '/org/info'], ['멤버 관리', '/org/members'], ['권한 관리', '/org/permissions'], ['AI 모델', '/org/models'], ['사용량·사용 금액', '/org/usage'], ['활동 로그', '/org/activity']]],
  ];
  return (
    <>
      <button className="toggle" onClick={act('ppToggle')}>{icon('info', 'sm')}{`프로토타입 안내 ${PANEL_OPEN ? '▼' : '▲'}`}</button>
      {PANEL_OPEN ? (
        <div className="box"><h4>로그인 사용자 바꾸기</h4><Select className="select" value={ST.persona} onChange={ch('ppPersona')}>{Object.entries(PERSONAS).map(([k, p]) => <option key={k} value={k}>{p.label}</option>)}</Select>
          <h4>화면 바로가기</h4>{links.map(([g, ls], gi) => <Fragment key={gi}><div className="grp">{g}</div>{ls.map(([l, h], i) => <a key={i} href={`#${h}`} onClick={act('nav', { href: h })}>{l}</a>)}</Fragment>)}
          <div className="divider"></div><button className="btn btn-sm btn-secondary" onClick={act('ppReset')}>{icon('refresh', 'sm')}데이터 초기화</button></div>
      ) : null}
    </>
  );
}
ACT.ppToggle = () => { PANEL_OPEN = !PANEL_OPEN; renderProtoPanel(); };
// 로그인 사용자를 바꾸면 패널을 닫음
CH.ppPersona = (v) => { ST.persona = v as PersonaKey; ST.ui.perm.draft = null; PANEL_OPEN = false; closeMenu(); render(); toast(`로그인 사용자: ${PERSONAS[v as PersonaKey].label}`, 'info'); };
// 패널 바깥을 누르면 닫음 (패널 안의 화면 바로가기·초기화는 열린 상태 유지)
export function installProtoPanel() {
  document.addEventListener('click', (e) => { if (PANEL_OPEN && !(e.target as Element).closest('#proto-panel')) { PANEL_OPEN = false; renderProtoPanel(); } }, true);
}
ACT.ppReset = () => { initState(); render(); toast('데이터를 초기화했습니다.', 'info'); };
