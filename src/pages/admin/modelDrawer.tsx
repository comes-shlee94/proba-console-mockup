/* ---------- SA-31 모델 등록·수정 (드로어) — 수정 시 단가 일정 ---------- */
import type { ReactNode } from 'react';
import type { Change, Model, PriceKey, PriceVersion, Promo, TierKey, TierPrice } from '../../types';
import { MONTH_START, NOW_KEY, PROVIDERS, applyPromo, baseAt, effPrice, promoAt, syncModel } from '../../data';
import {
  ACT, CH, IN, ST, Check, Input, act, ch, inp,
  addAudit, badge, closeOverlay, confirmModal, ctxK, field, fmt, icon, josa, me, nextId, notice, nowStr, openOverlay, ovs,
  refreshOverlay, render, sel, toast, usdp,
  type OverlayView, type SelOpt,
} from '../../core';
import { PRICE_ROWS, priceSummary, promoSummary, tag } from './models';
import { buildPrice, diffPrices, emptyP, hasErr, pfOf, priceGridHtml, tierFields, validatePrices, type PriceErr, type PriceForm } from './priceForm';

// 원본은 단가 입력 공통 섹션(priceForm.tsx 자리)에서 선언 — 값을 바꾸는 이 모듈로 옮김 (import한 바인딩은 읽기 전용)
let PV_SEQ = 100; let PR_SEQ = 100;

/** 원본은 값이 없으면 null을 넣음 (context · retiresAt · deactivatedAt) — 도메인 타입은 undefined만 받으므로 이 모듈 안에서만 넓혀 씀 */
type ModelRec = Omit<Model, 'context' | 'retiresAt' | 'deactivatedAt'> & { context: number | null; retiresAt?: string | null; deactivatedAt?: string | null };
/** 단가 일정 표의 한 줄 */
interface SchRow { at: string; kind: string; period: ReactNode; text: string; note: string; st: [string, string]; act: ReactNode }

