export default function Loading() {
  return (
    <main className="mx-auto max-w-6xl p-4 space-y-6">
      <div className="space-y-2">
        <div className="h-8 w-64 bg-muted animate-pulse rounded" />
        <div className="h-4 w-48 bg-muted animate-pulse rounded" />
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-64 bg-muted animate-pulse rounded-xl" />
      ))}
    </main>
  );
}
