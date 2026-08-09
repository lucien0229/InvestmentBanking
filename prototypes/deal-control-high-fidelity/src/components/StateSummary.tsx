import { StatusBadge } from './StatusBadge';
import type { StatusTone } from '../types/domain';

interface StateItem {
  group: string;
  label: string;
  value: string;
  tone: StatusTone;
  note: string;
}

interface StateSummaryProps {
  items: StateItem[];
  dataOdId: string;
}

export function StateSummary({ items, dataOdId }: StateSummaryProps) {
  return (
    <section className="state-summary" aria-labelledby={`${dataOdId}-title`} data-od-id={dataOdId}>
      <div className="section-heading-row">
        <div>
          <p className="eyebrow">Independent states</p>
          <h2 id={`${dataOdId}-title`}>Current control posture</h2>
        </div>
        <p className="section-note">No aggregate score is produced, and “passed” never implies external-use authorization.</p>
      </div>
      <div className="state-grid">
        {items.map((item) => (
          <article className="state-cell" key={`${item.group}-${item.label}`}>
            <span className="state-group">{item.group}</span>
            <div className="state-cell-title">
              <strong>{item.label}</strong>
              <StatusBadge tone={item.tone}>{item.value}</StatusBadge>
            </div>
            <p>{item.note}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
