/* ==========================================================
   #app 루트 화면: 경로 · 권한에 따라 관리자 콘솔 / 조직 관리 / 워크스페이스 셸
   ========================================================== */
import { CUR_ORG, canOrgConsole, isOA, isSA, lnb, orgById, parseHash, topbar, trialSuspended, activityAllowed, type Page } from '../core';
import { pageOrgs } from '../pages/admin/orgs';
import { pageOrgDetail } from '../pages/admin/orgDetail';
import { pageUsers } from '../pages/admin/users';
import { pageModels } from '../pages/admin/models';
import { pageUsage } from '../pages/admin/usage';
import { pageAudit } from '../pages/admin/audit';
import { pageOrgInfo, pageOrgTrialLocked } from '../pages/org/info';
import { pageMembers } from '../pages/org/members';
import { pagePerms } from '../pages/org/perms';
import { pageOrgModels } from '../pages/org/models';
import { pageOrgUsage } from '../pages/org/usage';
import { pageActivity, pageActivityLocked } from '../pages/org/activity';
import { page403, pageOrgSuspended, pageWorkspace, wsShell } from '../pages/common/workspace';

export function App() {
  const { path } = parseHash();
  if (path.startsWith('/admin')) {
    return isSA() ? adminShell(path) : wsShell(page403('admin'), path);
  } else if (path.startsWith('/org')) {
    return canOrgConsole() ? orgShell(path) : isOA() ? wsShell(pageOrgSuspended(orgById(CUR_ORG)), path) : wsShell(page403('org'), path);
  }
  return wsShell(pageWorkspace(), path);
}

export function adminShell(path: string) {
  let page: Page;
  if (path === '/admin' || path === '/admin/organizations') page = pageOrgs();
  else if (path.startsWith('/admin/organizations/')) page = pageOrgDetail(path.split('/')[3]);
  else if (path === '/admin/users') page = pageUsers();
  else if (path === '/admin/models') page = pageModels();
  else if (path === '/admin/usage') page = pageUsage();
  else if (path === '/admin/audit-logs') page = pageAudit();
  else page = pageOrgs();
  const navPath = path === '/admin' ? '/admin/organizations' : path;
  return <div className="shell">{lnb('admin', navPath)}<div className="main">{topbar(['관리자 콘솔', ...page.crumbs])}<div className={`content ${page.cls || ''}`}>{page.body}</div></div></div>;
}

// v0.16: 브레드크럼에서 조직명 삭제(조직은 왼쪽 메뉴 위 '조직 관리' 영역에 표시)
export function orgShell(path: string) {
  let page: Page;
  if (path === '/org' || path === '/org/info') page = pageOrgInfo();
  else if (trialSuspended(orgById(CUR_ORG))) page = pageOrgTrialLocked(path);
  else if (path === '/org/members') page = pageMembers();
  else if (path === '/org/permissions') page = pagePerms();
  else if (path === '/org/models') page = pageOrgModels();
  else if (path === '/org/usage') page = pageOrgUsage();
  else if (path === '/org/activity') page = activityAllowed(orgById(CUR_ORG)) ? pageActivity() : pageActivityLocked();
  else page = pageOrgInfo();
  const navPath = path === '/org' ? '/org/info' : path;
  return <div className="shell">{lnb('org', navPath)}<div className="main">{topbar(['조직 관리', ...page.crumbs])}<div className={`content ${page.cls || ''}`}>{page.body}</div></div></div>;
}
