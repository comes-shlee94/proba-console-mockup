/* ---------- OA-20 권한 관리 ---------- */
import { Fragment, type ReactNode } from 'react';
import type { Access, ActionAccess, ActionDef, Change, MenuAccess, PermDraft, Perms } from '../../types';
import { ACTION_CATALOG, MENU_CATALOG, MENU_DEPS, ROLES, defaultMenuAccess } from '../../data';
import {
  ACT, CH, CUR_ORG, ST, Select, act, addAudit, appRenderSeq, badge, ch, clone, closeOverlay, confirmModal, icon, me, notice, openOverlay, pageHead, render,
  requestSettlePass, toast,
  type Page,
} from '../../core';

/** 직전에 그린 .content 자식 (원본처럼 남는 뒤쪽 요소를 마지막에 지우기 위해 한 번 더 남겨 둠) */
let PREV_PARTS: { seq: number; parts: ReactNode[] } = { seq: -1, parts: [] };

/** 권한을 설정하는 역할 (조직 관리자는 항상 허용 — 고정) */
type PermRole = keyof MenuAccess;
interface PermChange { kind: 'menu' | 'action'; role: PermRole; label: string; before: string; after: string }

const ACC_LABEL: Record<Access, string> = { ALLOW: '허용', READ: '조회', BLOCK: '차단' };
const ACC_CLS: Record<Access, string> = { ALLOW: 'allow', READ: 'read', BLOCK: 'block' };
const CYCLE: Access[] = ['ALLOW', 'READ', 'BLOCK'];
function defaultPerms(): Perms {
  const menus: Record<string, MenuAccess> = {}; MENU_CATALOG.forEach((g) => g.items.forEach(([k]) => (menus[k] = defaultMenuAccess(k))));
  const actions: Record<string, ActionAccess> = {}; ACTION_CATALOG.forEach((a) => (actions[a.key] = { ...a.def }));
  return { menus, actions, updatedAt: '2026-05-14 10:00', updatedBy: '시스템(기본값)', version: 1 };
}
const saved = (): Perms => ST.perms[CUR_ORG as string] || (ST.perms[CUR_ORG as string] = defaultPerms());
const draft = (): PermDraft => ST.ui.perm.draft || saved();
export function ensureDraft(): PermDraft { if (!ST.ui.perm.draft) ST.ui.perm.draft = clone({ menus: saved().menus, actions: saved().actions }); return ST.ui.perm.draft; }
function permChanges(): PermChange[] {
  const d = ST.ui.perm.draft; if (!d) return [];
  const out: PermChange[] = [];
  MENU_CATALOG.forEach((g) => g.items.forEach(([k, label]) => (['QA_ENGINEER', 'VIEWER'] as PermRole[]).forEach((r) => { if (d.menus[k][r] !== saved().menus[k][r]) out.push({ kind: 'menu', role: r, label: `${g.group} › ${label}`, before: ACC_LABEL[saved().menus[k][r]], after: ACC_LABEL[d.menus[k][r]] }); })));
  ACTION_CATALOG.forEach((a) => (['QA_ENGINEER', 'VIEWER'] as PermRole[]).forEach((r) => { if (d.actions[a.key][r] !== saved().actions[a.key][r]) out.push({ kind: 'action', role: r, label: a.label, before: saved().actions[a.key][r] ? '허용' : '차단', after: d.actions[a.key][r] ? '허용' : '차단' }); }));
  return out;
}
export function permDirtyCount(): number { return permChanges().length; }
function actionApplicable(a: ActionDef, role: PermRole, menus: Record<string, MenuAccess>): boolean { const rank: Record<Access, number> = { ALLOW: 2, READ: 1, BLOCK: 0 }; const need = a.level === 'READ' ? 1 : 2; return a.need.some((k) => rank[menus[k][role]] >= need); }
function depWarnings(menus: Record<string, MenuAccess>): ReactNode[] {
  const w: ReactNode[] = [];
  (['QA_ENGINEER', 'VIEWER'] as PermRole[]).forEach((r) => MENU_DEPS.forEach(([k, pre, why]) => { if (menus[k][r] !== 'BLOCK' && menus[pre][r] === 'BLOCK') { const lab = (key: string) => { for (const g of MENU_CATALOG) { const it = g.items.find((x) => x[0] === key); if (it) return `${g.group} › ${it[1]}`; } return key; }; w.push(<><b>{ROLES[r]}</b>{`: '${lab(k)}'은(는) ${ACC_LABEL[menus[k][r]]}이지만 '${lab(pre).split(' › ')[1]}'이(가) 차단되어 ${why}.`}</>); } }));
  return w;
}
export function pagePerms(): Page {
  const u = ST.ui.perm; const d = draft(); const changes = permChanges();
  const mDirty = changes.some((c) => c.kind === 'menu'); const aDirty = changes.some((c) => c.kind === 'action');
  const tabs = <div className="tabs"><button className={u.tab === 'menus' ? 'on' : ''} onClick={act('pmTab', { v: 'menus' })}>메뉴 접근 권한{mDirty ? <span className="dirty"></span> : null}</button><button className={u.tab === 'actions' ? 'on' : ''} onClick={act('pmTab', { v: 'actions' })}>작업 권한 · 민감 작업{aDirty ? <span className="dirty"></span> : null}</button></div>;
  let content: ReactNode[];
  if (u.tab === 'menus') {
    const warns = depWarnings(d.menus);
    // 원본은 그룹 행과 메뉴 행을 한 줄로 이어 붙여 위치 순서대로 고쳐 그렸음 → 행의 key도 위치(순번)로 (그룹을 펼치거나 접을 때 포커스가 같은 자리에 남음)
    const rows: ReactNode[] = [];
    let rowKey = 0;
    MENU_CATALOG.forEach((g) => {
      const open = u.open[g.group];
      const bulk = (r: PermRole) => <Select className="bulk" onChange={ch('pmBulk', { g: g.group, r })} aria-label={`${g.group} ${ROLES[r]} 일괄 설정`}><option value="">일괄 설정</option><option value="ALLOW">모두 허용</option><option value="READ">모두 조회</option><option value="BLOCK">모두 차단</option></Select>;
      const head = <tr key={rowKey++} className="group" onClick={act('pmGroup', { g: g.group })}><td><span className="row" style={{ gap: '6px' }}>{icon(open ? 'down' : 'right', 'sm')}{g.group}<span className="faint" style={{ fontWeight: '400' }}>{`${g.items.length}개 메뉴`}</span></span></td><td className="c" data-stop="1">{bulk('QA_ENGINEER')}</td><td className="c">{bulk('VIEWER')}</td></tr>;
      const items = open ? g.items.map(([k, label, path]) => <tr key={rowKey++}><td><div className="two" style={{ paddingLeft: '22px' }}><span className="p" style={{ fontWeight: '400' }}>{label}</span><span className="s mono">{path}</span></div></td>{(['QA_ENGINEER', 'VIEWER'] as PermRole[]).map((r, j) => { const v = d.menus[k][r]; const dirty = v !== saved().menus[k][r]; return <td key={j} className="c"><button className={`perm ${ACC_CLS[v]} ${dirty ? 'dirty' : ''}`} onClick={act('pmCell', { k, r })} aria-label={`${ROLES[r]} ${label}: ${ACC_LABEL[v]}. 누르면 ${ACC_LABEL[CYCLE[(CYCLE.indexOf(v) + 1) % 3]]}(으)로 변경`} data-tip="누를 때마다 허용 → 조회 → 차단">{ACC_LABEL[v]}</button></td>; })}</tr>) : null;
      rows.push(head);
      if (items) rows.push(...items);
    });
    content = [<div className="row mb12"><div className="perm-legend"><span><span className="perm allow" style={{ width: '48px', height: '22px' }}>허용</span>조회 + 등록·수정 등 메뉴 내 일반 작업</span><span><span className="perm read" style={{ width: '48px', height: '22px' }}>조회</span>읽기 전용(쓰기 버튼 숨김)</span><span><span className="perm block" style={{ width: '48px', height: '22px' }}>차단</span>메뉴 숨김 · URL 접근 시 403</span></div><span className="ml-auto faint" style={{ fontSize: '12px' }}>그룹 행의 [일괄 설정]으로 도메인 전체를 한 번에 바꿀 수 있습니다</span></div>,
      ...(warns.length ? [<div className="depwarn">{icon('alert', 'sm')}<div>{warns.map((x, i) => <Fragment key={i}>{i > 0 ? <br /> : null}{x}</Fragment>)}</div></div>] : []),
      <div className="tbl-wrap"><table className="tbl"><colgroup><col /><col style={{ width: '240px' }} /><col style={{ width: '240px' }} /></colgroup><thead><tr><th>메뉴</th><th className="c">QA 엔지니어</th><th className="c">Viewer</th></tr></thead><tbody>{rows}</tbody></table></div>];
  } else {
    const rows = ACTION_CATALOG.map((a, i) => <tr key={i}><td><div className="two"><span className="p">{a.label}</span><span className="s row" style={{ gap: '4px' }}>{`${a.desc[0]} `}{icon('right', 'sm')}{` ${a.desc[1]}`}</span><span className="s">{`필요 메뉴 권한: ${a.need.map((k) => { for (const g of MENU_CATALOG) { const it = g.items.find((x) => x[0] === k); if (it) return `${g.group.replace('성능 QA · ', '')} ${it[1]}`; } return k; }).join(' / ')} (${a.level === 'READ' ? '조회 이상' : '허용'}) · `}<span className="mono">{a.req}</span></span></div></td>
      {(['QA_ENGINEER', 'VIEWER'] as PermRole[]).map((r, j) => { if (!actionApplicable(a, r, d.menus)) return <td key={j} className="c"><span className="perm na" data-tip={'필요한 메뉴 권한이 없어 이 작업은 적용되지 않습니다\n(메뉴 접근 권한 탭에서 먼저 허용)'}>메뉴 권한 없음</span></td>; const v = d.actions[a.key][r]; const dirty = v !== saved().actions[a.key][r]; return <td key={j} className="c"><button className={`perm ${v ? 'allow' : 'block'} ${dirty ? 'dirty' : ''}`} onClick={act('pmAct', { k: a.key, r })} data-tip="누를 때마다 허용 ⇄ 차단">{v ? '허용' : '차단'}</button></td>; })}</tr>);
    content = [notice(<>메뉴 접근과 별개로 <b>최종 상태를 바꾸는 작업</b>의 수행 권한입니다. 작업 권한이 허용이어도 필요한 메뉴 권한이 없으면 수행할 수 없습니다(빗금 표시).</>, 'info'),
      <div className="tbl-wrap mt12"><table className="tbl"><colgroup><col /><col style={{ width: '220px' }} /><col style={{ width: '220px' }} /></colgroup><thead><tr><th>작업</th><th className="c">QA 엔지니어</th><th className="c">Viewer</th></tr></thead><tbody>{rows}</tbody></table></div>];
  }
  const acts = <button className="btn btn-ghost btn-sm" onClick={act('pmReset')}>{icon('undo', 'sm')}기본값으로 되돌리기</button>;
  const bar = changes.length ? <div className="savebar">{icon('alert')}<span>저장하지 않은 변경 <span className="n">{`${changes.length}건`}</span> · 저장 즉시 해당 역할의 모든 멤버에게 적용됩니다</span><span className="ml-auto"></span><button className="btn btn-secondary" onClick={act('pmDiscard')}>변경 취소</button><button className="btn btn-accent" onClick={act('pmSave')}>저장</button></div> : null;
  // 원본 DOM 패치는 .content의 자식을 위치 순서로 맞춰 고쳐 그렸음: 의존성 경고(.depwarn)나 저장 바가 생기거나 없어지면 뒤쪽 요소가
  // 앞 자리 요소를 재사용하거나 새로 만들어짐(포커스·스크롤 위치에 영향) → 빈자리 없이 위치 순서를 key로 그려 같은 방식으로 재사용
  const parts: ReactNode[] = [pageHead('shield', '권한 관리', '역할별 메뉴 접근 범위와 민감 작업 수행 권한 설정', acts), <div>{tabs}</div>, ...content, ...(bar ? [bar] : [])];
  // 자식이 줄어들면(경고·저장 바가 없어짐) 원본처럼 앞쪽을 먼저 고치고 남는 요소는 다음 그리기에서 지움
  const prev = PREV_PARTS.seq === appRenderSeq() - 1 ? PREV_PARTS.parts : [];
  const keep = prev.length > parts.length ? prev.slice(parts.length) : [];
  if (keep.length) requestSettlePass();
  PREV_PARTS = { seq: appRenderSeq(), parts };
  const body = <>{[...parts, ...keep].map((el, i) => <Fragment key={i}>{el}</Fragment>)}</>;
  return { crumbs: ['권한 관리'], body, cls: changes.length ? 'has-savebar' : '' };
}
ACT.pmTab = (d) => { ST.ui.perm.tab = d.v; render(); };
ACT.pmGroup = (d, _el, e) => { if ((e!.target as Element).closest('select')) return; ST.ui.perm.open[d.g] = !ST.ui.perm.open[d.g]; render(); };
ACT.pmCell = (d) => { const dr = ensureDraft(); const v = dr.menus[d.k][d.r as PermRole]; dr.menus[d.k][d.r as PermRole] = CYCLE[(CYCLE.indexOf(v) + 1) % 3]; render(); };
ACT.pmAct = (d) => { const dr = ensureDraft(); dr.actions[d.k][d.r as PermRole] = !dr.actions[d.k][d.r as PermRole]; render(); };
CH.pmBulk = (v, _el, _e, d) => { if (!v) return; const dr = ensureDraft(); const g = MENU_CATALOG.find((x) => x.group === d!.g)!; g.items.forEach(([k]) => (dr.menus[k][d!.r as PermRole] = v as Access)); ST.ui.perm.open[g.group] = true; render(); toast(`${g.group} 메뉴 ${g.items.length}개를 ${ROLES[d!.r as PermRole]} '${ACC_LABEL[v as Access]}'(으)로 바꿨습니다. 저장해야 적용됩니다.`, 'info'); };
ACT.pmDiscard = () => { ST.ui.perm.draft = null; render(); toast('변경 사항을 취소했습니다.', 'info'); };
ACT.pmReset = () => confirmModal({
  title: '권한을 기본값으로 되돌릴까요?', icon: 'undo',
  body: <p>QA 엔지니어·Viewer의 메뉴·작업 권한을 서비스 기본값으로 바꿉니다. <b>저장 버튼을 눌러야</b> 실제로 적용됩니다.</p>, confirmLabel: '기본값 불러오기',
  onConfirm: () => { const dr = ensureDraft(); MENU_CATALOG.forEach((g) => g.items.forEach(([k]) => (dr.menus[k] = defaultMenuAccess(k)))); ACTION_CATALOG.forEach((a) => (dr.actions[a.key] = { ...a.def })); render(); toast('기본값을 불러왔습니다. 저장해야 적용됩니다.', 'info'); },
});
ACT.pmSave = () => {
  const ch = permChanges();
  openOverlay({
    width: 640,
    view: () => ({
      title: `권한 변경 ${ch.length}건을 저장할까요?`, icon: 'shield',
      body: <><div className="chg-list">{ch.map((c, i) => <div key={i}>{badge(c.kind === 'menu' ? '메뉴' : '작업', c.kind === 'menu' ? 'b-outline' : 'b-violet')}<b>{ROLES[c.role]}</b><span>{c.label}</span><span className="ml-auto row" style={{ gap: '6px' }}><span className={`perm ${c.before === '허용' ? 'allow' : c.before === '조회' ? 'read' : 'block'}`} style={{ width: '48px', height: '22px' }}>{c.before}</span><span className="arrow">{icon('right', 'sm')}</span><span className={`perm ${c.after === '허용' ? 'allow' : c.after === '조회' ? 'read' : 'block'}`} style={{ width: '48px', height: '22px' }}>{c.after}</span></span></div>)}</div>
        {notice('저장 즉시 해당 역할(QA 엔지니어 · Viewer)의 모든 멤버에게 적용됩니다. 다른 관리자가 먼저 저장한 경우(버전 불일치) 최신 내용을 다시 불러온 뒤 적용해야 합니다.', '')}</>,
      foot: <><button className="btn btn-secondary" onClick={act('closeOv')}>취소</button><button className="btn btn-primary" onClick={act('pmCommit')}>저장</button></>,
    }),
  });
};
ACT.pmCommit = () => {
  const ch = permChanges(); const dr = ST.ui.perm.draft!; const s = saved();
  s.menus = clone(dr.menus); s.actions = clone(dr.actions); s.version! += 1; s.updatedAt = '2026-11-11 11:00'; s.updatedBy = me().name;
  const mc = ch.filter((c) => c.kind === 'menu'); const ac = ch.filter((c) => c.kind === 'action');
  if (mc.length) addAudit(CUR_ORG, 'PERM', '메뉴 권한 변경', `${mc.length}건`, mc.map((c): Change => [`${ROLES[c.role]} · ${c.label}`, c.before, c.after]));
  if (ac.length) addAudit(CUR_ORG, 'PERM', '작업 권한 변경', `${ac.length}건`, ac.map((c): Change => [`${ROLES[c.role]} · ${c.label}`, c.before, c.after]));
  ST.ui.perm.draft = null; closeOverlay(); render(); toast(`권한을 저장했습니다. (v${s.version})`);
};
