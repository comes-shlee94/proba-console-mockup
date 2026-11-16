/* ==========================================================
   공통: 워크스페이스(진입점) · 사용자 메뉴 · 내 정보 · 403 · 프로토타입 패널
   ========================================================== */
import { Fragment, type ReactNode } from 'react';
import type { Org } from '../../types';
import { ROLES } from '../../data';
import { keepStyleAttr,
  $, ACT, CH, CUR_ORG, IN, NAME_RE, ST, Input, Select,
  act, acct, activeAdmins, addAudit, addTransientClass, avatar, canOrgConsole, ch, closeMenu, closeOverlay, field, icon, inp,
  isPlatformMember, isSA, josa, me, memOf, membershipsOfUser, myMem, openOverlay, openUserMenu, orgById, ovs, refreshOverlay,
  render, toast, trialSuspended, userCell,
} from '../../core';
import { orgName } from '../org/info';

/** [그룹명, [메뉴명, 아이콘][]] */
export const WS_NAV: [string, [string, string][]][] = [
  ['모니터링', [['대시보드', 'layout']]],
  ['준비·설계', [['챗봇 연결', 'plug'], ['테스트케이스', 'clipboard'], ['Judge · Prompt', 'pencil'], ['평가 계획', 'calendar']]],
  ['실행·분석', [['평가 실행', 'play'], ['실행 이력', 'refresh'], ['회귀 비교', 'swap']]],
  ['공통', [['변수', 'key'], ['결함', 'alert'], ['리포트·알림', 'mail']]],
];
export function wsShell(content: ReactNode, path: string): ReactNode {
  const nav = WS_NAV.map(([g, items], gi) => <Fragment key={gi}><div className="lnb-label">{g}</div><ul>{items.map(([l, ic], i) => <li key={i}><a className={g === '모니터링' && i === 0 && path === '/workspace' ? 'active' : ''} onClick={act('toastInfo', { msg: '워크스페이스 화면은 이번 기획 범위가 아닙니다' })}>{icon(ic)}<span>{l}</span></a></li>)}</ul></Fragment>);
  const m = myMem();
  // 조직 전환: 소속 조직(활성)마다 역할이 다를 수 있음 · 서비스 관리자는 플랫폼 멤버라 조직이 없음
  const mine = membershipsOfUser(me().id).filter((x) => x.status === 'ACTIVE');
  const orgSel = isSA() && !m
    ? <Select className="select" aria-label="조직 전환" value="" onChange={ch('wsOrg')}><option value="">플랫폼 (서비스 관리자)</option><option disabled>──────────</option><option value="__search">조직 지원 접속… (조회 전용)</option></Select>
    : <Select className="select" aria-label="조직 전환" value={CUR_ORG} onChange={ch('wsOrg')}>{mine.map((x, i) => <option key={i} value={x.orgId}>{`${orgById(x.orgId).name}${mine.length > 1 ? ` · ${ROLES[x.role]}` : ''}${orgById(x.orgId).status !== 'ACTIVE' ? ' (정지)' : ''}`}</option>)}</Select>;
  const footRole = m ? `${orgName()} · ${ROLES[m.role]}` : isSA() ? '플랫폼 · 서비스 관리자' : '';
  return (
    <div className="shell ws"><aside className="lnb"><div className="logo">PR<span style={{ color: '#7ee7ee' }}>O</span>BA</div>{nav}<div className="lnb-foot">{avatar(me())}<div><div className="n">{me().name}</div><div className="r">{footRole}</div></div></div></aside>
      <div className="main"><div className="ws-top"><Select className="select" aria-label="도메인 전환"><option>AI 품질</option><option>기능 QA</option><option>성능 QA</option></Select><span style={{ flex: '1' }}></span>{orgSel}<button className="user-btn" id="user-btn" onClick={act('userMenu')} aria-label="사용자 메뉴" aria-haspopup="menu">{icon('user', 'lg')}</button></div>
        <div className="content">{content}</div></div></div>
  );
}
CH.wsOrg = (v, el) => {
  if (v === '__search') { el!.value = ''; toast('서비스 관리자는 조직을 검색해 "지원 접속(조회 전용)"으로 볼 수 있습니다 (제안 · 감사 로그 기록 · 조직 소속은 생기지 않음).', 'info'); return; }
  if (!v || v === CUR_ORG) return;
  ST.curOrg[ST.persona] = v; ST.ui.members.page = 1; ST.ui.activity.page = 1; closeMenu(); render();
  const mm = memOf(v, me().id)!;
  toast(`${orgById(v).name} 조직으로 전환했습니다 · 이 조직에서의 역할: ${ROLES[mm.role]}${mm.role === 'ORG_ADMIN' ? ' (사용자 메뉴에 조직 관리 표시)' : ''}`, 'info');
};
export function pageWorkspace(): ReactNode {
  if (isSA() && !myMem()) {
    return (
      <>
        <div className="page-head"><span className="pi">{icon('shield', 'lg')}</span><div><h1>서비스 관리자</h1><p>플랫폼 멤버십 · 어느 조직에도 속하지 않음</p></div></div>
        <div className="ws-ph"><div style={{ fontSize: '15px', color: '#555', fontWeight: '600', marginBottom: '6px' }}>서비스 관리자는 워크스페이스(조직 데이터)를 사용하지 않습니다</div> 서비스 관리자 계정은 <b>플랫폼 멤버십</b>만 있어 조직의 테스트·실행 데이터를 다루는 워크스페이스가 없습니다. 실제 서비스에서는 로그인하면 <b>관리자 콘솔</b>로 바로 이동합니다.<br />오른쪽 위 <b>사람 아이콘(사용자 메뉴)</b>에서 <b>관리자 콘솔</b>로 이동하세요. 조직 업무(QA 등)도 해야 하는 사람은 서비스 관리자 계정과 <b>별도의 계정</b>으로 조직에 소속됩니다.</div>
      </>
    );
  }
  const o = CUR_ORG ? orgById(CUR_ORG) : null;
  if (o && o.status !== 'ACTIVE') return pageOrgSuspended(o);
  return (
    <>
      <div className="page-head"><span className="pi">{icon('layout', 'lg')}</span><div><h1>대시보드</h1><p>평가 지표·품질 추이를 한눈에 모니터링</p></div></div>
      <div className="ws-ph"><div style={{ fontSize: '15px', color: '#555', fontWeight: '600', marginBottom: '6px' }}>워크스페이스 화면 (이번 기획 범위 밖)</div> 오른쪽 위 <b>사람 아이콘(사용자 메뉴)</b>을 눌러 <b>관리자 콘솔</b> 또는 <b>조직 관리</b>로 이동하세요.<br />사용자 메뉴의 항목은 로그인한 사용자의 권한에 따라 다르게 보입니다 · 왼쪽 아래 [프로토타입 안내]에서 사용자를 바꿔 볼 수 있습니다.{membershipsOfUser(me().id).filter((x) => x.status === 'ACTIVE').length > 1 ? <><br />여러 조직에 소속된 사용자는 오른쪽 위 <b>조직 선택</b>에서 조직을 바꾸면 그 조직에서의 역할(배지·메뉴)이 적용됩니다.</> : null}</div>
    </>
  );
}
// 정지·삭제 예정 조직: 멤버는 워크스페이스를 이용할 수 없음. Trial 만료로 정지된 경우 조직 관리자는 [조직 정보]에서 플랜을 바꿔 다시 이용
export function pageOrgSuspended(o: Org): ReactNode {
  const trial = trialSuspended(o); const del = o.status === 'PENDING_DELETION';
  const admins = activeAdmins(o.id).map((m) => acct(m.userId));
  const others = membershipsOfUser(me().id).filter((x) => x.status === 'ACTIVE' && x.orgId !== o.id && orgById(x.orgId).status === 'ACTIVE');
  const title = trial ? 'Trial 기간이 끝나 이용이 정지된 조직입니다' : del ? '삭제 예정인 조직입니다' : '이용이 정지된 조직입니다';
  // 원본 템플릿 `${o.trialEndsAt}`과 같게 문자열로 (플랜 변경으로 지워졌으면 "undefined")
  const desc: ReactNode = trial
    ? <>{`${o.name}의 Trial이 `}<b>{String(o.trialEndsAt)}</b>에 끝나 조직이 정지되었습니다. 체험 기간에 만든 테스트와 실행 이력 등 데이터는 그대로 보존됩니다.<br />{canOrgConsole() ? <><b>[조직 관리 › 조직 정보]</b>에서 플랜을 <b>Team 또는 Enterprise</b>로 변경하면 바로 다시 이용할 수 있습니다.</> : <>조직 관리자가 플랜을 <b>Team 또는 Enterprise</b>로 변경하면 바로 다시 이용할 수 있습니다.</>}</>
    : `${josa(o.name, '은/는')} 현재 이용할 수 없습니다. 자세한 내용은 조직 관리자에게 문의하세요.`;
  const action = trial && canOrgConsole()
    ? <button className="btn btn-primary mt12" onClick={act('nav', { href: '/org/info' })}>{icon('swap', 'sm')}조직 정보에서 플랜 변경</button>
    : admins.length ? <div className="card" style={{ minWidth: '360px', textAlign: 'left', marginTop: '6px' }}><div className="sec-t">{`${o.name} 조직 관리자`}</div>{admins.map((a, i) => <div key={i} className="row" style={{ padding: '6px 0' }}>{userCell(a)}</div>)}</div> : null;
  return (
    <div className="blank"><span className="bi">{icon(del ? 'trash' : 'pause', 'lg')}</span><h2>{title}</h2><p>{desc}</p>{action}
      {others.length ? <p className="faint" style={{ fontSize: '12px' }}>다른 소속 조직은 오른쪽 위 조직 선택에서 바꿔 이용할 수 있습니다.</p> : null}</div>
  );
}
ACT.userMenu = (d, el) => {
  if ($('.umenu')) { closeMenu(); return; }
  closeMenu();
  const a = me();
  // 원본: el.getBoundingClientRect() · <div class="umenu" role="menu"> 생성 · body에 붙이고 위치 지정 → core openUserMenu가 같은 순서로 처리
  // 배지는 1개: "{현재 조직} · {역할}" — 서비스 관리자는 "플랫폼 · 서비스 관리자"(강조 색)
  const badgeHtml = roleBadge('ub');
  openUserMenu(el!, (
    <>
      <div className="badges">{badgeHtml}</div>
      <div className="top"><div><div className="nm">{a.name}</div><div className="em">{a.email}</div></div><button className="edit" onClick={act('profile')} aria-label="내 정보 수정">{icon('pencil')}</button></div>
      <div className="items">{isSA() ? <a href="#/admin/organizations" onClick={act('nav', { href: '/admin/organizations' })}>{icon('shield')}<span>관리자 콘솔</span><span className="chev">{icon('right', 'sm')}</span></a> : null}
        {canOrgConsole() ? <a href="#/org/info" onClick={act('nav', { href: '/org/info' })}>{icon('building')}<span>조직 관리</span><span className="chev">{icon('right', 'sm')}</span></a> : null}
        <button onClick={act('logout')}>{icon('logout')}<span>로그아웃</span></button></div>
    </>
  ));
  // 원본 el.classList.add('on') — 다음 render()의 DOM 패치에서 해제됨
  addTransientClass(el!, 'on');
};
// 역할 배지 1개 (사용자 메뉴 · 내 정보는 roleBadges로 소속 조직마다 1개): 서비스 관리자는 플랫폼 멤버십의 역할이라 "플랫폼 · 서비스 관리자"(강조 색),
// 그 밖에는 현재 선택한 조직에서의 역할 "{조직} · {역할}"
export function roleBadge(cls: string): ReactNode {
  if (isSA()) return <span className={`${cls} sa`}>{icon('shield', 'sm')}{`플랫폼 · ${ROLES.SERVICE_ADMIN}`}</span>;
  const m = myMem();
  if (!m) return null;
  return <span className={`${cls} org`}>{`${orgById(m.orgId).name} · ${ROLES[m.role]}`}</span>;
}
// 내 정보의 소속 · 역할 배지: 소속 조직(활성 멤버십)마다 1개 "{조직} · {역할}" — 현재 선택한 조직이 맨 앞(체크 표시)
// 서비스 관리자는 플랫폼 멤버십만 있어 "플랫폼 · 서비스 관리자" 1개(강조 색)
export function roleBadges(cls: string): ReactNode {
  const a = me();
  if (isPlatformMember(a)) return <span className={`${cls} sa`}>{icon('shield', 'sm')}{`플랫폼 · ${ROLES.SERVICE_ADMIN}`}</span>;
  const mine = membershipsOfUser(a.id).filter((x) => x.status === 'ACTIVE').sort((x, y) => Number(y.orgId === CUR_ORG) - Number(x.orgId === CUR_ORG));
  if (!mine.length) return <span className="faint" style={{ fontSize: '13px' }}>소속 조직 없음</span>;
  const many = mine.length > 1;
  return mine.map((x, i) => {
    const o = orgById(x.orgId); const cur = many && x.orgId === CUR_ORG;
    return <span key={i} className={`${cls} org${cur ? ' cur' : ''}`} title={cur ? '현재 선택한 조직' : undefined}>{cur ? icon('check', 'sm') : null}{`${o.name} · ${ROLES[x.role]}${o.status !== 'ACTIVE' ? ' (정지)' : ''}`}</span>;
  });
}
ACT.logout = () => { closeMenu(); toast('로그아웃 (프로토타입에서는 동작하지 않습니다)', 'info'); };
/** 내 정보 모달 상태 */
interface ProfileState { name: string; pw: boolean; cur: string; next: string; conf: string; err: { name?: string; cur?: string; next?: string; conf?: string } }
ACT.profile = () => {
  closeMenu();
  const a = me();
  openOverlay<ProfileState>({
    width: 560,
    state: { name: a.name, pw: false, cur: '', next: '', conf: '', err: {} },
    view: (s: ProfileState) => {
      const rules = PW_RULES;
      return {
        title: '내 정보', icon: 'user',
        body: (
          <>
            <div className="form-grid">{field('이름', <Input id="f-pf-n" className="input" maxLength={30} value={s.name} onValue={inp('pfName')} />, { req: 1, err: s.err.name })}{field('이메일', <Input className="input" readOnly value={a.email} />, { help: '로그인 ID · 변경 불가' })}</div>
            <div><p className="sec-t">소속 · 역할</p><div className="role-chips">{roleBadges('role-chip')}</div>
              <ul className="blist mt8"><li>최근 로그인 일시 <span className="num">{a.lastLoginAt || '-'}</span></li><li>최근 로그인 IP <span className="mono">{a.lastLoginIp || '-'}</span></li></ul></div>
            <div className="divider" style={{ margin: '0' }}></div>
            <button className="link row" onClick={act('pfPw')} style={{ gap: '4px' }}>{icon(s.pw ? 'down' : 'right', 'sm')}비밀번호 변경</button>
            {s.pw ? <>{field('현재 비밀번호', <Input id="f-pf-c" type="password" className="input" autoComplete="current-password" value={s.cur} onValue={inp('pfCur')} />, { req: 1, err: s.err.cur })}
              {field('새 비밀번호', <Input id="f-pf-x" type="password" className="input" autoComplete="new-password" value={s.next} onValue={inp('pfNext')} />, { req: 1, help: rules.map(([l, re], i) => <Fragment key={i}>{i > 0 ? ' · ' : null}<span ref={keepStyleAttr} style={re.test(s.next) ? { color: 'var(--teal-ink)', fontWeight: '600' } : undefined}>{`${re.test(s.next) ? '✓ ' : ''}${l}`}</span></Fragment>), err: s.err.next })}
              {field('새 비밀번호 확인', <Input id="f-pf-y" type="password" className="input" autoComplete="new-password" value={s.conf} onValue={inp('pfConf')} />, { req: 1, err: s.err.conf || (s.conf && s.conf !== s.next ? '새 비밀번호와 일치하지 않습니다.' : '') })}</> : null}
          </>
        ),
        foot: <><button className="btn btn-secondary" onClick={act('closeOv')}>취소</button><button className="btn btn-primary" onClick={act('pfSave')}>저장</button></>,
      };
    },
  });
};
export const PW_RULES: [string, RegExp][] = [['8~20자', /^\S{8,20}$/], ['영문 대문자', /[A-Z]/], ['소문자', /[a-z]/], ['숫자', /\d/]];
IN.pfName = (v) => { ovs<ProfileState>().name = v; };
IN.pfCur = (v) => { ovs<ProfileState>().cur = v; };
IN.pfNext = (v) => { ovs<ProfileState>().next = v; ovs<ProfileState>().err.next = ''; refreshOverlay(); };
IN.pfConf = (v) => { ovs<ProfileState>().conf = v; ovs<ProfileState>().err.conf = ''; refreshOverlay(); };
ACT.pfPw = () => { ovs<ProfileState>().pw = !ovs<ProfileState>().pw; refreshOverlay(); };
// 저장: 이름 검증 + [비밀번호 변경]을 펼쳤으면 세 칸 모두 검사(접으면 비밀번호는 바꾸지 않음). 오류는 각 칸 아래에 표시
ACT.pfSave = () => {
  const s = ovs<ProfileState>(); const err: ProfileState['err'] = {}; const name = s.name.trim();
  if (!name) err.name = '이름을 입력해주세요.';
  else if (!NAME_RE.test(name)) err.name = '이름은 한글, 영문, 숫자만 입력할 수 있습니다.';
  if (s.pw) {
    if (!s.cur) err.cur = '현재 비밀번호를 입력해주세요.';
    if (!s.next) err.next = '새 비밀번호를 입력해주세요.';
    else if (!PW_RULES.every(([, re]) => re.test(s.next))) err.next = '8~20자, 공백 없이 영문 대문자·소문자·숫자를 모두 넣어주세요.';
    if (!s.conf) err.conf = '새 비밀번호를 한 번 더 입력해주세요.';
    else if (s.conf !== s.next) err.conf = '새 비밀번호와 일치하지 않습니다.';
  }
  if (Object.keys(err).length) { s.err = err; refreshOverlay(); return; }
  const a = me(); // 본인 계정 변경은 조직 활동 로그에 보이지 않는 이벤트(03 문서 7장 "조직 로그 X") — 감사 로그에만 플랫폼(조직 없음)으로 1건
  if (name !== a.name) { addAudit(null, 'ACCOUNT', '내 정보 수정', `${name}(${a.email})`, [['이름', a.name, name]]); a.name = name; }
  if (s.pw) addAudit(null, 'AUTH', '비밀번호 변경', `${name}(${a.email})`); // 값은 기록하지 않음
  closeOverlay(); render(); toast(s.pw ? '내 정보를 저장했습니다. 비밀번호를 변경했습니다.' : '내 정보를 저장했습니다.');
};