ACT.mdCreate = () => openModelDrawer(null);
function scheduleRows(m: Model): ReactNode {
  const cur = baseAt(m);
  const vers = m.versions.map((v): SchRow => {
    const next = m.versions.filter((x) => !x.canceled && x.from > v.from).sort((a, b) => (a.from > b.from ? 1 : -1))[0];
    const st: [string, string] = v.canceled ? ['취소됨', 'b-gray'] : v.from > NOW_KEY ? ['예정', 'b-violet'] : v === cur ? ['적용 중', 'b-blue'] : ['종료', 'b-gray'];
    return { at: v.from, kind: '기본 단가', period: <>{v.from}<br />{`~ ${next && !v.canceled ? next.from : ''}`}</>, text: priceSummary(v), note: v.note, st, act: !v.canceled && v.from > NOW_KEY ? <button className="link" onClick={act('schVerCancel', { m: m.id, id: v.id })}>취소</button> : null };
  });
  const pros = (m.promos || []).map((p): SchRow => {
    const ended = p.endedAt || p.to < NOW_KEY;
    const st: [string, string] = p.canceled ? ['취소됨', 'b-gray'] : p.from > NOW_KEY ? ['예정', 'b-violet'] : ended ? ['종료', 'b-gray'] : ['진행 중', 'b-amber'];
    // 원본 지역 변수 이름은 act — core의 act()와 겹쳐 이름만 바꿈
    const actBtn = p.canceled || ended ? null : p.from > NOW_KEY ? <button className="link" onClick={act('schPromoCancel', { m: m.id, id: p.id })}>취소</button> : <button className="link" onClick={act('schPromoEnd', { m: m.id, id: p.id })}>지금 종료</button>;
    return { at: p.from, kind: '기간 할인', period: p.endedAt ? <>{p.from}<br />{`~ ${p.endedAt} `}<span className="faint">{`(조기 종료 · 예정 ${p.to.slice(5)})`}</span></> : <>{p.from}<br />{`~ ${p.to}`}</>, text: `${p.title} · ${promoSummary(p, baseAt(m, p.from))}`, note: p.note, st, act: actBtn };
  });
  return [...vers, ...pros].sort((a, b) => (a.at < b.at ? 1 : -1)).map((r, i) => <tr key={i}><td>{badge(r.kind, r.kind === '기간 할인' ? 'b-amber' : 'b-outline')}</td><td className="num" style={{ fontSize: '12px' }}>{r.period}</td><td><div className="two"><span className="p" style={{ fontWeight: '400', fontSize: '12px' }}>{r.text}</span>{r.note ? <span className="s">{r.note}</span> : null}</div></td><td>{badge(r.st[0], r.st[1], true)}</td><td className="c" style={{ whiteSpace: 'nowrap' }}>{r.act}</td></tr>);
}
function schedulePanel(m: Model): ReactNode {
  const e = effPrice(m); const tiers: TierKey[] = e.tiered ? ['short', 'long'] : ['short'];
  const head = tiers.map((t) => (e.tiered ? (t === 'short' ? <><span className="tier">S</span>Short <span className="faint">{`(≤ ${ctxK(e.threshold)})`}</span></> : <><span className="tier long">L</span>Long <span className="faint">{`(> ${ctxK(e.threshold)})`}</span></>) : '단가'));
  const cur = <table className="price-grid ro"><thead><tr><th style={{ width: '110px' }}>구분</th>{head.map((h, i) => <th key={i}>{h}</th>)}</tr></thead><tbody>{PRICE_ROWS.map(([k, l], i) => <tr key={i}><td className="lab">{l}</td>{tiers.map((t, j) => { const v = e.price[t]![k]; const b = e.base.price[t] ? e.base.price[t]![k] : null; return <td key={j} className="num">{v == null ? <span className="faint">없음</span> : <b>{usdp(v)}</b>}{e.promo && b != null && v !== b ? <>{' '}<s className="faint">{usdp(b)}</s></> : null}</td>; })}</tr>)}</tbody></table>;
  return (
    <>
      <div className="row" style={{ gap: '8px' }}><span className="sub-t">현재 적용 단가</span><span className="faint" style={{ fontSize: '12px' }}>{`${NOW_KEY} 기준`}</span>{e.promo ? tag('promo', <>{icon('zap', 'sm')}{`할인 중 ~${e.promo.to.slice(5, 10)}`}</>) : null}<span className="ml-auto row" style={{ gap: '6px' }}><button className="btn btn-sm btn-secondary" onClick={act('mfPriceChange', { id: m.id })}>{icon('pencil', 'sm')}단가 변경</button><button className="btn btn-sm btn-secondary" onClick={act('mfPromoAdd', { id: m.id })}>{icon('zap', 'sm')}기간 할인 추가</button></span></div>
      <div className="mt8">{cur}</div>
      <p className="sub-t" style={{ marginTop: '16px', marginBottom: '8px' }}>단가 일정 <span className="faint" style={{ fontWeight: '400' }}>최근 순</span></p>
      <div className="tbl-wrap" style={{ border: '1px solid var(--hairline)' }}><table className="tbl sched"><colgroup><col style={{ width: '86px' }} /><col style={{ width: '136px' }} /><col /><col style={{ width: '88px' }} /><col style={{ width: '74px' }} /></colgroup><thead><tr><th>구분</th><th>기간 (KST)</th><th>내용</th><th>상태</th><th></th></tr></thead><tbody>{scheduleRows(m)}</tbody></table></div>
      <p className="help mt8" style={{ fontSize: '12px', color: 'var(--faint)', lineHeight: '1.6' }}>기본 단가는 적용 시작 시각부터 다음 변경 전까지, 기간 할인은 기간 안의 요청에만 적용되고 끝나면 자동으로 기본 단가로 돌아갑니다. 요청마다 적용한 단가를 기록하므로 이미 계산된 사용 금액은 바뀌지 않습니다(진행 중인 달 안의 과거 시각으로 등록한 경우만 그 이후 사용분을 다시 계산).</p>
    </>
  );
}
type MfErr = PriceErr & { modelId?: string; context?: string; maxOutput?: string };
/** 등록: 단가 입력(tiered · threshold · p) 포함 · 수정(id 있음): 기본 정보만 (단가는 단가 일정에서) */
interface MfState extends PriceForm { id?: string; provider: string; modelId: string; name: string; context: string; maxOutput: string; retiresAt: string; active: boolean; err: MfErr }
export function openModelDrawer(m: Model | null | undefined) {
  openOverlay<MfState>({
    drawer: true, width: 720,
    // 수정 상태에는 단가 입력값이 없음 (원본 그대로 — 수정 화면은 단가 입력을 쓰지 않음)
    state: m ? ({ id: m.id, provider: m.provider, modelId: m.name, name: m.label || '', context: String(m.context || ''), maxOutput: String(m.maxOutput || ''), retiresAt: m.retiresAt || '', active: m.active, err: {} } as MfState)
      : { provider: 'OpenAI', modelId: '', name: '', context: '', maxOutput: '', retiresAt: '', tiered: false, threshold: '200000', p: { short: emptyP(), long: emptyP() }, active: true, err: {} },
    view: (s: MfState): OverlayView => {
      const md = s.id ? ST.models.find((x) => x.id === s.id) : null;
      const ok = s.modelId.trim() && (md || ((s.tiered ? ['short', 'long'] : ['short']) as TierKey[]).every((t) => s.p[t].in !== '' && s.p[t].out !== ''));
      return {
        title: md ? `${md.label || md.name} 수정` : '모델 등록', sub: md ? <><span className="mono">{md.name}</span>{` · ${md.provider} · 등록 ${md.createdAt}`}</> : '서비스 관리자만 등록할 수 있으며, 조직은 활성 모델 중 사용할 모델을 선택합니다.',
        body: (
          <>
            <div><p className="sec-t">1. 기본 정보</p><div className="form-grid">
              {field('공급자', sel('pv', PROVIDERS.map((x): SelOpt => [x, x]), s.provider, { onChange: ch('mfProv'), disabled: !!md }), { req: 1, help: md ? '등록 후 변경할 수 없습니다' : 'LLM을 제공하는 회사' })}
              {field('모델 ID', <Input id="f-mf-id" className="input mono" placeholder="예: gpt-6-luna" value={s.modelId} onValue={inp('mfId')} readOnly={!!md} />, { req: 1, help: md ? '등록 후에는 변경할 수 없습니다(이력 재현성)' : '공급자 API에서 쓰는 모델 식별자 · 공급자 안에서 중복 불가', err: s.err.modelId })}
              {field('표시 이름', <Input id="f-mf-name" className="input" placeholder="미입력 시 모델 ID 사용" value={s.name} onValue={inp('mfName')} />, { help: '조직 화면(AI 모델·Judge·Prompt)에 보이는 이름' })}
              {field('최대 컨텍스트(토큰)', <Input id="f-mf-ctx" className="input num" inputMode="numeric" placeholder="예: 1048576" value={s.context} onValue={inp('mfCtx')} />, { help: s.context ? `화면 표기: ${ctxK(Number(s.context) || 0)}` : '선택 · 공급자 문서의 입력 토큰 한도', err: s.err.context })}
              {field('최대 출력(토큰)', <Input id="f-mf-out" className="input num" inputMode="numeric" placeholder="예: 65536" value={s.maxOutput} onValue={inp('mfOut')} />, { help: s.maxOutput ? `화면 표기: ${ctxK(Number(s.maxOutput) || 0)}` : '선택 · 공급자 문서의 최대 출력 토큰 수(한 번의 응답 한도)', err: s.err.maxOutput })}
              {field('공급자 지원 종료일', <Input id="f-mf-ret" type="date" className="input" value={s.retiresAt} onValue={inp('mfRetire')} />, { help: '선택 · 공급자가 지원 종료(deprecation)를 공지한 날짜 — 목록과 조직 화면에 표시' })}</div></div>
            <div><p className="sec-t">2. 단가 <span className="faint" style={{ fontWeight: '400' }}>USD · 1M 토큰당 · 공급자 원가</span></p>
              {md ? schedulePanel(md) : <>{tierFields(s, 'mf', 'mfTier', 'mfTh')}<div className="mt8">{priceGridHtml(s, 'mf', 'mfPrice')}</div>
                {s.err.priceMsg ? <p className="err mt8" style={{ fontSize: '12px', color: 'var(--red-line)' }}>{icon('alert', 'sm')}{` ${s.err.priceMsg}`}</p> : null}
                <p className="help mt8" style={{ fontSize: '12px', color: 'var(--faint)', lineHeight: '1.6' }}><b>캐시 쓰기</b>: 프롬프트를 캐시에 저장할 때 입력 토큰에 적용(PROBA 기본 유지 시간 기준: Anthropic 5분, OpenAI 30분) · <b>캐시 읽기</b>: 캐시된 입력을 다시 읽을 때 적용 · 비워 두면 일반 입력 단가로 계산합니다.<br />등록 시각 이후 요청부터 적용되며, 이후 공급자의 가격 변경·기간 할인은 <b>단가 일정</b>에서 등록합니다.</p></>}</div>
            <div className="row" style={{ justifyContent: 'space-between', background: 'var(--canvas)', padding: '12px', borderRadius: '10px' }}><div><b style={{ fontSize: '13px' }}>{md ? '활성 상태' : '등록 후 바로 활성화'}</b><div className="faint" style={{ fontSize: '12px' }}>비활성 모델은 조직 화면에서 사용 설정할 수 없습니다</div></div><button className={`switch ${s.active ? 'on' : ''}`} onClick={act('mfActive')} disabled={!!(md && md.isDefault)} data-tip={md && md.isDefault ? '서비스 기본 모델은 비활성화할 수 없습니다' : undefined}></button></div>
          </>
        ),
        foot: <><button className="btn btn-secondary" onClick={act('closeOv')}>{md ? '닫기' : '취소'}</button><button className="btn btn-primary" onClick={act('mfSave')} disabled={!ok}>{md ? '기본 정보 저장' : '등록'}</button></>,
      };
    },
  });
}
CH.mfProv = (v) => { ovs<MfState>().provider = v; ovs<MfState>().err.modelId = ''; refreshOverlay(); };
IN.mfId = (v) => { ovs<MfState>().modelId = v; ovs<MfState>().err.modelId = ''; refreshOverlay(); };
IN.mfName = (v) => { ovs<MfState>().name = v; };
IN.mfCtx = (v) => { ovs<MfState>().context = v.replace(/[^\d]/g, ''); ovs<MfState>().err.context = ''; ovs<MfState>().err.maxOutput = ''; refreshOverlay(); };
IN.mfOut = (v) => { ovs<MfState>().maxOutput = v.replace(/[^\d]/g, ''); ovs<MfState>().err.maxOutput = ''; refreshOverlay(); };
// 최대 출력은 최대 컨텍스트보다 클 수 없음(둘 다 입력했을 때만 검사) — v0.16
const outErr = (ctx: number | null, out: number | null) => (ctx && out && out > ctx ? '최대 출력은 최대 컨텍스트보다 클 수 없습니다.' : '');
IN.mfRetire = (v) => { ovs<MfState>().retiresAt = v; };
IN.mfTh = (v) => { ovs<MfState>().threshold = v.replace(/[^\d]/g, ''); ovs<MfState>().err.threshold = ''; refreshOverlay(); };
// 원본 el.dataset.t / el.dataset.k → inp('mfPrice', { t, k })로 넘긴 데이터 d.t / d.k
IN.mfPrice = (v, _el, _e, d) => { const s = ovs<MfState>(); s.p[d!.t as TierKey][d!.k as PriceKey] = v.trim(); if (s.err.price) { delete s.err.price[`${d!.t}.${d!.k}`]; s.err.priceMsg = ''; } refreshOverlay(); };
ACT.mfTier = (d) => { ovs<MfState>().tiered = d.v === '1'; refreshOverlay(); };
ACT.mfActive = () => { ovs<MfState>().active = !ovs<MfState>().active; refreshOverlay(); };
ACT.mfSave = () => {
  const s = ovs<MfState>(); const modelId = s.modelId.trim();
  if (s.id) { // 수정: 기본 정보만 저장 (단가는 단가 일정에서)
    const m = ST.models.find((x) => x.id === s.id) as ModelRec; const chg: Change[] = [];
    const label = s.name.trim() && s.name.trim() !== m.name ? s.name.trim() : '';
    const ctx = Number(s.context) || null; const out = Number(s.maxOutput) || null;
    if (ctx && m.tiered && ctx <= (m.threshold as number)) { s.err = { context: '최대 컨텍스트는 Long 구간 기준보다 커야 합니다.' }; refreshOverlay(); return; }
    if (outErr(ctx, out)) { s.err = { maxOutput: outErr(ctx, out) }; refreshOverlay(); return; }
    if ((m.label || '') !== label) chg.push(['표시 이름', m.label || '-', label || '-']);
    if ((m.context || null) !== ctx) chg.push(['최대 컨텍스트', m.context ? fmt(m.context) : '-', ctx ? fmt(ctx) : '-']);
    if ((m.maxOutput || null) !== out) chg.push(['최대 출력', m.maxOutput ? fmt(m.maxOutput) : '-', out ? fmt(out) : '-']);
    if ((m.retiresAt || '') !== (s.retiresAt || '')) chg.push(['공급자 지원 종료일', m.retiresAt || '-', s.retiresAt || '-']);
    Object.assign(m, { label, context: ctx, maxOutput: out, retiresAt: s.retiresAt || null });
    if (chg.length) addAudit(null, 'MODEL', '모델 정보 수정', m.name, chg);
    const deact = m.active && !s.active;
    if (!m.active && s.active) { m.active = true; m.deactivatedAt = null; addAudit(null, 'MODEL', '모델 활성화', m.name, [['활성', '아니오', '예']]); }
    closeOverlay(); render(); toast(chg.length ? '모델 정보를 저장했습니다.' : '변경된 기본 정보가 없습니다.', chg.length ? 'success' : 'info');
    if (deact) ACT.mdToggle({ id: m.id });
    return;
  }
  const err: MfErr = validatePrices(s);
  if (ST.models.some((x) => x.provider === s.provider && x.name === modelId)) err.modelId = '같은 공급자에 이미 등록된 모델 ID입니다.';
  if (s.context && s.tiered && Number(s.context) <= Number(s.threshold)) err.context = '최대 컨텍스트는 Long 구간 기준보다 커야 합니다.';
  if (outErr(Number(s.context) || null, Number(s.maxOutput) || null)) err.maxOutput = outErr(Number(s.context) || null, Number(s.maxOutput) || null);
  if (hasErr(err)) { s.err = err; refreshOverlay(); return; }
  const price = buildPrice(s);
  const m: Omit<ModelRec, 'tiered' | 'threshold' | 'price'> = { id: nextId(ST.models, 'MDL-'), name: modelId, label: s.name.trim() && s.name.trim() !== modelId ? s.name.trim() : '', provider: s.provider, context: Number(s.context) || null, maxOutput: Number(s.maxOutput) || null, active: s.active, isDefault: false, activePlans: 0, schedules: 0, createdAt: '2026-11-11', hasHistory: false, retiresAt: s.retiresAt || null,
    versions: [{ id: 'PV-' + (++PV_SEQ), from: NOW_KEY, tiered: s.tiered, threshold: s.tiered ? Number(s.threshold) : null, price, note: '최초 등록', by: me().name }], promos: [] };
  syncModel(m as Model); ST.models.push(m as Model);
  addAudit(null, 'MODEL', '모델 등록', modelId, [['공급자', '-', s.provider], ['단가 구간', '-', s.tiered ? `Short·Long (기준 ${ctxK(Number(s.threshold))})` : '단일'], ['입력 · 출력 단가', '-', `${usdp(price.short!.in)} · ${usdp(price.short!.out)}`]]);
  closeOverlay(); render(); toast(`${josa(modelId, '을/를')} 등록했습니다.`);
};

