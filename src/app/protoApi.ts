/* ---------------- 캡처·시연용 API ---------------- */
import type { Access, PersonaKey, UiState } from '../types';
import { $, ACT, ST, acct, membershipsOfUser, orgById, ovs, refreshOverlay, render, CUR_ORG } from '../core';
import { openAssignAdmin, openDelete, openSuspend } from '../pages/admin/orgs';
import { openUserDrawer } from '../pages/admin/userDrawer';
import { openDisable, openSaDeactivate, openUnlock, saOrgItems } from '../pages/admin/users';
import { modelByName, openDeactivate } from '../pages/admin/models';
import { openModelDrawer, openPriceChange, openPromoAdd } from '../pages/admin/modelDrawer';
import { omToggle } from '../pages/org/models';
import { openOrgEdit, openPlanModal } from '../pages/org/info';
import { ensureDraft } from '../pages/org/perms';
import { mmDeactivate, mmRemove, mmRole } from '../pages/org/members';

export interface ProtoApi {
  persona(p: PersonaKey): void;
  go(path: string): void;
  ui<K extends keyof UiState>(key: K, patch: Partial<UiState[K]>): void;
  draftPerm(changes: [string, 'QA_ENGINEER' | 'VIEWER', any][]): void;
  open(name: string, arg?: any): void;
}
declare global {
  interface Window { PROTO: ProtoApi }
}

export function installProtoApi() {
  window.PROTO = {
    persona(p) { ST.persona = p; render(); },
    go(path) { location.hash = path; render(); },
    ui(key, patch) { Object.assign(ST.ui[key], patch); render(); },
    draftPerm(changes) { const d = ensureDraft(); changes.forEach(([k, r, v]) => { if (k in d.menus) d.menus[k][r] = v as Access; else d.actions[k][r] = v as boolean; }); render(); },
    open(name, arg) {
      const map: Record<string, () => void> = {
        userMenu: () => ACT.userMenu({}, $('#user-btn')!),
        orgCreate: () => { ACT.orgCreate({}); Object.assign(ovs(), arg || {}); refreshOverlay(); },
        orgMenu: () => { const b = document.querySelector<HTMLElement>(`[data-act="orgMenu"][data-id="${arg}"]`)!; ACT.orgMenu({ id: arg }, b); },
        plan: () => { openPlanModal(orgById(arg || CUR_ORG)); },
        planPick: () => { openPlanModal(orgById(CUR_ORG)); Object.assign(ovs(), arg || {}); refreshOverlay(); },
        orgEdit: () => { openOrgEdit(orgById(CUR_ORG)); Object.assign(ovs(), arg || {}); refreshOverlay(); },
        suspend: () => { openSuspend(orgById(arg)); Object.assign(ovs(), { reasonType: 'CONTRACT', reason: '계약 갱신 협의 중 (12월 재계약 예정)' }); refreshOverlay(); },
        delete: () => { openDelete(orgById(arg)); ovs().typed = orgById(arg).name; refreshOverlay(); },
        assign: () => openAssignAdmin(orgById(arg)),
        userDrawer: () => openUserDrawer(arg),
        unlock: () => openUnlock(acct(arg)),
        disable: () => { openDisable(acct(arg)); Object.assign(ovs(), { reason: '퇴사·계약 종료', detail: '(예시) 고객사 공문으로 담당자 교체 요청 · 후임자 계정은 별도 초대' }); refreshOverlay(); },
        // 회사 도메인과 관계없이 추가 · 이미 서비스 관리자인 이메일 오류 예시
        saAdd: () => { ACT.saAdd({}); const s = ovs(); s.chips = [{ email: 'qa.lead@comes.co.kr', existing: false, orgs: [] }, { email: 'ops.kim@cs-partner.example', existing: false, orgs: [] }, { email: 'jian.ryu@qa-partners.example', existing: true, orgs: saOrgItems(membershipsOfUser('U-46')) }]; s.input = 'sec.han@comes.co.kr'; s.err = '이미 서비스 관리자(플랫폼 멤버)인 계정입니다.'; refreshOverlay(); },
        userMenuOf: () => { const b = document.querySelector<HTMLElement>(`[data-act="usrRowMenu"][data-id="${arg}"]`)!; ACT.usrRowMenu({ id: arg }, b); },
        saDeactivate: () => { openSaDeactivate(acct(arg)); ovs().reason = '장기 출장 (2026-11-16 ~ 12-31)'; refreshOverlay(); },
        // 등록 예시: Google 가격표의 Gemini 2.5 Pro (200K 토큰 초과 시 Long 단가)
        modelDrawer: () => { openModelDrawer(null); Object.assign(ovs(), { provider: 'Google', modelId: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', context: '1048576', maxOutput: '65536', tiered: true, threshold: '200000', p: { short: { in: '1.25', out: '10.00', cw: '', cr: '0.125' }, long: { in: '2.50', out: '15.00', cw: '', cr: '0.25' } } }); refreshOverlay(); },
        modelEdit: () => openModelDrawer(ST.models.find((m) => m.name === arg)),
        priceChange: () => { const m = modelByName(arg.model)!; openModelDrawer(m); openPriceChange(m); Object.assign(ovs(), arg.state || {}); refreshOverlay(); },
        promoAdd: () => { const m = modelByName(arg.model)!; openModelDrawer(m); openPromoAdd(m); Object.assign(ovs(), arg.state || {}); refreshOverlay(); },
        deactivate: () => openDeactivate(ST.models.find((m) => m.id === arg)!),
        usageOrg: () => ACT.usgOrg({ id: arg }),
        orgModelOff: () => omToggle(arg),
        auditDrawer: () => ACT.openAudit({ id: arg }),
        invite: () => { ACT.mmInvite({}); const s = ovs(); s.list = [{ name: '강하람', email: 'haram.kang@comes.co.kr' }, { name: '이하준', email: 'hajun.lee@onmarket.example', existing: true }]; s.email = 'qa.choi@comes.co.kr'; s.name = '최현우'; s.err = { email: '이미 조직 멤버입니다.' }; refreshOverlay(); },
        roleChange: () => mmRole(ST.memberships.find((m) => m.id === arg)!),
        memberMenu: () => { const b = document.querySelector<HTMLElement>(`[data-act="mmMenu"][data-id="${arg}"]`)!; ACT.mmMenu({ id: arg }, b); },
        memberDeact: () => { mmDeactivate(ST.memberships.find((m) => m.id === arg.id)!); Object.assign(ovs(), arg.state || {}); refreshOverlay(); },
        memberRemove: () => { mmRemove(ST.memberships.find((m) => m.id === arg.id)!); Object.assign(ovs(), arg.state || {}); refreshOverlay(); },
        permSave: () => ACT.pmSave({}),
        profile: () => ACT.profile({}),
      };
      map[name] && map[name]();
    },
  };
}