export function page403(kind: 'admin' | 'org'): ReactNode {
  if (kind === 'org' && isSA() && !myMem()) {
    return (
      <div className="blank"><span className="bi">{icon('lock', 'lg')}</span><h2>서비스 관리자는 조직 관리를 사용하지 않습니다</h2>
        <p>서비스 관리자 계정은 <b>플랫폼 멤버십</b>만 있어 어느 조직에도 속하지 않습니다. 조직 정보·플랜·멤버·권한·AI 모델 설정은 각 조직의 <b>조직 관리자</b>가 [조직 관리]에서 변경합니다.<br />서비스 관리자는 관리자 콘솔에서 조직 생성·정지·삭제, 조직 관리자 지정 등 운영 기능을 사용합니다.</p>
        <button className="btn btn-primary mt12" onClick={act('nav', { href: '/admin/organizations' })}>관리자 콘솔로 이동</button>
        <p className="faint" style={{ fontSize: '12px' }}>메뉴에서 숨겨진 화면에 URL로 직접 접근해도 이 화면이 표시되며, 서버 API도 403(FORBIDDEN)을 반환합니다.</p></div>
    );
  }
  const admins = CUR_ORG ? activeAdmins(CUR_ORG).map((m) => acct(m.userId)) : [];
  return (
    <div className="blank"><span className="bi">{icon('lock', 'lg')}</span><h2>접근 권한이 없습니다</h2>
      <p>{kind === 'admin' ? <>관리자 콘솔은 <b>서비스 관리자</b>만 사용할 수 있습니다. 권한이 필요하면 운영팀(서비스 관리자)에게 요청하세요.</> : <>조직 관리는 <b>{`${orgName()}의 조직 관리자`}</b>만 사용할 수 있습니다. 권한이 필요하면 조직 관리자에게 요청하세요.</>}</p>
      {kind === 'org' ? <div className="card" style={{ minWidth: '360px', textAlign: 'left', marginTop: '6px' }}><div className="sec-t">{`${orgName()} 조직 관리자`}</div>{admins.map((a, i) => <div key={i} className="row" style={{ padding: '6px 0' }}>{userCell(a)}</div>)}</div> : null}
      <button className="btn btn-primary mt12" onClick={act('nav', { href: '/workspace' })}>워크스페이스로 돌아가기</button>
      <p className="faint" style={{ fontSize: '12px' }}>메뉴에서 숨겨진 화면에 URL로 직접 접근해도 이 화면이 표시되며, 서버 API도 403(FORBIDDEN)을 반환합니다.</p></div>
  );
}
