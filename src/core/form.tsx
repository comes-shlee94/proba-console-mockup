/* ==========================================================
   Core: 입력 요소
   원본은 다시 그릴 때 입력 요소를 새로 만들지 않고 값만 맞췄습니다(DOM 패치).
   - 텍스트 입력·textarea: 상태 값과 다르면 값을 바꾸되, 포커스된 칸에서 한글 조합 중이면 건드리지 않음(커서 위치 유지)
   - 라디오·체크박스: 다시 그릴 때마다 checked를 상태 값으로 맞춤
   - select: 다시 그릴 때마다 selected 옵션(없으면 첫 옵션)으로 맞춤
   상태를 갱신하지 않는 입력 핸들러도 있어(예: 메모 입력) React의 제어 컴포넌트 대신 같은 규칙을 직접 적용합니다.
   ========================================================== */
import { useLayoutEffect, useRef, type InputHTMLAttributes, type ReactNode, type RefObject, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { isComposing, setComposing } from './events';

type InHandler = (v: string, el: HTMLInputElement | HTMLTextAreaElement, e: Event) => void;

/** HTML autofocus 속성을 그대로 둠 (React의 autoFocus처럼 마운트 때마다 포커스하지 않음 — 오버레이를 열 때 openOverlay가 포커스) */
function useAutofocusAttr(ref: RefObject<HTMLElement | null>, autoFocus: boolean | undefined) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (autoFocus) el.setAttribute('autofocus', ''); else el.removeAttribute('autofocus');
  });
}

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'defaultValue' | 'onInput' | 'onChange' | 'autoFocus' | 'checked' | 'defaultChecked'> {
  /** 원본 템플릿의 value 속성 값 (없으면 빈 값으로 맞춤) */
  value?: string | number | null;
  /** 입력 동작 (원본 data-in) */
  onValue?: InHandler;
  /** Enter 키 동작 (원본 data-enter) */
  onEnter?: (el: HTMLInputElement, e: KeyboardEvent) => void;
  /** 브라우저 change 이벤트 동작 (원본 input 요소의 data-ch — 예: 날짜 입력). React onChange(입력할 때마다)와 다름 */
  onCommit?: (v: string, el: HTMLInputElement, e: Event) => void;
  autoFocus?: boolean;
}
export function Input({ value, onValue, onEnter, onCommit, autoFocus, onKeyDown, ...rest }: InputProps) {
  const ref = useRef<HTMLInputElement>(null);
  const commitRef = useRef(onCommit);
  commitRef.current = onCommit;
  useLayoutEffect(() => {
    const el = ref.current!;
    const h = (e: Event) => { commitRef.current?.(el.value, el, e); };
    el.addEventListener('change', h);
    return () => el.removeEventListener('change', h);
  }, []);
  const v = value == null ? '' : String(value);
  useLayoutEffect(() => {
    const a = ref.current!;
    const active = a === document.activeElement;
    if (a.value !== v && !(active && isComposing())) {
      const s0 = a.selectionStart; const e0 = a.selectionEnd;
      a.value = v;
      if (active && s0 != null) { try { a.setSelectionRange(Math.min(s0, v.length), Math.min(e0 ?? s0, v.length)); } catch (err) { /* date 등 */ } }
    }
  });
  useAutofocusAttr(ref, autoFocus);
  return (
    <input
      ref={ref}
      {...rest}
      defaultValue={value == null ? undefined : String(value)}
      onInput={(e) => { if ((e.nativeEvent as InputEvent).isComposing || isComposing()) return; onValue?.(e.currentTarget.value, e.currentTarget, e.nativeEvent); }}
      onCompositionEnd={(e) => { setComposing(false); onValue?.(e.currentTarget.value, e.currentTarget, e.nativeEvent); }}
      onKeyDown={(e) => { onKeyDown?.(e); if (e.key === 'Enter' && onEnter) onEnter(e.currentTarget, e.nativeEvent); }}
    />
  );
}

export interface TextareaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'defaultValue' | 'onInput' | 'onChange' | 'autoFocus' | 'children'> {
  /** 원본 템플릿의 textarea 내용 */
  value?: string | null;
  onValue?: InHandler;
  autoFocus?: boolean;
}
/** 원본은 `<textarea>내용</textarea>` 문자열을 HTML 파서로 해석: 줄바꿈(CR LF · CR)은 LF로 바뀌고 맨 앞 LF 하나는 버려짐 */
const parsedTextareaContent = (s: string) => s.replace(/\r\n?/g, '\n').replace(/^\n/, '');
export function Textarea({ value, onValue, autoFocus, ...rest }: TextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const v = parsedTextareaContent(value == null ? '' : String(value));
  // 원본 패치는 textarea를 만든 뒤 내용(자식 텍스트)은 그대로 두고 value만 맞췄음 → 처음 값만 내용으로 사용
  const initial = useRef(v);
  useLayoutEffect(() => {
    const a = ref.current!;
    const active = a === document.activeElement;
    if (a.value !== v && !(active && isComposing())) a.value = v;
  });
  useAutofocusAttr(ref, autoFocus);
  return (
    <textarea
      ref={ref}
      {...rest}
      defaultValue={initial.current}
      onInput={(e) => { if ((e.nativeEvent as InputEvent).isComposing || isComposing()) return; onValue?.(e.currentTarget.value, e.currentTarget, e.nativeEvent); }}
      onCompositionEnd={(e) => { setComposing(false); onValue?.(e.currentTarget.value, e.currentTarget, e.nativeEvent); }}
    />
  );
}

export interface CheckProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'checked' | 'defaultChecked' | 'value' | 'defaultValue'> {
  /** 원본 템플릿의 checked 속성 유무 */
  checked?: boolean;
}
/** 라디오·체크박스 (type="radio" | "checkbox") */
export function Check({ checked, ...rest }: CheckProps) {
  const ref = useRef<HTMLInputElement>(null);
  useLayoutEffect(() => { ref.current!.checked = !!checked; });
  return <input ref={ref} {...rest} defaultChecked={!!checked} />;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'value' | 'defaultValue' | 'onChange'> {
  /** 원본 템플릿에서 selected로 표시된 옵션의 value (일치하는 옵션이 없으면 첫 옵션) */
  value?: string | number | null;
  /** 선택 변경 동작 (원본 data-ch) */
  onChange?: (v: string, el: HTMLSelectElement, e: Event) => void;
  children?: ReactNode;
}
export function Select({ value, onChange, children, ...rest }: SelectProps) {
  const ref = useRef<HTMLSelectElement>(null);
  const mounted = useRef(false);
  useLayoutEffect(() => {
    const a = ref.current!;
    const opts = Array.from(a.querySelectorAll('option'));
    const want = value == null ? null : String(value);
    const hit = want != null ? opts.find((o) => o.getAttribute('value') === want) : undefined;
    // 처음 그릴 때: selected 옵션이 없으면 브라우저 기본 선택 그대로 / 다시 그릴 때: selected 옵션, 없으면 첫 옵션
    const opt = hit || (mounted.current ? opts[0] : undefined);
    mounted.current = true;
    const selVal = opt ? opt.getAttribute('value') : null;
    if (selVal != null && a.value !== selVal) a.value = selVal;
  });
  return (
    <select ref={ref} {...rest} onChange={(e) => onChange?.(e.currentTarget.value, e.currentTarget, e.nativeEvent)}>
      {children}
    </select>
  );
}
