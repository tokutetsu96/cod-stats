import { Suspense } from "react";
import { PlayerDetailContent } from "./_components/player-detail-content";
import { PlayerDetailSkeleton } from "./_components/player-detail-skeleton";

export default async function PlayerStatsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { id } = await params;
  const { page } = await searchParams;
  const pageNum = Math.max(1, parseInt(page ?? "1") || 1);

  return (
    <main className="mx-auto max-w-6xl p-4 space-y-6">
      <Suspense key={pageNum} fallback={<PlayerDetailSkeleton />}>
        <PlayerDetailContent id={id} page={pageNum} />
      </Suspense>
    </main>
  );
}
