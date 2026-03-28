export default function Loading() {
  return (
    <main className="mx-auto max-w-6xl p-4 space-y-6">
      <div className="h-8 w-36 bg-muted animate-pulse rounded" />
      <div className="h-64 bg-muted animate-pulse rounded-xl" />
      <div className="h-48 bg-muted animate-pulse rounded-xl" />
    </main>
  );
}
