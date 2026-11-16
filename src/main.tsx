/* ==========================================================
   PROBA 관리자 콘솔 · 조직 관리 프로토타입 (React + TypeScript)
   목업 데이터 (가상의 조직·사용자 — 실제 고객 데이터 아님) · 기준 시각: 2026-11-11 10:45 (KST)
   ========================================================== */
import './styles/prototype.css';
import { Layers, Overlays, installGlobalListeners, installTooltip, mountRoots, render } from './core';
import './pages';
import './app/nav';
import { App } from './app/App';
import { ProtoPanel, installProtoPanel } from './app/protoPanel';
import { installProtoApi } from './app/protoApi';

mountRoots({ App, Overlays, Layers, Panel: ProtoPanel });
installGlobalListeners();
installTooltip();
installProtoPanel();
installProtoApi();

/* ---------------- 부팅 ---------------- */
if (/capture/.test(location.search)) document.body.classList.add('capture');
render();
