export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

export function DeckCardSkeleton() {
  return (
    <article className="deck-card skeleton-container">
      <div className="deck-card-head">
        <Skeleton className="w-12 h-12 rounded-full" />
        <div className="flex-1">
          <Skeleton className="h-5 w-48 mb-2" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <div className="deck-card-body">
        <Skeleton className="h-8 w-20 mb-2" />
        <Skeleton className="h-4 w-full mb-1" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </article>
  );
}

export function LibraryItemSkeleton() {
  return (
    <article className="source-card skeleton-container">
      <Skeleton className="w-16 h-20 rounded" />
      <div className="flex-1">
        <Skeleton className="h-5 w-3/4 mb-2" />
        <Skeleton className="h-4 w-1/2 mb-1" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </article>
  );
}

export function ProgressBarSkeleton() {
  return (
    <div className="skeleton-container">
      <Skeleton className="h-6 w-32 mb-3" />
      <Skeleton className="h-4 w-full rounded-full" />
    </div>
  );
}
