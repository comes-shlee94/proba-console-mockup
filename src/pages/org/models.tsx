/* ---------- OA-40 AI 모델 (조직 사용 설정) ---------- */
/* 포팅 메모: 원본에서 한 덩어리 문자열이던 글자는 템플릿 문자열 하나로 그림 — 텍스트 노드가 나뉘면 글자 위치가 미세하게 달라짐 */
import { Fragment } from 'react';
import type { Change, TierKey, TierPrice } from '../../types';
import { effPrice, nextPromo, nextVersion } from '../../data';
import { ACT, CUR_ORG, ST, act, addAudit, confirmModal, ctxK, fmt, icon, josa, notice, orgById, pageHead, render, toast, usdp, type Page } from '../../core';
import { modelByName, serviceDefault } from '../admin/models';

const orgModelSet = () => ST.orgModels[CUR_ORG!] || (ST.orgModels[CUR_ORG!] = { on: [serviceDefault()!.name], def: serviceDefault()!.name, plans: {} });
export function pageOrgModels(): Page {
  const o = orgById(CUR_ORG); const set = orgModelSet();
  const list = ST.models.filter((m) => m.active || set.on.includes(m.name));
  const rows = list.map((m, i) => {
    const on = set.on.includes(m.name); const isDef = set.def === m.name; const plans = set.plans[m.name] || 0;
    // 사용 단가 = 지금 적용되는 단가(공급자 단가 · 기간 할인 포함) — 사용 금액 계산에 쓰는 단가와 같음
    const e = effPrice(m); const up = (v: number | null | undefined) => usdp(v);
    const pp = (pr: TierPrice, t: TierKey) => `입력 ${up(pr[t]!.in)} · 출력 ${up(pr[t]!.out)}`;
    const lines = (pr: TierPrice) => (e.tiered ? <div className="price-cell"><span><span className="tier">S</span>{pp(pr, 'short')}</span><span><span className="tier long">L</span>{pp(pr, 'long')}</span></div> : pp(pr, 'short'));
    const nv = nextVersion(m); const np = nextPromo(m);
    // 원본은 .join('') 문자열 — 빈 항목('')은 빠지고, 모두 비면 ptags 영역을 그리지 않음
    const tags = [
      e.promo ? <span className="ptag promo" data-tip={`할인 전 단가: ${e.tiered ? 'S ' + pp(e.base.price, 'short') + ' / L ' + pp(e.base.price, 'long') : pp(e.base.price, 'short')}`}>{icon('zap', 'sm')}{`할인 중 ~${e.promo.to.slice(5, 10)}`}</span> : '',
      nv ? <span className="ptag sched" data-tip={`${nv.from}부터 새 단가 적용`}>{`${nv.from.slice(5, 10)}부터 단가 변경`}</span> : '',
      !e.promo && np ? <span className="ptag sched" data-tip={`${np.from} ~ ${np.to}`}>{`${np.from.slice(5, 10)}부터 할인`}</span> : '',
    ].filter((x) => x !== '').map((x, k) => <Fragment key={k}>{x}</Fragment>);
    return (
      <tr key={i} className={m.active ? '' : 'dim'}>
        {/* 원본: 이름 뒤 첫 공백은 이름과 한 텍스트 노드("이름 "), 그다음 배지 앞 공백은 배지 사이의 별도 텍스트 노드 */}
        <td><div className="two"><span className="p row" style={{ gap: '6px', flexWrap: 'wrap' }}>{`${m.label || m.name}${isDef || (m.retiresAt && m.active) ? ' ' : ''}`}{isDef ? <span className="badge b-violet" style={{ height: '18px', fontSize: '11px' }}>{icon('star', 'sm')}조직 기본</span> : null}{m.retiresAt && m.active ? <>{isDef ? ' ' : null}<span className="ptag retire" data-tip="공급자 지원 종료 예정일입니다. 서비스 관리자가 그 전에 대체 모델로 전환합니다.">{`지원 종료 ${m.retiresAt.slice(2).replace(/-/g, '.')}`}</span></> : null}</span>{m.label ? <span className="s mono">{m.name}</span> : null}{m.active ? null : <span className="s">서비스 관리자에 의해 비활성화됨</span>}</div></td>
        <td>{m.provider}</td>
        <td className="num">{lines(e.price)}{e.tiered ? <div className="faint" style={{ fontSize: '11px', marginTop: '2px' }}>{`Long: 요청 입력 ${ctxK(e.threshold)} 토큰 초과`}</div> : null}{tags.length ? <div className="ptags">{tags}</div> : null}</td>
        <td className="num" data-tip={`${fmt(m.context)} 토큰`}>{ctxK(m.context)}</td>
        <td className="num" data-tip={m.maxOutput ? `${fmt(m.maxOutput)} 토큰` : undefined}>{ctxK(m.maxOutput)}</td>
        <td className="num">{plans ? `${plans}건` : <span className="faint">-</span>}</td>
        <td className="c"><button className={`radio-dot ${isDef ? 'on' : ''}`} disabled={!on || !m.active} onClick={act('omDefault', { v: m.name })} aria-label={`${m.name} 조직 기본 모델로 지정`} data-tip={!on ? '사용 중인 모델만 기본으로 지정할 수 있습니다' : isDef ? '현재 조직 기본 모델' : '조직 기본 모델로 지정'}></button></td>
        <td className="c"><button className={`switch ${on ? 'on' : ''}`} disabled={!m.active} onClick={act('omToggle', { v: m.name })} aria-label={`${m.name} 사용`} aria-pressed={String(on) as 'true' | 'false'}></button></td>
      </tr>
    );
  });
  const body = (
    <>
      {pageHead('cpu', 'AI 모델', '사용할 LLM 모델과 조직 기본 모델 설정')}
      <div className="tbl-meta">사용 중 <b>{set.on.filter((n) => modelByName(n)?.active).length}</b>{`개 · 전체 ${list.length}개`}<span className="ml-auto faint">사용 모델은 최소 1개 · 기본 모델은 끌 수 없습니다(먼저 다른 모델을 기본으로 지정) · 단가: USD · 1M 토큰당</span></div>
      <div className="tbl-wrap"><table className="tbl"><colgroup><col style={{ width: '22%' }} /><col style={{ width: '9%' }} /><col style={{ width: '27%' }} /><col style={{ width: '10%' }} /><col style={{ width: '8%' }} /><col style={{ width: '10%' }} /><col style={{ width: '84px' }} /><col style={{ width: '72px' }} /></colgroup>
        <thead><tr><th>모델</th><th>공급자</th><th>사용 단가 (1M 토큰당)</th><th>최대 컨텍스트</th><th>최대 출력</th><th>사용 중인 평가 계획</th><th className="c">기본 모델</th><th className="c">사용</th></tr></thead><tbody>{rows}</tbody></table></div>
      <div className="mt12">{notice('모델 사용을 끄면 그 모델을 쓰는 평가 계획은 조직 기본 모델로 바뀝니다(다음 실행부터). 이미 끝난 실행 결과에는 영향이 없습니다. 단가는 요청 시각 기준으로 적용되며, 공급자의 가격 변경·기간 할인이 있으면 해당 기간의 사용분에 그대로 반영됩니다.', '')}</div>
    </>
  );
  return { crumbs: ['AI 모델'], body };
}
ACT.omToggle = (d) => omToggle(d.v);
export function omToggle(name: string) {
  const set = orgModelSet(); const m = modelByName(name)!; const on = set.on.includes(name);
  if (!on) { set.on.push(name); addAudit(CUR_ORG, 'MODEL', '조직 모델 사용 설정', name, [['사용', '아니오', '예']]); render(); toast(`${josa(name, '을/를')} 사용하도록 설정했습니다.`); return; }
  if (set.def === name) { toast('조직 기본 모델은 끌 수 없습니다. 먼저 다른 모델을 기본 모델로 지정하세요.', 'warning'); return; }
  if (set.on.filter((n) => modelByName(n)?.active).length <= 1) { toast('사용 모델은 최소 1개 유지해야 합니다.', 'warning'); return; }
  const plans = set.plans[name] || 0;
  const doOff = () => { set.on = set.on.filter((n) => n !== name); if (plans) { set.plans[set.def] = (set.plans[set.def] || 0) + plans; delete set.plans[name]; } addAudit(CUR_ORG, 'MODEL', '조직 모델 사용 설정', name, [['사용', '예', '아니오'], ...(plans ? [['평가 계획 전환', '-', `${plans}건 → ${set.def}`] as Change] : [])]); render(); toast(`${josa(name, '을/를')} 사용하지 않도록 설정했습니다.${plans ? ` 평가 계획 ${plans}건을 ${josa(set.def, '으로/로')} 바꿨습니다.` : ''}`); };
  if (!plans) { doOff(); return; }
  confirmModal({ title: `${josa(m.label || name, '을/를')} 사용하지 않을까요?`, icon: 'alert', danger: true, body: <p>이 모델을 쓰는 <b>{`평가 계획 ${plans}건`}</b>이 조직 기본 모델 <b>{set.def}</b>로 바뀝니다. 다음 실행부터 적용되며 이미 끝난 실행 결과에는 영향이 없습니다.</p>, confirmLabel: '사용 안 함', onConfirm: doOff });
}
ACT.omDefault = (d) => {
  const set = orgModelSet(); if (set.def === d.v) return; const before = set.def;
  confirmModal({ title: `조직 기본 모델을 ${josa(d.v, '으로/로')} 바꿀까요?`, icon: 'star', body: <p>새로 만드는 평가 계획에 <b>{d.v}</b>가 자동으로 지정됩니다. 기존 평가 계획의 모델은 바뀌지 않습니다.</p>, confirmLabel: '변경', onConfirm: () => { set.def = d.v; addAudit(CUR_ORG, 'MODEL', '조직 기본 모델 변경', d.v, [['조직 기본 모델', before, d.v]]); render(); toast(`조직 기본 모델을 ${josa(d.v, '으로/로')} 바꿨습니다.`); } });
};
