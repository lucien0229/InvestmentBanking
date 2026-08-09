import { useRef } from 'react';
import type { KeyboardEvent } from 'react';

interface DetailTabsProps {
  tabs: readonly string[];
  activeTab: string;
  onChange: (tab: string) => void;
  label: string;
  idPrefix: string;
  panelId: string;
  dataOdId: string;
}

export function DetailTabs({ tabs, activeTab, onChange, label, idPrefix, panelId, dataOdId }: DetailTabsProps) {
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  function selectTab(index: number) {
    const nextIndex = (index + tabs.length) % tabs.length;
    onChange(tabs[nextIndex]);
    tabRefs.current[nextIndex]?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const nextIndex = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? tabs.length - 1
        : index + (event.key === 'ArrowRight' ? 1 : -1);
    selectTab(nextIndex);
  }

  return (
    <div className="pane-tabs" role="tablist" aria-label={label} data-od-id={dataOdId}>
      {tabs.map((item, index) => {
        const selected = activeTab === item;
        return (
          <button
            key={item}
            ref={(node) => { tabRefs.current[index] = node; }}
            id={`${idPrefix}-tab-${index + 1}`}
            className={selected ? 'active' : ''}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={panelId}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(item)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            data-od-id={`${idPrefix}-tab-${index + 1}`}
          >
            {item}
          </button>
        );
      })}
    </div>
  );
}
