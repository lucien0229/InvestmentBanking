import { CircleAlert } from 'lucide-react';
import { Link } from '../router';
import { PageHeader } from '../components/PageHeader';
import { dealBasePath } from '../data/demoData';

interface NotFoundScreenProps {
  scope?: 'workspace' | 'public';
}

export function NotFoundScreen({ scope = 'workspace' }: NotFoundScreenProps) {
  const isPublic = scope === 'public';

  return (
    <div className="screen" data-od-id="not-found-screen">
      <PageHeader
        eyebrow="Route unavailable"
        title={isPublic ? 'This product page does not exist' : 'This workspace page does not exist'}
        description={isPublic ? 'The current address does not map to a published Deal Control page.' : 'The current address does not map to a stable Project Northstar work area. Deal state and recorded controls remain unchanged.'}
        dataOdId="not-found-heading"
      />
      <section className="material-blocker not-found-state" aria-labelledby="not-found-title" data-od-id="not-found-error-state">
        <CircleAlert aria-hidden="true" size={24} />
        <div>
          <h2 id="not-found-title">{isPublic ? 'Return to the product overview' : 'Return to the authoritative work context'}</h2>
          <p>{isPublic ? 'Review the controlled auction workflow from the product overview, or use the primary navigation to open a published page.' : 'Re-enter the next controlled action from Overview, or use the work-area navigation to open the exact object collection.'}</p>
        </div>
        <Link className="button button-primary" to={isPublic ? '/' : `${dealBasePath}/overview`}>{isPublic ? 'Return to Product Overview' : 'Return to Deal Overview'}</Link>
      </section>
    </div>
  );
}
