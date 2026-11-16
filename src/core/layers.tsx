/* #toast-root 루트: 토스트(#toast-root 안) + 행 메뉴·사용자 메뉴(body에 portal) */
import { MenuLayer } from './menu';
import { Toasts } from './toast';

export function Layers() {
  return <><Toasts /><MenuLayer /></>;
}
