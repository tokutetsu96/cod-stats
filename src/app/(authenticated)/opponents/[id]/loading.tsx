export default function Loading() {
  return (
    <main className="mx-auto max-w-4xl p-4 space-y-6">
      <div className="h-8 w-48 bg-muted animate-pulse rounded" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="h-24 bg-muted animate-pulse rounded-xl" />
        <div className="h-24 bg-muted animate-pulse rounded-xl" />
        <div className="h-24 bg-muted animate-pulse rounded-xl" />
        <div className="h-24 bg-muted animate-pulse rounded-xl" />
      </div>
      <div className="h-48 bg-muted animate-pulse rounded-xl" />
      <div className="h-64 bg-muted animate-pulse rounded-xl" />
    </main>
  );
}
