export default function Loading() {
  return (
    <main className="mx-auto max-w-6xl p-4 space-y-6">
      <div className="h-8 w-56 bg-muted animate-pulse rounded" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />
        ))}
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-36 bg-muted animate-pulse rounded-xl" />
      ))}
    </main>
  );
}
