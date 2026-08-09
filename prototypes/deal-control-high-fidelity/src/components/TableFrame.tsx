import type { PropsWithChildren, ReactNode } from 'react';

interface TableFrameProps extends PropsWithChildren {
  label: string;
  toolbar?: ReactNode;
  dataOdId: string;
}

export function TableFrame({ label, toolbar, dataOdId, children }: TableFrameProps) {
  return (
    <section className="table-section" aria-label={label} data-od-id={dataOdId}>
      {toolbar ? <div className="table-toolbar">{toolbar}</div> : null}
      <div className="table-scroll" role="region" aria-label={`${label}; horizontally scrollable`} tabIndex={0}>
        {children}
      </div>
    </section>
  );
}
