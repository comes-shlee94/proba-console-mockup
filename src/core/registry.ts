/* ==========================================================
   Core: 동작 레지스트리 (원본의 ACT · IN · CH)
   - ACT: 클릭 동작        (원본 data-act)    → JSX에서 onClick={act('이름', { 데이터 })}
   - IN : 입력 동작        (원본 data-in)     → <Input onValue={inp('이름')} /> · <Textarea onValue={inp('이름')} />
   - CH : 선택 변경 동작   (원본 data-ch)     → <Select onChange={ch('이름')} /> · sel(..., { onChange: ch('이름') })
   원본에서 핸들러가 받던 dataset(data-*)은 두 번째 인자로 넘기는 데이터 객체(문자열 값)로 대신합니다.
   이 모듈은 다른 모듈을 import하지 않습니다(모듈 평가 순서와 무관하게 먼저 준비되도록).
   ========================================================== */

/** 원본 dataset과 같은 문자열 데이터 */
export type Data = Record<string, string>;
export type ActFn = (d: Data, el?: HTMLElement, e?: Event) => void;
export type InFn = (v: string, el?: HTMLInputElement | HTMLTextAreaElement, e?: Event, d?: Data) => void;
export type ChFn = (v: string, el?: HTMLSelectElement | HTMLInputElement, e?: Event, d?: Data) => void;

export const ACT: Record<string, ActFn> = {};
export const IN: Record<string, InFn> = {};
export const CH: Record<string, ChFn> = {};
