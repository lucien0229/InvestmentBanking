"use client";
import { useId, useRef, type ReactNode } from "react";

export function WorkspaceTabs<T extends string>({ label, tabs, value, onChange, children }: { label: string; tabs: readonly T[]; value: T; onChange: (value: T) => void; children: ReactNode }) {
  const id = useId(); const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const selected = tabs.indexOf(value);
  return <><div className="dc-tab-list" role="tablist" aria-label={label}>{tabs.map((name, index) => <button type="button" key={name} ref={(node) => { buttons.current[index] = node; }} id={`${id}-tab-${index}`} role="tab" aria-selected={value === name} aria-controls={`${id}-panel-${index}`} tabIndex={value === name ? 0 : -1} className={value === name ? "is-active" : ""} onClick={() => onChange(name)} onKeyDown={(event) => {
    const target = event.key === "ArrowRight" ? (index + 1) % tabs.length : event.key === "ArrowLeft" ? (index + tabs.length - 1) % tabs.length : event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : null;
    if (target === null) return; event.preventDefault(); onChange(tabs[target]); buttons.current[target]?.focus();
  }}>{name}</button>)}</div>{tabs.map((name, index) => <div key={name} id={`${id}-panel-${index}`} role="tabpanel" aria-labelledby={`${id}-tab-${index}`} hidden={index !== selected} tabIndex={0}>{index === selected ? children : null}</div>)}</>;
}
