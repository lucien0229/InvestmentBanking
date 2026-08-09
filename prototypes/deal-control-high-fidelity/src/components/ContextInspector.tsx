import { ExternalLink, X } from 'lucide-react';
import { Link } from '../router';
import { useInspector } from '../hooks/useInspector';

export function ContextInspector() {
  const { record, closeInspector } = useInspector();
  if (!record) return null;

  return (
    <aside className="context-inspector" aria-labelledby="context-inspector-title" data-od-id="context-inspector">
      <div className="inspector-header">
        <div>
          <p className="eyebrow">{record.eyebrow}</p>
          <h2 id="context-inspector-title" tabIndex={-1}>{record.title}</h2>
        </div>
        <button className="icon-button" type="button" onClick={closeInspector} aria-label="Close context inspector" data-od-id="close-inspector">
          <X aria-hidden="true" size={18} />
        </button>
      </div>
      <p className="inspector-description">{record.description}</p>
      <dl className="metadata-list">
        {record.metadata.map((item) => (
          <div key={item.label}>
            <dt>{item.label}</dt>
            <dd>{item.value}</dd>
          </div>
        ))}
      </dl>
      {record.href ? (
        <Link className="text-link inspector-link" to={record.href} onClick={closeInspector} data-od-id="inspector-open-record">
          {record.linkLabel ?? 'Open full record'}
          <ExternalLink aria-hidden="true" size={15} />
        </Link>
      ) : null}
      <p className="inspector-boundary">The inspector is preview-only. Material decisions, stage changes, lifecycle actions, and deletion must be completed on the full control page.</p>
    </aside>
  );
}