/* ---------- SA-35 단가 변경 (영구 변경 · 즉시 또는 예약) ---------- */
type PcErr = PriceErr & { at?: string };
interface PcState extends PriceForm { id: string; when: string; at: string; note: string; err: PcErr }
ACT.mfPriceChange = (d) => openPriceChange(ST.models.find((x) => x.id === d.id)!);
export function openPriceChange(m: Model) {
  const b = baseAt(m);
  openOverlay<PcState>({
    width: 720,
    state: { id: m.id, when: 'AT', at: '2026-12-01T00:00', tiered: b.tiered, threshold: String(b.threshold || 200000), p: { short: pfOf(b, 'short'), long: b.tiered ? pfOf(b, 'long') : emptyP() }, note: '', err: {} },
    view: (s: PcState): OverlayView => {
      const at = s.when === 'NOW' ? NOW_KEY : s.at.replace('T', ' ');
      const past = s.when === 'AT' && at < NOW_KEY && at >= MONTH_START;
      const pr = promoAt(m);
      return {
        title: `${m.label || m.name} 단가 변경`, icon: 'pencil',
        body: (
          <>
            <div className="kv"><span className="k">현재 기본 단가</span><span className="v">{`${priceSummary(b)} `}<span className="faint">{`· ${b.from}부터 적용 중`}</span></span>{pr ? <><span className="k">진행 중인 할인</span><span className="v">{`${pr.title} · ~${pr.to}`}</span></> : null}</div>
            <div className="field"><span className="lbl">적용 시작<span className="req">*</span></span>
              <div className="row" style={{ gap: '18px', flexWrap: 'wrap' }}><label className="radio"><Check type="radio" name="rg-pcWhen" checked={s.when === 'NOW'} onClick={act('pcWhen', { v: 'NOW' })} /><span><b>지금 바로</b></span></label>
                <label className="radio"><Check type="radio" name="rg-pcWhen" checked={s.when === 'AT'} onClick={act('pcWhen', { v: 'AT' })} /><span><b>날짜·시각 지정</b></span></label>
                {s.when === 'AT' ? <Input id="f-pc-at" type="datetime-local" className={`input ${s.err.at ? 'err' : ''}`} style={{ width: '220px' }} value={s.at} onValue={inp('pcAt')} /> : null}</div>
              {s.err.at ? <span className="err">{icon('alert', 'sm')}{s.err.at}</span> : <span className="help">공급자가 공지한 적용 시각(KST)을 입력합니다. 미래 시각이면 예약되고, 그 시각 이후 요청부터 새 단가로 계산합니다.</span>}</div>
            {past ? notice(<>과거 시각입니다. <b>{at}</b> 이후 사용분의 사용 금액을 새 단가로 다시 계산합니다(진행 중인 달 안에서만 가능).</>, 'warn', 'alert') : null}
            <div><p className="sec-t" style={{ marginBottom: '8px' }}>새 기본 단가 <span className="faint" style={{ fontWeight: '400' }}>USD · 1M 토큰당</span></p>{tierFields(s, 'pc', 'pcTier', 'pcTh')}<div className="mt12">{priceGridHtml(s, 'pc', 'pcPrice')}</div><p className="help mt8" style={{ fontSize: '12px', color: 'var(--faint)' }}>현재 기본 단가가 채워져 있습니다. 바뀌는 값만 수정하세요.</p>
              {s.err.priceMsg ? <p className="err mt8" style={{ fontSize: '12px', color: 'var(--red-line)' }}>{icon('alert', 'sm')}{` ${s.err.priceMsg}`}</p> : null}</div>
            {field('메모', <Input id="f-pc-note" className="input" maxLength={100} placeholder="예: 공급자 가격표 변경 공지(2026-11-20)" value={s.note} onValue={inp('pcNote')} />, { help: '단가 일정과 감사 로그에 함께 기록됩니다' })}
            {pr ? notice('진행 중인 기간 할인은 그대로 유지됩니다. 할인율 방식이면 새 기본 단가에 할인율을 적용하고, 할인 단가 방식이면 기간이 끝날 때까지 할인 단가를 적용합니다.', '') : null}
          </>
        ),
        foot: <><button className="btn btn-secondary" onClick={act('closeOv')}>취소</button><button className="btn btn-primary" onClick={act('pcSave')}>{at > NOW_KEY ? '변경 예약' : '변경'}</button></>,
      };
    },
  });
}
ACT.pcWhen = (d) => { ovs<PcState>().when = d.v; ovs<PcState>().err.at = ''; refreshOverlay(); };
IN.pcAt = (v) => { ovs<PcState>().at = v; ovs<PcState>().err.at = ''; refreshOverlay(); };
ACT.pcTier = (d) => { const s = ovs<PcState>(); s.tiered = d.v === '1'; refreshOverlay(); };
IN.pcTh = (v) => { ovs<PcState>().threshold = v.replace(/[^\d]/g, ''); ovs<PcState>().err.threshold = ''; refreshOverlay(); };
IN.pcPrice = (v, _el, _e, d) => { const s = ovs<PcState>(); s.p[d!.t as TierKey][d!.k as PriceKey] = v.trim(); if (s.err.price) { delete s.err.price[`${d!.t}.${d!.k}`]; s.err.priceMsg = ''; } refreshOverlay(); };
IN.pcNote = (v) => { ovs<PcState>().note = v; };
ACT.pcSave = () => {
  const s = ovs<PcState>(); const m = ST.models.find((x) => x.id === s.id)!;
  const err: PcErr = validatePrices(s);
  const at = s.when === 'NOW' ? NOW_KEY : s.at.replace('T', ' ');
  if (s.when === 'AT') {
    if (!/^\d{4}-\d\d-\d\d \d\d:\d\d$/.test(at)) err.at = '적용 시작 날짜와 시각을 입력해주세요.';
    else if (at < MONTH_START) err.at = '마감된 달에는 적용할 수 없습니다. 2026-11-01 00:00 이후 시각을 선택하세요.';
    else if (m.versions.some((v) => !v.canceled && v.from === at)) err.at = '같은 시각에 등록된 단가가 있습니다.';
  }
  // 오류가 있으면 price는 null (원본 그대로 — 아래에서 저장하기 전에 반환)
  const v: PriceVersion = { id: 'PV-' + (++PV_SEQ), from: at, tiered: s.tiered, threshold: s.tiered ? Number(s.threshold) : null, price: (hasErr(err) ? null : buildPrice(s)) as TierPrice, note: s.note.trim() || '단가 변경', by: me().name };
  if (!hasErr(err) && !diffPrices(baseAt(m, at), v).length) err.priceMsg = '현재 기본 단가와 같습니다. 바꿀 단가를 입력하세요.';
  if (hasErr(err)) { s.err = err; refreshOverlay(); return; }
  const chg = diffPrices(baseAt(m, at), v); chg.push(['적용 시작', '-', at]);
  m.versions.push(v); syncModel(m);
  const future = at > NOW_KEY;
  addAudit(null, 'MODEL', future ? '모델 단가 변경 예약' : '모델 단가 변경', m.name, chg, s.note.trim() ? { reason: s.note.trim() } : {});
  closeOverlay(); render();
  toast(future ? `${m.name} 단가 변경을 ${at} 적용으로 예약했습니다.` : at < NOW_KEY ? `${m.name} 단가를 바꾸고 ${at} 이후 사용분을 다시 계산했습니다.` : `${m.name} 단가를 변경했습니다. 지금부터 새 단가가 적용됩니다.`);
};

