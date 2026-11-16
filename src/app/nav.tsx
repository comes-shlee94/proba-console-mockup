/* 화면 이동 (원본 ACT.nav): 권한 관리에서 저장하지 않은 변경이 있으면 나가기 확인 */
import { ACT, ST, confirmModal, go, parseHash } from '../core';
import { permDirtyCount } from '../pages/org/perms';

ACT.nav = (d) => {
  const leaving = parseHash().path === '/org/permissions' && d.href !== '/org/permissions';
  if (leaving && permDirtyCount() > 0) {
    confirmModal({ title: '저장하지 않은 변경 사항이 있습니다', body: <p>{`권한 변경 ${permDirtyCount()}건이 저장되지 않았습니다.`}<br />이 페이지를 나가면 변경 사항이 사라집니다.</p>, confirmLabel: '나가기', danger: true, icon: 'alert', onConfirm: () => { ST.ui.perm.draft = null; go(d.href); } });
    return;
  }
  go(d.href);
};
