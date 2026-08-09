import { SearchX } from 'lucide-react';

interface SearchEmptyStateProps {
  query: string;
  onClear: () => void;
  dataOdId: string;
}

export function SearchEmptyState({ query, onClear, dataOdId }: SearchEmptyStateProps) {
  return (
    <div className="empty-state" role="status" data-od-id={dataOdId}>
      <SearchX className="empty-state-icon" aria-hidden="true" size={26} />
      <h2>No matching results</h2>
      <p>No current records match “{query}.” Check the search term or clear the search to view the full list.</p>
      <button className="button button-secondary" type="button" onClick={onClear}>Clear search</button>
    </div>
  );
}