/* ---------- SA-36 기간 할인 (프로모션·일시 인하) ---------- */
type PrErr = PriceErr & { period?: string; rate?: string };
interface PrState extends PriceForm { id: string; title: string; from: string; to: string; hoursMode: string; hFrom: string; hTo: string; mode: string; rate: string; items: Record<PriceKey, boolean>; note: string; err: PrErr }
ACT.mfPromoAdd = (d) => openPromoAdd(ST.models.find((x) => x.id === d.id)!);
export function openPromoAdd(m: Model) {
  const b = baseAt(m);
  openOverlay<PrState>({
    width: 720,
    state: { id: m.id, title: '', from: '2026-11-15T00:00', to: '2026-11-30T23:59', hoursMode: 'ALL', hFrom: '01:00', hTo: '09:00', mode: 'percent', rate: '20', items: { in: true, out: true, cw: true, cr: true }, tiered: b.tiered, threshold: String(b.threshold || ''), p: { short: pfOf(b, 'short'), long: b.tiered ? pfOf(b, 'long') : emptyP() }, note: '', err: {} },
    view: (s: PrState): OverlayView => {
      const items = PRICE_ROWS.map((r) => r[0]).filter((k) => s.items[k]);
      const okRate = /^\d{1,2}$/.test(s.rate) && Number(s.rate) >= 1;
      // 원본은 미리보기용으로 할인 방식·할인율·항목만 가진 객체를 applyPromo에 넘김
      const prev = s.mode === 'percent' && okRate && items.length ? priceSummary({ tiered: b.tiered, price: applyPromo(b, { mode: 'percent', rate: Number(s.rate), items } as Promo) }, true) : '';
      const high = s.mode === 'fixed' && ((b.tiered ? ['short', 'long'] : ['short']) as TierKey[]).some((t) => PRICE_ROWS.some(([k]) => s.p[t][k] !== '' && b.price[t]![k] != null && Number(s.p[t][k]) > b.price[t]![k]!));
      return {
        title: `${m.label || m.name} 기간 할인 추가`, icon: 'zap',
        body: (
          <>
            <div className="kv"><span className="k">현재 기본 단가</span><span className="v">{`${priceSummary(b)} `}<span className="faint">{`· ${b.from}부터`}</span></span></div>
            {field('이름', <Input id="f-pr-t" className="input" maxLength={40} placeholder="예: 공급자 프로모션" value={s.title} onValue={inp('prTitle')} />, { help: '단가 일정·감사 로그에 표시됩니다 · 비우면 "기간 할인"' })}
            <div className={`field ${s.err.period ? 'invalid' : ''}`}><span className="lbl">기간 (KST)<span className="req">*</span></span><div className="row" style={{ gap: '8px', flexWrap: 'wrap' }}><Input id="f-pr-from" type="datetime-local" className="input" style={{ width: '220px' }} value={s.from} onValue={inp('prFrom')} /><span className="muted">~</span><Input id="f-pr-to" type="datetime-local" className="input" style={{ width: '220px' }} value={s.to} onValue={inp('prTo')} /></div>{s.err.period ? <span className="err">{icon('alert', 'sm')}{s.err.period}</span> : <span className="help">기간 안의 요청에만 할인을 적용하고, 끝나면 자동으로 기본 단가로 돌아갑니다. 끝나는 날이 없는 인하는 [단가 변경]으로 등록하세요.</span>}</div>
            <div className="field"><span className="lbl">적용 시간대</span><div className="row" style={{ gap: '18px', flexWrap: 'wrap' }}><label className="radio"><Check type="radio" name="rg-prHours" checked={s.hoursMode === 'ALL'} onClick={act('prHours', { v: 'ALL' })} /><span><b>기간 내 항상</b></span></label><label className="radio"><Check type="radio" name="rg-prHours" checked={s.hoursMode === 'DAILY'} onClick={act('prHours', { v: 'DAILY' })} /><span><b>매일 특정 시간대만</b></span></label>{s.hoursMode === 'DAILY' ? <span className="row" style={{ gap: '6px' }}><Input type="time" className="input" style={{ width: '120px' }} value={s.hFrom} onValue={inp('prHFrom')} /><span className="muted">~</span><Input type="time" className="input" style={{ width: '120px' }} value={s.hTo} onValue={inp('prHTo')} /></span> : null}</div><span className="help">예: 공급자가 비혼잡 시간대에만 할인하는 경우 (KST 기준)</span></div>
            <div className="field"><span className="lbl">할인 방식<span className="req">*</span></span><div className="seg" style={{ alignSelf: 'flex-start', background: 'var(--canvas)' }}><button className={s.mode === 'percent' ? 'on' : ''} onClick={act('prMode', { v: 'percent' })}>할인율(%)</button><button className={s.mode === 'fixed' ? 'on' : ''} onClick={act('prMode', { v: 'fixed' })}>할인 단가 직접 입력</button></div></div>
            {s.mode === 'percent' ? <><div className="row" style={{ gap: '10px', flexWrap: 'wrap' }}><Input id="f-pr-rate" className={`input num ${s.err.rate ? 'err' : ''}`} style={{ width: '90px' }} inputMode="numeric" value={s.rate} onValue={inp('prRate')} /><span className="muted">% 할인 · 적용 항목</span>{PRICE_ROWS.map(([k, l], i) => <label key={i} className="check"><Check type="checkbox" checked={!!s.items[k]} onClick={act('prItem', { v: k })} /><span>{l}</span></label>)}</div>
              {s.err.rate ? <p className="err-line">{icon('alert', 'sm')}{` ${s.err.rate}`}</p> : prev ? <p className="help" style={{ fontSize: '12px', color: 'var(--subtle)' }}>할인 적용 단가: <b>{prev}</b></p> : null}</>
              : <>{priceGridHtml(s, 'pr', 'prPrice', b.tiered)}<p className="help mt8" style={{ fontSize: '12px', color: 'var(--faint)' }}>기본 단가가 채워져 있습니다. 할인되는 칸만 바꾸고, 비워 둔 칸은 기본 단가를 적용합니다.</p>
                {s.err.priceMsg ? <p className="err-line">{icon('alert', 'sm')}{` ${s.err.priceMsg}`}</p> : null}{high ? notice('기본 단가보다 높은 값이 있습니다. 할인이 아닌 일시 인상이라면 그대로 등록해도 됩니다.', 'warn', 'alert') : null}</>}
            {field('메모', <Input id="f-pr-note" className="input" maxLength={100} placeholder="예: 공급자 공지 내용·링크" value={s.note} onValue={inp('prNote')} />)}
            {notice('같은 모델에서 기간이 겹치는 할인은 등록할 수 없습니다. 시작 전에는 취소할 수 있고, 진행 중인 할인은 [지금 종료]로 앞당겨 끝낼 수 있습니다.', '')}
          </>
        ),
        foot: <><button className="btn btn-secondary" onClick={act('closeOv')}>취소</button><button className="btn btn-primary" onClick={act('prSave')}>등록</button></>,
      };
    },
  });
}
IN.prTitle = (v) => { ovs<PrState>().title = v; };
IN.prFrom = (v) => { ovs<PrState>().from = v; ovs<PrState>().err.period = ''; refreshOverlay(); };
IN.prTo = (v) => { ovs<PrState>().to = v; ovs<PrState>().err.period = ''; refreshOverlay(); };
ACT.prHours = (d) => { ovs<PrState>().hoursMode = d.v; refreshOverlay(); };
IN.prHFrom = (v) => { ovs<PrState>().hFrom = v; };
IN.prHTo = (v) => { ovs<PrState>().hTo = v; };
ACT.prMode = (d) => { ovs<PrState>().mode = d.v; ovs<PrState>().err = {}; refreshOverlay(); };
IN.prRate = (v) => { ovs<PrState>().rate = v.replace(/[^\d]/g, ''); ovs<PrState>().err.rate = ''; refreshOverlay(); };
ACT.prItem = (d) => { const s = ovs<PrState>(); s.items[d.v as PriceKey] = !s.items[d.v as PriceKey]; s.err.rate = ''; refreshOverlay(); };
IN.prPrice = (v, _el, _e, d) => { const s = ovs<PrState>(); s.p[d!.t as TierKey][d!.k as PriceKey] = v.trim(); if (s.err.price) { delete s.err.price[`${d!.t}.${d!.k}`]; s.err.priceMsg = ''; } refreshOverlay(); };
IN.prNote = (v) => { ovs<PrState>().note = v; };
ACT.prSave = () => {
  const s = ovs<PrState>(); const m = ST.models.find((x) => x.id === s.id)!; const err: PrErr = {};
  const from = s.from.replace('T', ' '); const to = s.to.replace('T', ' '); const b = baseAt(m, from);
  const re = /^\d{4}-\d\d-\d\d \d\d:\d\d$/;
  if (!re.test(from) || !re.test(to)) err.period = '시작·종료 날짜와 시각을 입력해주세요.';
  else if (from >= to) err.period = '종료 시각은 시작 시각보다 뒤여야 합니다.';
  else if (to <= NOW_KEY) err.period = '이미 끝난 기간은 등록할 수 없습니다.';
  else if (from < MONTH_START) err.period = '마감된 달이 포함된 기간은 등록할 수 없습니다. 2026-11-01 00:00 이후로 시작하세요.';
  else if (m.promos.some((p) => !p.canceled && p.from <= to && (p.endedAt ? from < p.endedAt : from <= p.to))) err.period = '기간이 겹치는 할인이 있습니다. 기존 할인을 취소하거나 기간을 조정하세요.';
  if (!err.period && s.hoursMode === 'DAILY' && (!s.hFrom || !s.hTo || s.hFrom === s.hTo)) err.period = '적용 시간대의 시작·종료 시각을 확인해주세요.';
  let promo: Pick<Promo, 'mode' | 'rate' | 'items' | 'price'>;
  if (s.mode === 'percent') {
    const items = PRICE_ROWS.map((r) => r[0]).filter((k) => s.items[k]);
    if (!/^\d{1,2}$/.test(s.rate) || Number(s.rate) < 1) err.rate = '할인율은 1~99 사이 정수로 입력해주세요.';
    else if (!items.length) err.rate = '할인을 적용할 항목을 하나 이상 선택하세요.';
    promo = { mode: 'percent', rate: Number(s.rate), items };
  } else {
    const ps = { ...s, tiered: b.tiered }; const e2 = validatePrices(ps, false);
    if (e2.priceMsg) { err.price = e2.price; err.priceMsg = '단가는 0 이상의 숫자(소수 넷째 자리까지)로 입력해주세요.'; }
    const price = err.priceMsg ? null : buildPrice(ps);
    if (price && ((b.tiered ? ['short', 'long'] : ['short']) as TierKey[]).every((t) => PRICE_ROWS.every(([k]) => price[t]![k] == null || price[t]![k] === b.price[t]![k]))) err.priceMsg = '기본 단가와 다른 할인 단가를 하나 이상 입력하세요.';
    promo = { mode: 'fixed', price: price as TierPrice }; // 오류가 있으면 null (원본 그대로 — 아래에서 저장하기 전에 반환)
  }
  if (hasErr(err)) { s.err = err; refreshOverlay(); return; }
  const p: Promo = { id: 'PR-' + (++PR_SEQ), title: s.title.trim() || '기간 할인', from, to, hours: s.hoursMode === 'DAILY' ? [s.hFrom, s.hTo] : null, ...promo, note: s.note.trim(), by: me().name, createdAt: nowStr() };
  m.promos.push(p);
  addAudit(null, 'MODEL', '기간 할인 등록', m.name, [['기간', '-', `${from} ~ ${to}`], ['할인', '-', promoSummary(p, b)]], s.note.trim() ? { reason: s.note.trim() } : {});
  closeOverlay(); render();
  toast(`기간 할인을 등록했습니다 (${from.slice(5)} ~ ${to.slice(5)}).${from < NOW_KEY ? ' 지난 기간의 사용분은 다시 계산합니다.' : ''}`);
};
const mById = (id: string) => ST.models.find((x) => x.id === id) as Model;
ACT.schVerCancel = (d) => {
  const m = mById(d.m); const v = m.versions.find((x) => x.id === d.id)!;
  confirmModal({ title: '예약된 단가 변경을 취소할까요?', icon: 'alert', danger: true, body: <p>{`${v.from}부터 적용 예정이던 단가(${priceSummary(v)})를 취소합니다. 현재 기본 단가가 계속 적용됩니다.`}</p>, confirmLabel: '예약 취소', onConfirm: () => { v.canceled = true; addAudit(null, 'MODEL', '단가 변경 예약 취소', m.name, [['적용 예정', v.from, '취소']]); render(); refreshOverlay(); toast('예약된 단가 변경을 취소했습니다.', 'info'); } });
};
ACT.schPromoCancel = (d) => {
  const m = mById(d.m); const p = m.promos.find((x) => x.id === d.id)!;
  confirmModal({ title: `'${p.title}' 할인을 취소할까요?`, icon: 'alert', danger: true, body: <p>{`${p.from} ~ ${p.to}에 적용 예정이던 할인을 취소합니다.`}</p>, confirmLabel: '할인 취소', onConfirm: () => { p.canceled = true; addAudit(null, 'MODEL', '기간 할인 취소', m.name, [['기간', `${p.from} ~ ${p.to}`, '취소']]); render(); refreshOverlay(); toast('기간 할인을 취소했습니다.', 'info'); } });
};
ACT.schPromoEnd = (d) => {
  const m = mById(d.m); const p = m.promos.find((x) => x.id === d.id)!;
  confirmModal({ title: `'${p.title}' 할인을 지금 종료할까요?`, icon: 'alert', danger: true, body: <p>{`지금 이후 요청부터 기본 단가(${priceSummary(baseAt(m))})로 계산합니다. 이미 계산된 사용분은 바뀌지 않습니다.`}</p>, confirmLabel: '지금 종료', onConfirm: () => { p.endedAt = NOW_KEY; addAudit(null, 'MODEL', '기간 할인 종료', m.name, [['종료 시각', p.to, `${NOW_KEY} (조기 종료)`]]); render(); refreshOverlay(); toast('기간 할인을 종료했습니다. 지금부터 기본 단가가 적용됩니다.', 'warning'); } });
};
