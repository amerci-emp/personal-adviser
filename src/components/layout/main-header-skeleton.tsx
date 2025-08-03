export function MainHeaderSkeleton() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
      <div className="container mx-auto flex h-24 items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 bg-slate-200 rounded-lg animate-pulse" />
          <div className="h-6 w-16 bg-slate-200 rounded animate-pulse" />
        </div>
        <div className="flex items-center gap-4">
          <div className="h-16 w-48 bg-slate-200 rounded-full animate-pulse" />
        </div>
      </div>
    </header>
  );
}
